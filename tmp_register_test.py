import os
import json
import uuid
import sys

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
import django
django.setup()
from django.test import Client

email = 'lissetmejias686verifyagain@gmail.com'
username = 'lissettest' + uuid.uuid4().hex[:6]
payload = {'email': email, 'username': username, 'password': '12345678'}

c = Client()
resp = c.post('/api/users/register/', data=json.dumps(payload), content_type='application/json')
print('status', resp.status_code)
print(resp.content.decode())
