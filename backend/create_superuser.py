#!/usr/bin/env python
"""
Create a superuser (admin) account for the Academic RAG application.

Usage:
    python create_superuser.py
    # Then enter email and password when prompted

Or with environment variables:
    CREATE_SUPERUSER_EMAIL=admin@example.com CREATE_SUPERUSER_PASSWORD=password123 python create_superuser.py
"""

import os
import sys
from getpass import getpass
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings
from models import engine
from models.user import User, Profile
from models.role import Role, UserRole
from utils.auth import get_password_hash
from utils.logger import log


def get_user_input(prompt: str, env_var: str = None, is_password: bool = False) -> str:
    """Get user input from command line or environment variable."""
    if env_var and os.getenv(env_var):
        return os.getenv(env_var)
    
    if is_password:
        return getpass(prompt)
    else:
        return input(prompt)


def create_superuser():
    """Create a superuser account."""
    # Verify database connectivity
    try:
        log.info("Checking database connectivity...")
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as e:
        log.error(f"Database connection failed: {e}")
        return False

    # Get user input
    email = get_user_input(
        "Enter superuser email: ",
        env_var="CREATE_SUPERUSER_EMAIL"
    ).strip()
    
    if not email:
        log.error("Email cannot be empty")
        return False

    # Create session
    session = Session(engine)
    
    try:
        # Check if user already exists
        existing_user = session.query(User).filter(User.email == email).first()
        if existing_user:
            log.warning(f"User with email {email} already exists")
            return False

        # Get password
        password = get_user_input(
            "Enter superuser password: ",
            env_var="CREATE_SUPERUSER_PASSWORD",
            is_password=True
        )
        
        if not password or len(password) < 6:
            log.error("Password must be at least 6 characters")
            return False

        # Hash password
        password_hash = get_password_hash(password)

        # Create user
        user = User(
            email=email,
            password_hash=password_hash,
        )
        session.add(user)
        session.flush()  # Flush to get the user ID without committing
        
        log.info(f"Created user: {email}")

        # Create profile
        profile = Profile(
            user_id=user.id,
            first_name="Admin",
            last_name="User",
        )
        session.add(profile)
        session.flush()
        
        log.info(f"Created profile for user: {email}")

        # Get or create admin role
        admin_role = session.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            # If admin role doesn't exist, create it with full permissions
            admin_role = Role(
                name="admin",
                description="Administrator with full access",
            )
            session.add(admin_role)
            session.flush()
            log.info("Created admin role")

        # Assign admin role to user
        user_role = UserRole(
            user_id=user.id,
            role_id=admin_role.id,
        )
        session.add(user_role)
        
        log.info(f"Assigned admin role to user: {email}")

        # Commit all changes
        session.commit()
        
        log.info(f"✅ Superuser created successfully!")
        log.info(f"   Email: {email}")
        log.info(f"   Role: admin")
        
        return True

    except Exception as e:
        session.rollback()
        log.error(f"Failed to create superuser: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        session.close()


if __name__ == "__main__":
    success = create_superuser()
    sys.exit(0 if success else 1)
