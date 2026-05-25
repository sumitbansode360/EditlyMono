from django.shortcuts import render
from rest_framework.response import Response
from rest_framework import status

from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

from django.core.mail import send_mail

from .serializers import RegisterSerializer
from .models import User
from .utils import account_activation_token

class RegisterView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = account_activation_token.make_token(user)

            activation_link = f""

            # send email 

            return Response({
                "message": (
                    "Account created successfully. "
                    "Please check your email to activate account."
                )
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)