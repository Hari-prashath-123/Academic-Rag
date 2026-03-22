#!/usr/bin/env python
"""Test script to verify multiple roles per user works."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_portal.settings")
django.setup()

from django_portal.admin_users.models import User, Role, UserRole

# Test users
users = User.objects.all()
roles = Role.objects.all()

print(f"\nTotal users: {users.count()}")
print(f"Total roles: {roles.count()}\n")

if users.count() > 0 and roles.count() > 1:
    test_user = users.first()
    test_roles = roles[:2]  # Get first 2 roles
    
    print(f"Testing user: {test_user.email}")
    print(f"Assigning roles: {', '.join([r.name for r in test_roles])}\n")
    
    # Clear existing roles
    UserRole.objects.filter(user=test_user).delete()
    print(f"Cleared existing roles for {test_user.email}")
    
    # Add multiple roles
    for role in test_roles:
        user_role, created = UserRole.objects.get_or_create(
            user=test_user,
            role=role
        )
        status = "CREATED" if created else "EXISTS"
        print(f"  [{status}] Role: {role.name}")
    
    # Verify
    assigned_roles = UserRole.objects.filter(user=test_user)
    print(f"\nFinal role count for {test_user.email}: {assigned_roles.count()}")
    for ur in assigned_roles:
        print(f"  ✓ {ur.role.name}")
    
    if assigned_roles.count() >= 2:
        print("\n✅ SUCCESS: User can have multiple roles!")
    else:
        print("\n❌ FAILED: Multiple roles not working")
else:
    print("❌ Not enough users or roles to test")
