from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .serializers import (
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
    PendingUserUpdateSerializer,
)
from .schemas import (
    EmailRequestSerializer,
    LogoutRequestSerializer,
    MessageResponseSerializer,
    PendingUserUpdateResponseSerializer,
    RegisterResponseSerializer,
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
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.permissions import IsAuthenticated


def _link_pending_document_invites(user):
    """
    Bridges the document-collaboration invite flow into registration.

    If this user's email matches any pending DocumentCollaboration rows
    that were created for a not-yet-registered invitee, attach this user
    to those rows now. Import is local to avoid a hard app-loading-order
    dependency between userauth and document.
    """
    from document.models import DocumentCollaboration

    DocumentCollaboration.objects.filter(
        invited_email__iexact=user.email, user__isnull=True
    ).update(user=user, invited_email=None)


def _activate_pending_collaborations(user):
    """
    Flips any of this user's pending collaborations to active once their
    account is activated, so invited documents appear on their dashboard
    only once they can actually log in and use them.
    """
    from django.utils import timezone
    from document.models import DocumentCollaboration

    DocumentCollaboration.objects.filter(
        user=user, status=DocumentCollaboration.Status.PENDING
    ).update(status=DocumentCollaboration.Status.ACTIVE, accepted_at=timezone.now())


@extend_schema(
    tags=['Authentication'],
    summary='Obtain JWT token pair',
    description='Authenticate with email and password to receive access and refresh tokens.',
)
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(
    tags=['Authentication'],
    summary='Refresh JWT access token',
    description='Exchange a valid refresh token for a new access token.',
)
class TokenRefreshAPIView(TokenRefreshView):
    pass


@extend_schema(
    tags=['Users'],
    summary='Get current user profile',
    description='Returns the authenticated user profile.',
    responses={200: UserSerializer},
)
class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


@extend_schema(
    tags=['Authentication'],
    summary='Logout and blacklist refresh token',
    request=LogoutRequestSerializer,
    responses={
        205: OpenApiResponse(description='Token blacklisted successfully.'),
        400: MessageResponseSerializer,
    },
)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(
                    {"detail": "Refresh token is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except TokenError:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    tags=['Users'],
    summary='Register a new account',
    description='Creates an inactive account and sends an activation email.',
    request=RegisterSerializer,
    responses={
        201: RegisterResponseSerializer,
        400: OpenApiResponse(description='Validation errors.'),
    },
)
class RegisterView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            _link_pending_document_invites(user)
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


@extend_schema(
    tags=['Users'],
    summary='Activate account',
    description='Activates a user account using the link sent by email.',
    parameters=[
        OpenApiParameter('uidb64', OpenApiTypes.STR, OpenApiParameter.PATH, description='Base64-encoded user ID.'),
        OpenApiParameter('token', OpenApiTypes.STR, OpenApiParameter.PATH, description='Account activation token.'),
    ],
    responses={
        200: MessageResponseSerializer,
        400: MessageResponseSerializer,
    },
)
class ActivateAccountView(APIView):

    def get(self, request, uidb64, token):
        user = decode_uid_to_user(uidb64)

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.save()
            _activate_pending_collaborations(user)
            return Response(
                {"message": "Account activated successfully. Redirecting you to the login page."},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"message": "This activation link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@extend_schema(
    tags=['Users'],
    summary='Resend activation email',
    description='Sends a new activation link for an inactive account.',
    request=EmailRequestSerializer,
    responses={
        200: MessageResponseSerializer,
        429: MessageResponseSerializer,
    },
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


@extend_schema(
    tags=['Users'],
    summary='Request password reset',
    description='Sends a password reset link to the email address if an active account exists.',
    request=EmailRequestSerializer,
    responses={200: MessageResponseSerializer},
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


@extend_schema(
    tags=['Users'],
    summary='Reset password',
    description='Sets a new password using the reset link sent by email.',
    parameters=[
        OpenApiParameter('uidb64', OpenApiTypes.STR, OpenApiParameter.PATH, description='Base64-encoded user ID.'),
        OpenApiParameter('token', OpenApiTypes.STR, OpenApiParameter.PATH, description='Password reset token.'),
    ],
    request=ResetPasswordSerializer,
    responses={
        200: MessageResponseSerializer,
        400: MessageResponseSerializer,
    },
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


@extend_schema(
    tags=['Users'],
    summary='Update pending user before activation',
    description='Updates profile details for an inactive account and resends the activation email.',
    parameters=[
        OpenApiParameter('user_id', OpenApiTypes.UUID, OpenApiParameter.PATH, description='Pending user ID.'),
    ],
    request=PendingUserUpdateSerializer,
    responses={
        200: PendingUserUpdateResponseSerializer,
        404: MessageResponseSerializer,
        429: MessageResponseSerializer,
    },
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


@extend_schema(
    tags=['Users'],
    summary='Search users by email',
    description='Search for registered users by email address (partial match).',
    parameters=[
        OpenApiParameter('email', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Email to search'),
    ],
    responses={200: UserSerializer(many=True)},
)
class UserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = request.query_params.get('email', '')
        users = User.objects.filter(
            email__icontains=email,
            is_active=True
        ).exclude(id=request.user.id)[:10]
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)