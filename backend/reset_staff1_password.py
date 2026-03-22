#!/usr/bin/env python
"""Reset password for staff1@gmail.com to '123'"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from config import settings
from models import User
from utils.auth import get_password_hash

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

    # Set password
    new_password = "123"
    user.password_hash = get_password_hash(new_password)
    session.commit()
    print(f"✓ Password reset to: {new_password}")

except Exception as e:
    print(f"❌ Error: {e}")
    session.rollback()
    exit(1)
finally:
    session.close()

print("\n✓ Done! You can now login with staff1@gmail.com / 123")
