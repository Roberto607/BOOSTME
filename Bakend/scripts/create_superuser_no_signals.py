import os
import sys
from pathlib import Path
import django

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save

try:
    from users.signals import activate_user_plan
    from users.models import UserPlan
except Exception:
    activate_user_plan = None
    UserPlan = None

# Disconnect the UserPlan activation signal to avoid recursion during initial setup
if activate_user_plan and UserPlan:
    try:
        post_save.disconnect(receiver=activate_user_plan, sender=UserPlan)
    except Exception:
        pass

User = get_user_model()
USERNAME = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
EMAIL = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
PASSWORD = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Password123')

if User.objects.filter(username=USERNAME).exists():
    print('Superusuario ya existe:', USERNAME)
else:
    User.objects.create_superuser(USERNAME, EMAIL, PASSWORD)
    print('Superusuario creado:', USERNAME)

# (Re)connect is omitted — signal will remain disconnected for this run.
