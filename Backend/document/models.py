import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Untitled Document")
    content = models.JSONField(default=dict)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class DocumentCollaboration(models.Model):
    """
    One row = one collaborator (real or invited-but-not-yet-registered) on
    one document.

    `user` is nullable on purpose: when the invited email doesn't match any
    existing account, we still create the row so the invite "exists" —
    `invited_email` carries the identity until registration links a real
    `user` to it (see userauth.views._link_pending_document_invites).

    `status` tracks whether the collaborator can actually use the document
    yet: PENDING until their account exists *and* is active, ACTIVE once it
    is. This is what the document-list query and access checks key off of.
    """

    class Role(models.TextChoices):
        VIEWER = "viewer", "Viewer"
        EDITOR = "editor", "Editor"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="collaborators")
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="shared_documents",
        null=True, blank=True,
    )
    invited_email = models.EmailField(null=True, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_invitations")
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["document", "user"],
                condition=models.Q(user__isnull=False),
                name="unique_linked_collaborator_per_document",
            ),
            models.UniqueConstraint(
                fields=["document", "invited_email"],
                condition=models.Q(user__isnull=True),
                name="unique_pending_invite_per_document",
            ),
        ]

    def __str__(self):
        identity = self.user.email if self.user_id else self.invited_email
        return f"{identity} - {self.role} on {self.document.title}"

    @property
    def invitee_email(self):
        return self.user.email if self.user_id else self.invited_email