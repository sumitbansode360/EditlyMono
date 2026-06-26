from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Document
from django.contrib.auth import get_user_model

User = get_user_model()


class DocumentSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "content",
            "owner",
            "owner_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "owner_name",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}"


class DocumentListSerializer(serializers.ModelSerializer):
    
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "owner",
            "owner_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}"
    

        