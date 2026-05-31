from rest_framework.response import Response
from rest_framework import status
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

from .serializers import RegisterSerializer
from .models import User
from .utils import account_activation_token
from .tasks import send_email_task
from django.conf import settings

from rest_framework.views import APIView


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
                "message": (
                    "Account created successfully. "
                    "Please check your email to activate account."
                ),
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
            return Response({"message": "Account activated successfully. Redirecting to login page."}, status=status.HTTP_200_OK)
        
        return Response({"message": "Invalid activation link."}, status=status.HTTP_400_BAD_REQUEST)

class ResendActivationEmailView(APIView):

    def post(self, request):

        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        if user.is_active:
            return Response({"message": "Account is already activated."}, status=status.HTTP_400_BAD_REQUEST)
        
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
                "Activation email resent successfully"
            ),
        }, status=status.HTTP_201_CREATED)
