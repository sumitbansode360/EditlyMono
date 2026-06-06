from rest_framework.response import Response
from rest_framework import status
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

from .serializers import RegisterSerializer, ResetPasswordSerializer
from .models import User
from .utils import account_activation_token, password_reset_token
from .tasks import send_email_task
from django.conf import settings

from rest_framework.views import APIView
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = account_activation_token.make_token(user)

            activation_link = f"{settings.FRONTEND_URL}/activate/{uid}/{token}"

            message = f"""
            Hello {user.first_name},

            Thank you for registering with Editly.

            To activate your account, please click the link below:

            {activation_link}

            If you did not create this account, please ignore this email.

            Regards,
            Editly Team
            """

            # send email 
            send_email_task.delay(
                user.email, 
                "Activate Your Editly Account", 
                message
            )

            return Response({
                "message": "Account created successfully. Please check your email to activate your account.",
                "email": user.email,
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ActivateAccountView(APIView):
    
    def get(self, request, uidb64, token):

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        
        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"message": "Account activated successfully. Redirecting you to the login page."}, status=status.HTTP_200_OK)
        
        return Response({"message": "This activation link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

class ResendActivationEmailView(APIView):

    def post(self, request):

        email = request.data.get('email')
        user = User.objects.filter(email=email, is_active=False).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = account_activation_token.make_token(user)
            activation_link = f"{settings.FRONTEND_URL}/activate/{uid}/{token}"

            message = f"""
            Hello {user.first_name},

            You recently requested a new account activation link.

            Please click the link below to activate your account:

            {activation_link}

            If you did not request this email, you can safely ignore it.

            Regards,
            Editly Team
            """

            # send email 
            send_email_task.delay(
                user.email, 
                "New Activation Link for Your Editly Account", 
                message
            )

        return Response({
            "message": (
                "If an account with that email exists, a password reset link has been sent."
            ),
        }, status=status.HTTP_201_CREATED)

class ForgotPasswordView(APIView):

    def post(self, request):
        email = request.data.get('email')

        user = User.objects.filter(
            email=email,
            is_active=True).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = password_reset_token.make_token(user)
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

            message = f"""Hello {user.first_name},

            We received a request to reset your password.

            Please click the link below to reset your password:

            {reset_link}

            If you did not request this email, you can safely ignore it.

            Regards,
            Editly Team
            """

            # send email 
            send_email_task.delay(
                user.email, 
                "Reset Your Password", 
                message
            )
        
        return Response({
            "message": 
            "If an account with that email exists, a password reset link has been sent."
            }, status=status.HTTP_200_OK)
    
class ResetPasswordView(APIView):

    serializer_class = ResetPasswordSerializer

    def post(self, request, uidb64, token):

        serializer = self.serializer_class(data=request.data)

        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist
        ):
            user = None

        if (
            user is not None
            and user.is_active
            and password_reset_token.check_token(user, token)
        ):
            user.set_password(
                serializer.validated_data["new_password"]
            )
            user.save()

            return Response(
                {"message": "Your password has been reset successfully. You can now log in with your new password."},
                status=status.HTTP_200_OK
            )

        return Response(
            {"message": "This password reset link is invalid or has expired. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST
        )