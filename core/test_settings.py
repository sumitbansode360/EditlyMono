"""
Settings override used automatically by `manage.py test` (see manage.py) —
in-memory email backend and eager/broker-less Celery, so tests don't need
real SMTP credentials or a running Redis instance.

Can still be selected explicitly for other commands:
DJANGO_SETTINGS_MODULE=core.test_settings python manage.py <command>
"""
from .settings import *  # noqa

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Run Celery tasks synchronously, in-process. Celery 5.x still resolves a
# producer/transport even in eager mode (to read serializer settings), so
# point it at kombu's in-memory transport rather than redis://, which would
# otherwise require a real redis-py install and a live broker.
CELERY_BROKER_URL = 'memory://'
CELERY_RESULT_BACKEND = 'cache+memory://'
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True