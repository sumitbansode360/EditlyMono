from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth import get_user_model
from unittest.mock import patch
from userauth.utils import account_activation_token, password_reset_token

User = get_user_model()

class UserAuthTests(APITestCase):

    def setUp(self):
        self.register_url = reverse('register')
        self.resend_activation_url = reverse('resend-activation-email')
        self.forgot_password_url = reverse('forgot-password')
        
        self.valid_user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "SecurePassword123!",
            "first_name": "John",
            "last_name": "Doe"
        }

    @patch('userauth.views.send_email_task.delay')
    def test_register_user_success(self, mock_send_email):
        """Test successful registration and email task trigger."""
        response = self.client.post(self.register_url, self.valid_user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        
        user = User.objects.get(email=self.valid_user_data['email'])
        self.assertFalse(user.is_active)
        mock_send_email.assert_called_once()

    def test_register_user_invalid_data(self):
        """Test registration fails with missing or invalid data."""
        response = self.client.post(self.register_url, {"email": "invalid-email"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_account_success(self):
        """Test successful account activation using the UID and token."""
        user = User.objects.create_user(**self.valid_user_data, is_active=False)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        
        url = reverse('activate', kwargs={'uidb64': uid, 'token': token})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_activate_account_invalid_token(self):
        """Test activation fails with an invalid token."""
        user = User.objects.create_user(**self.valid_user_data, is_active=False)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        url = reverse('activate', kwargs={'uidb64': uid, 'token': 'wrong-token'})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_activate_account_invalid_uid(self):
        """Test activation fails with a malformed UID."""
        url = reverse('activate', kwargs={'uidb64': 'not-a-valid-uid', 'token': 'token'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('userauth.views.send_email_task.delay')
    def test_resend_activation_email_success(self, mock_send_email):
        """Test resending activation email for an inactive user."""
        user = User.objects.create_user(**self.valid_user_data, is_active=False)
        response = self.client.post(self.resend_activation_url, {"email": user.email})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_send_email.assert_called_once()

    @patch('userauth.views.send_email_task.delay')
    def test_resend_activation_email_not_sent_for_active_user(self, mock_send_email):
        """Test that activation email is NOT sent if user is already active."""
        user = User.objects.create_user(**self.valid_user_data, is_active=True)
        response = self.client.post(self.resend_activation_url, {"email": user.email})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_send_email.assert_not_called()

    @patch('userauth.views.send_email_task.delay')
    def test_forgot_password_success(self, mock_send_email):
        """Test forgot password triggers email for active users."""
        user = User.objects.create_user(**self.valid_user_data, is_active=True)
        response = self.client.post(self.forgot_password_url, {"email": user.email})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_send_email.assert_called_once()

    @patch('userauth.views.send_email_task.delay')
    def test_forgot_password_generic_response_if_user_not_found(self, mock_send_email):
        """Test that forgot password returns 200 even if email doesn't exist for security."""
        response = self.client.post(self.forgot_password_url, {"email": "nonexistent@example.com"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_send_email.assert_not_called()

    def test_reset_password_success(self):
        """Test successful password reset with valid token and passwords."""
        user = User.objects.create_user(**self.valid_user_data, is_active=True)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = password_reset_token.make_token(user)
        
        url = reverse('reset-password', kwargs={'uidb64': uid, 'token': token})
        new_password = "NewSecurePassword456!"
        data = {
            "new_password": new_password,
            "confirm_password": new_password
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user.refresh_from_db()
        self.assertTrue(user.check_password(new_password))

    def test_reset_password_mismatch(self):
        """Test reset password fails if confirm_password does not match."""
        user = User.objects.create_user(**self.valid_user_data, is_active=True)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = password_reset_token.make_token(user)
        
        url = reverse('reset-password', kwargs={'uidb64': uid, 'token': token})
        data = {
            "new_password": "NewPassword1!",
            "confirm_password": "DifferentPassword2!"
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)

    def test_reset_password_inactive_user(self):
        """Test that inactive users cannot reset their password."""
        user = User.objects.create_user(**self.valid_user_data, is_active=False)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = password_reset_token.make_token(user)
        
        url = reverse('reset-password', kwargs={'uidb64': uid, 'token': token})
        data = {
            "new_password": "NewPassword1!",
            "confirm_password": "NewPassword1!"
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # The view specifically checks for user.is_active
        self.assertEqual(response.data['message'], "This password reset link is invalid or has expired. Please request a new one.")
