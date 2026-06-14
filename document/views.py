from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Document
from .serializers import DocumentSerializer, DocumentListSerializer


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
                "id": existing_empty_doc.id,
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