from django.contrib.auth.tokens import PasswordResetTokenGenerator

account_activation_token = PasswordResetTokenGenerator()
password_reset_token = PasswordResetTokenGenerator()