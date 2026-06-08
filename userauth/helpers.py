from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings

from .models import User
from .utils import account_activation_token
from .tasks import send_email_task


def generate_uid_and_token(user) -> tuple[str, str]:
    """Encode user PK into uidb64 and generate a token."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = account_activation_token.make_token(user)
    return uid, token


def build_activation_link(uid: str, token: str) -> str:
    return f"{settings.FRONTEND_URL}/activate/{uid}/{token}"


def build_reset_link(uid: str, token: str) -> str:
    return f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"


def send_activation_email(user) -> None:
    """Generate a fresh activation link and dispatch the activation email."""
    uid, token = generate_uid_and_token(user)
    activation_link = build_activation_link(uid, token)

    message = f"""
    Hello {user.first_name},

    Thank you for registering with Editly.

    To activate your account, please click the link below:

    {activation_link}

    If you did not create this account, please ignore this email.

    Regards,
    Editly Team
    """

    send_email_task.delay(
        user.email,
        "Activate Your Editly Account",
        message,
    )


def send_reactivation_email(user) -> None:
    """Send a fresh activation link to a user who requested a resend."""
    uid, token = generate_uid_and_token(user)
    activation_link = build_activation_link(uid, token)

    message = f"""
    Hello {user.first_name},

    You recently requested a new account activation link.

    Please click the link below to activate your account:

    {activation_link}

    If you did not request this email, you can safely ignore it.

    Regards,
    Editly Team
    """

    send_email_task.delay(
        user.email,
        "New Activation Link for Your Editly Account",
        message,
    )


def send_updated_account_activation_email(user) -> None:
    """Send a new activation link after a pending user updates their info."""
    uid, token = generate_uid_and_token(user)
    activation_link = build_activation_link(uid, token)

    message = f"""
    Hello {user.first_name},

    Your account information has been updated.

    Please use the new activation link below to activate your account:

    {activation_link}

    If you did not make these changes, please ignore this email.

    Regards,
    Editly Team
    """

    send_email_task.delay(
        user.email,
        "Activate Your Editly Account",
        message,
    )


def send_password_reset_email(user) -> None:
    """Generate a password reset link and dispatch the reset email."""
    from django.utils.http import urlsafe_base64_encode
    from django.utils.encoding import force_bytes
    from .utils import password_reset_token

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = password_reset_token.make_token(user)
    reset_link = build_reset_link(uid, token)

    message = f"""Hello {user.first_name},

    We received a request to reset your password.

    Please click the link below to reset your password:

    {reset_link}

    If you did not request this email, you can safely ignore it.

    Regards,
    Editly Team
    """

    send_email_task.delay(
        user.email,
        "Reset Your Password",
        message,
    )


def decode_uid_to_user(uidb64: str) -> User | None:
    """Decode a uidb64 string and return the matching User, or None on any error."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        return User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None