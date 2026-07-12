#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bakend.settings')
django.setup()

from django.db import connection

print("=== All tables in database ===")
with connection.cursor() as cursor:
    cursor.execute(
        """SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           ORDER BY table_name;"""
    )
    tables = cursor.fetchall()
    if tables:
        print(f"Total tables: {len(tables)}\n")
        for (table_name,) in tables:
            print(f"  - {table_name}")
    else:
        print("No tables found! Database is empty.")

print("\n=== Django Migration Status ===")
from django.core.management import call_command
call_command('showmigrations')
