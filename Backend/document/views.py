from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import get_object_or_404
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import Document, DocumentCollaboration
from .serializers import (
    DocumentSerializer,
    DocumentListSerializer,
    DocumentSearchSerializer,
    CollaborationInviteSerializer,
    CollaborationSerializer,
)
from .schemas import DocumentCreateResponseSerializer
from .helpers import send_collaboration_invitation_email
from .paginators import DocumentPagination

User = get_user_model()


@extend_schema_view(
    list=extend_schema(
        tags=['Documents'],
        summary='List documents',
        description='Returns documents owned by the authenticated user, plus documents they are an active collaborator on. Supports pagination via ?page=1&page_size=18',
        parameters=[
            OpenApiParameter('page', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Page number (default: 1)'),
            OpenApiParameter('page_size', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Number of results per page (default: 18, max: 48)'),
        ],
        responses={200: DocumentListSerializer(many=True)},
    ),
    retrieve=extend_schema(
        tags=['Documents'],
        summary='Retrieve a document',
        parameters=[OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.')],
        responses={200: DocumentSerializer},
    ),
    update=extend_schema(
        tags=['Documents'],
        summary='Replace a document',
        parameters=[OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.')],
        request=DocumentSerializer,
        responses={200: DocumentSerializer},
    ),
    partial_update=extend_schema(
        tags=['Documents'],
        summary='Partially update a document',
        parameters=[OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.')],
        request=DocumentSerializer,
        responses={200: DocumentSerializer},
    ),
    destroy=extend_schema(
        tags=['Documents'],
        summary='Delete a document',
        parameters=[OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.')],
        responses={204: None},
    ),
)
class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = DocumentPagination

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentListSerializer
        return DocumentSerializer

    def get_queryset(self):
        user = self.request.user
        if self.action == "list":
            owned_docs = Document.objects.filter(owner=user).select_related("owner")
            # Only ACTIVE collaborations show up here — a pending invite
            # (no account yet, or account not activated yet) shouldn't
            # surface a document the person can't actually open.
            shared_docs = Document.objects.filter(
                collaborators__user=user,
                collaborators__status=DocumentCollaboration.Status.ACTIVE,
            ).select_related("owner")
            return owned_docs.union(shared_docs).order_by("-updated_at")
        return Document.objects.all().select_related("owner")

    def get_object(self):
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)

        if obj.owner != self.request.user:
            has_active_access = obj.collaborators.filter(
                user=self.request.user, status=DocumentCollaboration.Status.ACTIVE
            ).exists()
            if not has_active_access:
                self.permission_denied(self.request)

        self.check_object_permissions(self.request, obj)
        return obj

    @extend_schema(
        tags=['Documents'],
        summary='Create a document',
        description=(
            'Creates a new document. If the user already has an empty '
            '"Untitled Document", that document is reused instead.'
        ),
        request=DocumentSerializer,
        responses={200: DocumentCreateResponseSerializer, 201: DocumentCreateResponseSerializer},
    )
    def create(self, request, *args, **kwargs):
        existing_empty_doc = Document.objects.filter(
            owner=self.request.user, title="Untitled Document", content={}
        ).first()

        if existing_empty_doc:
            serializer = self.get_serializer(existing_empty_doc)
            return Response({
                "message": "Reusing existing empty document",
                "id": serializer.data["id"],
                "data": serializer.data,
            }, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "message": "Document created successfully",
                "id": serializer.data.get("id"),
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def has_edit_permission(self, document):
        if document.owner == self.request.user:
            return True
        return document.collaborators.filter(
            user=self.request.user,
            role=DocumentCollaboration.Role.EDITOR,
            status=DocumentCollaboration.Status.ACTIVE,
        ).exists()

    def update(self, request, *args, **kwargs):
        document = self.get_object()
        if not self.has_edit_permission(document):
            return Response(
                {"detail": "You don't have permission to edit this document."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        document = self.get_object()
        if not self.has_edit_permission(document):
            return Response(
                {"detail": "You don't have permission to edit this document."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        document = self.get_object()
        if document.owner != self.request.user:
            return Response(
                {"detail": "Only the document owner can delete this document."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        tags=['Documents'],
        summary='Search documents',
        description='Search documents by title or owner name. Returns top 5 matching documents accessible to the user.',
        parameters=[
            OpenApiParameter('q', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Search query (min 3 characters)', required=True),
        ],
        responses={200: DocumentSearchSerializer(many=True)},
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '').strip()
        
        if not query or len(query) < 3:
            return Response(
                {"detail": "Search query must be at least 3 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        # Search in title and owner name, limited to user's accessible documents
        owned_docs = Document.objects.filter(
            Q(title__icontains=query) |
            Q(owner__first_name__icontains=query) |
            Q(owner__last_name__icontains=query),
            owner=user
        ).select_related("owner")
        
        shared_docs = Document.objects.filter(
            Q(title__icontains=query) |
            Q(owner__first_name__icontains=query) |
            Q(owner__last_name__icontains=query),
            collaborators__user=user,
            collaborators__status=DocumentCollaboration.Status.ACTIVE
        ).select_related("owner")
        
        results = owned_docs.union(shared_docs)[:5]
        
        serializer = DocumentSearchSerializer(results, many=True, context={'request': request})
        return Response({"results": serializer.data})


@extend_schema_view(
    list=extend_schema(
        tags=['Collaboration'],
        summary='List collaborators',
        description='Lists collaborators (including still-pending invites) for documents you own. Filter with ?document_id=.',
        parameters=[OpenApiParameter('document_id', OpenApiTypes.UUID, OpenApiParameter.QUERY, required=False)],
        responses={200: CollaborationSerializer(many=True)},
    ),
    destroy=extend_schema(
        tags=['Collaboration'],
        summary='Remove a collaborator',
        parameters=[OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Collaboration ID.')],
        responses={204: None},
    ),
)
class DocumentCollaborationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    # Role changes go through invite() again (it's an idempotent upsert),
    # there's no separate PATCH/PUT concept for a collaboration row.
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        queryset = DocumentCollaboration.objects.filter(
            document__owner=self.request.user
        ).select_related("user", "document", "invited_by")

        document_id = self.request.query_params.get("document_id")
        if document_id:
            queryset = queryset.filter(document_id=document_id)
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return CollaborationInviteSerializer
        return CollaborationSerializer

    @extend_schema(
        tags=['Collaboration'],
        summary='Invite (or re-invite) a collaborator',
        description=(
            'Invites a user to collaborate on a document by email. Works whether or not '
            'the email belongs to a registered user yet. Calling this again for the same '
            'email on the same document resends the invitation (and updates the role if '
            'it changed) instead of failing.'
        ),
        request=CollaborationInviteSerializer,
        responses={201: CollaborationSerializer, 200: CollaborationSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data["document_id"]
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        document = get_object_or_404(Document, id=document_id, owner=request.user)

        if email == request.user.email.lower():
            return Response(
                {"detail": "You cannot invite yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        collaboration, created = self._upsert_invite(document, email, role, request.user)
        send_collaboration_invitation_email(collaboration)

        response_serializer = CollaborationSerializer(collaboration, context=self.get_serializer_context())
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @staticmethod
    def _upsert_invite(document, email, role, invited_by):
        """
        Three cases, one upsert each — see document/helpers.py for the
        matching email content per case:

          1. Active existing user      -> linked immediately, status ACTIVE.
          2. Registered-but-inactive    -> linked immediately, status stays
             user                          PENDING until they activate
                                            (see userauth _activate_pending_collaborations).
          3. No account at all          -> invited_email only, user is null,
                                            status PENDING until registration
                                            links it (see userauth
                                            _link_pending_document_invites).

        Calling this again for the same (document, email) pair updates the
        existing row (role, invited_by) instead of raising — that's what
        makes "resend invite" just work.
        """
        existing_user = User.objects.filter(email__iexact=email).first()

        if existing_user:
            return DocumentCollaboration.objects.update_or_create(
                document=document,
                user=existing_user,
                defaults={
                    "role": role,
                    "invited_by": invited_by,
                    "invited_email": None,
                    "status": (
                        DocumentCollaboration.Status.ACTIVE
                        if existing_user.is_active
                        else DocumentCollaboration.Status.PENDING
                    ),
                },
            )

        return DocumentCollaboration.objects.update_or_create(
            document=document,
            invited_email=email,
            user=None,
            defaults={
                "role": role,
                "invited_by": invited_by,
                "status": DocumentCollaboration.Status.PENDING,
            },
        )