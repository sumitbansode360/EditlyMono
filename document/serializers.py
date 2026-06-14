from rest_framework import serializers
from .models import Document
from userauth.models import User


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "content",
            "owner",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "created_at",
            "updated_at",
        ]


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

    def get_owner_name(self, obj):
        user = User.objects.get(id=obj.owner.id)
        return f"{user.first_name} {user.last_name}"
    

        