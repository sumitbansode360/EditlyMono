from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    RegisterSerializer,
    ResetPasswordSerializer,
    CustomTokenObtainPairSerializer,
    PendingUserUpdateSerializer,
)
from .models import User
from .utils import account_activation_token, password_reset_token
from .helpers import (
    decode_uid_to_user,
    send_activation_email,
    send_reactivation_email,
    send_updated_account_activation_email,
    send_password_reset_email,
)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            send_activation_email(user)
            return Response(
                {
                    "message": "Account created successfully. Please check your email to activate your account.",
                    "email": user.email,
                    "user": {
                        "id": str(user.id),
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActivateAccountView(APIView):

    def get(self, request, uidb64, token):
        user = decode_uid_to_user(uidb64)

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.save()
            return Response(
                {"message": "Account activated successfully. Redirecting you to the login page."},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"message": "This activation link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResendActivationEmailView(APIView):

    def post(self, request):
        email = request.data.get("email")
        user = User.objects.filter(email=email, is_active=False).first()

        if user:
            if not user.can_receive_activation_email():
                return Response(
                    {"message": "You've reached the daily limit for activation emails. Please try again tomorrow."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            send_reactivation_email(user)

        return Response(
            {"message": "If an account with that email exists, a new activation link has been sent."},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):

    def post(self, request):
        email = request.data.get("email")
        user = User.objects.filter(email=email, is_active=True).first()

        if user:
            send_password_reset_email(user)

        return Response(
            {"message": "If an account with that email exists, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):

    serializer_class = ResetPasswordSerializer

    def post(self, request, uidb64, token):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = decode_uid_to_user(uidb64)

        if (
            user is not None
            and user.is_active
            and password_reset_token.check_token(user, token)
        ):
            user.set_password(serializer.validated_data["new_password"])
            user.save()
            return Response(
                {"message": "Your password has been reset successfully. You can now log in with your new password."},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"message": "This password reset link is invalid or has expired. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class UpdatePendingUserAPIView(APIView):

    def patch(self, request, user_id):
        serializer = PendingUserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(id=user_id, is_active=False)
        except User.DoesNotExist:
            return Response(
                {"message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        if not user.can_receive_activation_email():
            return Response(
                {"message": "You've reached the daily limit for activation emails. Please try again tomorrow."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user.email = serializer.validated_data["email"]
        user.username = serializer.validated_data["email"]
        user.first_name = serializer.validated_data["first_name"]
        user.last_name = serializer.validated_data["last_name"]
        user.set_password(serializer.validated_data["password"])
        user.save()

        send_updated_account_activation_email(user)

        return Response(
            {
                "message": "Information updated successfully. A new activation email has been sent.",
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_200_OK,
        )