#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from rest_framework.test import APIClient

# Create a test client
client = APIClient()

# Datos para el registro
user_data = {
    'username': 'testuser123',
    'email': 'testuser@example.com',
    'password': 'testpass123'
}

print("=== Testing Register Endpoint ===")
print(f"POST /api/users/register/")
print(f"Data: {user_data}\n")

# Hacer POST request
response = client.post(
    '/api/users/register/',
    data=user_data,
    format='json'
)

print(f"Status Code: {response.status_code}")
print(f"\nResponse Body:")
print(json.dumps(response.data, indent=2, default=str))

