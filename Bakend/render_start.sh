#!/usr/bin/env bash
set -e

cd /opt/render/project/src/Bakend

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'Password123')"

exec gunicorn Bakend.wsgi:application --bind 0.0.0.0:$PORT
