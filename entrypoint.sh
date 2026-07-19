#!/bin/sh

set -e

echo "Waiting for database..."

while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
    sleep 1
done

echo "Database is ready."

python manage.py migrate
python manage.py collectstatic --noinput

exec "$@"