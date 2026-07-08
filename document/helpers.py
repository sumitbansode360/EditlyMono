from django.conf import settings
from userauth.tasks import send_email_task


def _document_link(document_id) -> str:
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    return f"{frontend_url}/documents/{document_id}"


def _signup_link(email: str) -> str:
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    return f"{frontend_url}/signup?email={email}"


def send_collaboration_invitation_email(collaboration) -> None:
    """
    Sends the right email for the right situation. This is the piece that
    makes the "invite someone who isn't a user yet" flow make sense to the
    recipient instead of landing as a generic, context-free signup email.

    - Active existing account -> straight link to the document.
    - Registered but not-yet-activated account -> nudge to activate, with
      the document named so they know why they're being asked.
    - No account at all -> signup link, with an explicit line telling them
      the document will show up on their dashboard once they're active.
    """
    document = collaboration.document
    inviter = collaboration.invited_by
    role_label = collaboration.get_role_display()

    if collaboration.user_id and collaboration.user.is_active:
        user = collaboration.user
        recipient = user.email
        subject = f'{inviter.first_name} invited you to "{document.title}"'
        message = f"""
            Hi {user.first_name},
            {inviter.first_name} {inviter.last_name} invited you to collaborate on "{document.title}" as {role_label}.

            Open it here:
            {_document_link(document.id)}
            """
    elif collaboration.user_id and not collaboration.user.is_active:
        user = collaboration.user
        recipient = user.email
        subject = f'{inviter.first_name} invited you to "{document.title}" — activate your account'
        message = f"""Hi {user.first_name},

            {inviter.first_name} {inviter.last_name} invited you to collaborate on "{document.title}" as {role_label}.

            You already started creating an Editly account with this email address but haven't activated it yet.
            Please check your inbox for the activation link, or request a new one from the login page.

            Once your account is active, "{document.title}" will appear on your dashboard automatically.
            """
    else:
        recipient = collaboration.invited_email
        subject = f'{inviter.first_name} invited you to collaborate on "{document.title}"'
        message = f"""Hi,

        {inviter.first_name} {inviter.last_name} invited you to collaborate on "{document.title}" as {role_label}.

        Create your free Editly account to get started:
        {_signup_link(collaboration.invited_email)}

        Once you sign up and activate your account, this document will automatically appear on your dashboard.
        """

    send_email_task.delay(recipient, subject, message)