from django.urls import path
from .views import (
    RegisterView, ActivateAccountView, ResendActivationEmailView, 
    ForgotPasswordView, ResetPasswordView, UpdatePendingUserAPIView, 
    LogoutView, UserMeView
)

urlpatterns = [
    path('me/', UserMeView.as_view(), name='user-me'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path(
        'register/',
        RegisterView.as_view(), 
        name='register'
    ),
    path(
        'activate/<uidb64>/<token>/', ActivateAccountView.as_view(), name='activate'),
    path(
        'resend-activation-email/', 
        ResendActivationEmailView.as_view(),
        name='resend-activation-email'
    ),
    path(
        'forgot-password/', 
        ForgotPasswordView.as_view(), 
        name='forgot-password'
    ),
    path(
        'reset-password/<uidb64>/<token>/', 
        ResetPasswordView.as_view(), 
        name='reset-password'
    ),
    path(
        "update-pending-user/<uuid:user_id>/",
        UpdatePendingUserAPIView.as_view(),
        name="update-pending-user"
    ),
]