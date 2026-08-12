import os
import sys
import django
import json

# Ensure project root is on sys.path so Django can import the settings module
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE','Bakend.settings')
try:
    django.setup()
except Exception as e:
    print('DJANGO_SETUP_ERROR:', e)
    raise

from django.contrib.auth import get_user_model
User = get_user_model()

qs = User.objects.filter(wallet_network__iexact='tron').values('id','username','wallet_address')[:200]
print(json.dumps(list(qs), ensure_ascii=False, indent=2))
