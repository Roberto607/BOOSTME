#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from users.serializers import UserSerializer
from users.models import User
from rest_framework.test import APIRequestFactory

# Create a test request
factory = APIRequestFactory()
request = factory.get('/api/users/profile/')

# Get user 'robe'
user = User.objects.get(username='robe')

# Serialize the user with the request context
serializer = UserSerializer(user, context={'request': request})

print("=== UserSerializer response for 'robe' ===")
import json
print(json.dumps(serializer.data, indent=2, default=str))
