#!/usr/bin/env python
"""Remove admin role from staff1@gmail.com"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from config import settings
from models import User, Role, UserRole

# Create engine and session
engine = create_engine(settings.DATABASE_URL)
session = Session(engine)

try:
    # Find the user
    user = session.query(User).filter(User.email == "staff1@gmail.com").first()
    if not user:
        print("❌ User staff1@gmail.com not found")
        session.close()
        exit(1)

    print(f"✓ Found user: {user.email}")

    # Get current roles
    current_roles = [ur.role.name for ur in user.user_roles if ur.role]
    print(f"✓ Current roles: {current_roles}")

    # Find and remove admin role
    admin_role = session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        print("❌ Admin role not found")
        session.close()
        exit(1)

    # Find and delete the association
    admin_assignment = session.query(UserRole).filter(
        UserRole.user_id == user.id,
        UserRole.role_id == admin_role.id
    ).first()

    if admin_assignment:
        session.delete(admin_assignment)
        session.commit()
        print(f"✓ Removed admin role from staff1@gmail.com")
        
        # Get new roles
        updated_roles = [ur.role.name for ur in user.user_roles if ur.role]
        print(f"✓ New roles: {updated_roles}")
    else:
        print("❌ Admin assignment not found")
        session.close()
        exit(1)

except Exception as e:
    print(f"❌ Error: {e}")
    session.rollback()
    exit(1)
finally:
    session.close()

print("\n✓ Done!")
