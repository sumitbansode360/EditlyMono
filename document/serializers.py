from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Document, DocumentCollaboration
from django.contrib.auth import get_user_model

User = get_user_model()


class CollaborationSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = DocumentCollaboration
        fields = ["id", "document", "email", "name", "role", "status", "invited_at", "accepted_at"]
        read_only_fields = fields

    @extend_schema_field(serializers.EmailField())
    def get_email(self, obj):
        # obj.user may be null for an invite that hasn't been claimed yet —
        # invited_email is the identity in that case.
        return obj.user.email if obj.user_id else obj.invited_email

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_name(self, obj):
        if obj.user_id:
            return f"{obj.user.first_name} {obj.user.last_name}"
        return None


class CollaborationInviteSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=DocumentCollaboration.Role.choices)

    def validate_email(self, value):
        return value.strip().lower()


class DocumentSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    collaborators = CollaborationSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "content",
            "owner",
            "owner_name",
            "role",
            "collaborators",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "owner_name",
            "role",
            "collaborators",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}"

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_role(self, obj):
        request = self.context.get("request")
        if request is None:
            return None
        if request.user == obj.owner:
            return "owner"
        collab = obj.collaborators.filter(
            user=request.user, status=DocumentCollaboration.Status.ACTIVE
        ).first()
        return collab.role if collab else None


class DocumentListSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "owner",
            "owner_name",
            "role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}"

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_role(self, obj):
        request = self.context.get("request")
        if request is None:
            return None
        if request.user == obj.owner:
            return "owner"
        collab = obj.collaborators.filter(
            user=request.user, status=DocumentCollaboration.Status.ACTIVE
        ).first()
        return collab.role if collab else None


class DocumentSearchSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "owner_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}"