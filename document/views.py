from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Document
from .serializers import DocumentSerializer, DocumentListSerializer
from .schemas import DocumentCreateResponseSerializer


@extend_schema_view(
    list=extend_schema(
        tags=['Documents'],
        summary='List documents',
        description='Returns all documents owned by the authenticated user.',
        responses={200: DocumentListSerializer(many=True)},
    ),
    retrieve=extend_schema(
        tags=['Documents'],
        summary='Retrieve a document',
        parameters=[
            OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.'),
        ],
        responses={200: DocumentSerializer},
    ),
    update=extend_schema(
        tags=['Documents'],
        summary='Replace a document',
        parameters=[
            OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.'),
        ],
        request=DocumentSerializer,
        responses={200: DocumentSerializer},
    ),
    partial_update=extend_schema(
        tags=['Documents'],
        summary='Partially update a document',
        parameters=[
            OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.'),
        ],
        request=DocumentSerializer,
        responses={200: DocumentSerializer},
    ),
    destroy=extend_schema(
        tags=['Documents'],
        summary='Delete a document',
        parameters=[
            OpenApiParameter('id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Document ID.'),
        ],
        responses={204: None},
    ),
)
class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentListSerializer
        return DocumentSerializer

    def get_queryset(self):
        return (
            Document.objects
            .filter(owner=self.request.user).select_related("owner")
            .order_by("-updated_at")
        )

    @extend_schema(
        tags=['Documents'],
        summary='Create a document',
        description=(
            'Creates a new document. If the user already has an empty '
            '"Untitled Document", that document is reused instead.'
        ),
        request=DocumentSerializer,
        responses={
            200: DocumentCreateResponseSerializer,
            201: DocumentCreateResponseSerializer,
        },
    )
    def create(self, request, *args, **kwargs):
        # Logic to avoid "Untitled Document" clutter:
        # If the user already has a document with the default title and empty content, reuse it.
        existing_empty_doc = (
            Document.objects.filter(
                owner=self.request.user,
                title="Untitled Document",
                content={}
            ).first()
        )

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
