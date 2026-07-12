#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from users.models import User

print('=== All Users in Database ===')
for u in User.objects.all():
    print(f'{u.id}: {u.username} (first_name: "{u.first_name}", email: {u.email})')

print('\n=== Search for tunica ===')
if User.objects.filter(username='tunica').exists():
    tunica = User.objects.get(username='tunica')
    print(f'✓ Found user "tunica" (ID: {tunica.id}, email: {tunica.email})')
else:
    print('✗ User "tunica" not found')

print('\n=== User robe details ===')
robe = User.objects.get(username='robe')
print(f'Username: {robe.username}')
print(f'First Name: "{robe.first_name}"')
print(f'Email: {robe.email}')
print(f'Photo: {robe.photo}')
