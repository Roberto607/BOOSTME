#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from users.models import User

# Reset password for user 'robe'
try:
    user = User.objects.get(username='robe')
    user.set_password('carlo123')
    user.save()
    print(f"✓ Password reset for user '{user.username}' to 'carlo123'")
except User.DoesNotExist:
    print("✗ User 'robe' not found")
