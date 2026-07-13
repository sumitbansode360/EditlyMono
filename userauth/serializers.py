from rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class ProfilePictureUrlMixin:
    def _get_profile_pic_url(self, obj):
        if not obj.profile_pic:
            return None

        url = obj.profile_pic.url
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class CustomTokenObtainPairSerializer(ProfilePictureUrlMixin, TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["email"] = user.email
        token["first_name"] = user.first_name

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        data["user"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "profile_pic": self._get_profile_pic_url(self.user),
        }

        return data

class UserSerializer(ProfilePictureUrlMixin, serializers.ModelSerializer):
    profile_pic = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'profile_pic']
        read_only_fields = fields

    def get_profile_pic(self, obj):
        return self._get_profile_pic_url(obj)


class UpdateProfileSerializer(serializers.ModelSerializer):
    """
    Writable counterpart to UserSerializer, used only by UserMeView.patch().
    Email is deliberately excluded — it's tied to login/activation, changing
    it isn't supported yet. Every field is optional so a PATCH can update
    just the name, just the picture, or both.
    """

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'profile_pic']
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'profile_pic': {'required': False},
        }


class RegisterSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            is_active=False
        )
        
        return user

class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(max_length=128)
    confirm_password = serializers.CharField(max_length=128)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        return data

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)

        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Used by the authenticated "change my password" flow — distinct from
    ResetPasswordSerializer, which backs the logged-out email-link reset
    flow and has no concept of a "current password" to verify against.
    """
    current_password = serializers.CharField(max_length=128, write_only=True)
    new_password = serializers.CharField(max_length=128, write_only=True)
    confirm_password = serializers.CharField(max_length=128, write_only=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return data

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value


class PendingUserUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
