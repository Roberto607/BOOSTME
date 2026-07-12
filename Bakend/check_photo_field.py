#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from users.models import User
from django.db import connection

print("=== User Model Fields with 'photo' ===")
for field in User._meta.get_fields():
    if 'photo' in field.name.lower():
        print(f"\nField: {field.name}")
        print(f"  Type: {field.__class__.__name__}")
        print(f"  Null: {getattr(field, 'null', 'N/A')}")
        print(f"  Blank: {getattr(field, 'blank', 'N/A')}")
        print(f"  Upload to: {getattr(field, 'upload_to', 'N/A')}")

print("\n=== Database Columns in users_user ===")
with connection.cursor() as cursor:
    # Check if table exists
    cursor.execute(
        """SELECT EXISTS (
             SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name='users_user'
           );"""
    )
    table_exists = cursor.fetchone()[0]
    print(f"Table 'users_user' exists: {table_exists}")
    
    if table_exists:
        cursor.execute(
            """SELECT column_name, data_type FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name='users_user' 
               ORDER BY ordinal_position;"""
        )
        columns = cursor.fetchall()
        print(f"\nTotal columns: {len(columns)}")
        print("\nPhoto-related column:")
        found = False
        for col_name, data_type in columns:
            if 'photo' in col_name.lower():
                print(f"  \u2713 {col_name}: {data_type}")
                found = True
        if not found:
            print("  \u2717 No photo column found!")
