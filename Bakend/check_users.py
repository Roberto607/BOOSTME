#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from django.db import connection
from users.models import User

print("=== Users in Database ===")
users = User.objects.all().values_list('id', 'username', 'email', 'first_name', 'photo')
for user_id, username, email, first_name, photo in users:
    print(f"\nID: {user_id}")
    print(f"  Username: {username}")
    print(f"  Email: {email}")
    print(f"  First Name: '{first_name}'")
    print(f"  Photo: {photo}")

print("\n\n=== Checking specific user 'robe' ===")
try:
    user = User.objects.get(username='robe')
    print(f"Found user 'robe': {user.id}")
    print(f"  Email: {user.email}")
    print(f"  First Name: '{user.first_name}'")
    print(f"  Last Name: '{user.last_name}'")
    print(f"  Photo: {user.photo}")
    print(f"  Photo URL: {user.photo.url if user.photo else 'NO PHOTO'}")
except User.DoesNotExist:
    print("User 'robe' not found!")
