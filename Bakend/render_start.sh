#!/usr/bin/env bash
set -e

cd /opt/render/project/src/Bakend

# Asegurarse de que la variable de entorno PORT esté configurada
export PORT=${PORT:-8000}

echo "Iniciando aplicación en el puerto $PORT"

# Intentar ejecutar migraciones pero continuar incluso si fallan
echo "Ejecutando migraciones..."
python manage.py migrate --noinput || echo "Advertencia: Las migraciones fallaron, continuando..."

# Recolectar archivos estáticos
echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput || echo "Advertencia: La recolección de archivos estáticos falló, continuando..."

# Crear superusuario solo si no existe
echo "Verificando superusuario..."
python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'Password123')" || echo "Advertencia: No se pudo crear el superusuario, continuando..."

echo "Iniciando servidor Gunicorn..."
exec gunicorn Bakend.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
