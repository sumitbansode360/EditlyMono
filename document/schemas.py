from rest_framework import serializers

from .serializers import DocumentSerializer


class DocumentCreateResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    id = serializers.UUIDField()
    data = DocumentSerializer()
