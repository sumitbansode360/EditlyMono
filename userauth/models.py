import uuid
from django.utils import timezone
from django.db import models
from django.contrib.auth.models import AbstractUser

MAX_ACTIVATION_EMAILS_PER_DAY = 3  # 1 on register + 2 resends

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, blank=False, null=False)
    last_name = models.CharField(max_length=30, blank=False, null=False)
    profile_pic = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    last_activation_email_sent_at = models.DateTimeField(null=True, blank=True)
    activation_email_count = models.PositiveIntegerField(default=0)
    activation_email_count_date = models.DateField(null=True, blank=True)

    REQUIRED_FIELDS = ['first_name', 'last_name', "email"]

    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)
    
    def can_receive_activation_email(self) -> bool:
        """
        True if the user hasn't hit the daily cap yet.
        A new calendar day always resets the window.
        """
        today = timezone.now().date()
        if self.activation_email_count_date != today:
            return True
        return self.activation_email_count < MAX_ACTIVATION_EMAILS_PER_DAY
    
    def record_activation_email_sent(self):
        """
        Increment (or reset-then-increment) the daily counter and
        stamp the last-sent timestamp. Only touches 3 fields.
        """

        today = timezone.now().date()

        if self.activation_email_count_date != today:
            # new day — start a fresh window
            self.activation_email_count = 1
            self.activation_email_count_date = today
        else:
            self.activation_email_count += 1

        self.last_activation_email_sent_at = timezone.now()
        self.save(
            update_fields=[
                "activation_email_count",
                "activation_email_count_date",
                "last_activation_email_sent_at",
            ]
        )
