#!/bin/sh

set -e

echo "==================================="
echo "Starting Editly Backend..."
echo "==================================="

echo "Waiting for PostgreSQL..."

timeout=60

while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
    timeout=$((timeout - 1))

    if [ "$timeout" -le 0 ]; then
        echo "Database connection timeout!"
        exit 1
    fi

    sleep 1
done

echo "Database is available."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Backend is ready."

exec "$@"