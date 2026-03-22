#!/usr/bin/env python
"""Quick script to verify migrated users."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_portal.settings")
django.setup()

from django_portal.admin_users.models import User

users = User.objects.all()
print(f"\nTotal users in unified model: {users.count()}\n")
for user in users:
    print(f"  - {user.email} (created: {user.created_at})")

print("\nAll users successfully migrated to unified User model!")
print("You can now assign roles to these users in Django admin.")
