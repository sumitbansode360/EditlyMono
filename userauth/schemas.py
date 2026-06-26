from rest_framework import serializers


class MessageResponseSerializer(serializers.Serializer):
    message = serializers.CharField()


class EmailRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class LogoutRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(help_text="JWT refresh token to blacklist.")


class RegisterUserResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class RegisterResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    email = serializers.EmailField()
    user = RegisterUserResponseSerializer()


class PendingUserUpdateResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    user = RegisterUserResponseSerializer()
