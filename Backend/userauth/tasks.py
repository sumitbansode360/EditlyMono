from celery import shared_task
from django.core.mail import send_mail 
from django.conf import settings

@shared_task(bind=True, max_retries=3)
def send_email_task(self, email, subject, message):
    try:
        print("Sending email...")
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            fail_silently=False
        )
    except Exception as e:
        print(f"Error sending email: {e}")
        raise self.retry(exc=e, countdown=5)
  
