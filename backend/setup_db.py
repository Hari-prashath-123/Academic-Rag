#!/usr/bin/env python
"""
Complete database setup script.

This script will:
1. Create the database if it doesn't exist
2. Run all migrations
3. Create default roles in the database

Usage:
    python setup_db.py
"""

import os
import sys
import subprocess
from pathlib import Path
from sqlalchemy import text, create_engine
from config import settings
from utils.logger import log

def ensure_database_exists():
    """Create database if it doesn't exist"""
    # Connect to default 'postgres' database
    postgres_url = f"postgresql://{settings.DB_USER}:{settings.DB_PASS}@{settings.DB_HOST}:{settings.DB_PORT}/postgres"
    
    try:
        engine = create_engine(postgres_url)
        with engine.connect() as connection:
            # Check if database exists
            result = connection.execute(
                text(f"SELECT 1 FROM pg_database WHERE datname = '{settings.DB_NAME}'")
            )
            
            if not result.fetchone():
                log.info(f"Creating database: {settings.DB_NAME}")
                # Autocommit for CREATE DATABASE
                connection.connection.autocommit = True
                connection.execute(text(f"CREATE DATABASE {settings.DB_NAME}"))
                log.info(f"✅ Database created: {settings.DB_NAME}")
            else:
                log.info(f"✅ Database already exists: {settings.DB_NAME}")
    
    except Exception as e:
        log.error(f"Failed to create database: {e}")
        raise


def run_migrations():
    """Run all SQL migrations from migrations/ directory"""
    db_url = f"postgresql://{settings.DB_USER}:{settings.DB_PASS}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    try:
        engine = create_engine(db_url)
        
        # Get migration files in order
        migrations_dir = Path(__file__).parent / "migrations"
        migration_files = sorted(migrations_dir.glob("*.sql"))
        
        if not migration_files:
            log.warning("No migration files found in migrations/ directory")
            return True
        
        log.info(f"Running {len(migration_files)} migration(s)...")
        
        with engine.connect() as connection:
            for migration_file in migration_files:
                log.info(f"\n  Running: {migration_file.name}")
                
                # Read SQL file
                with open(migration_file, 'r') as f:
                    sql_content = f.read()
                
                # Execute SQL (split by semicolon to handle multiple statements)
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                
                for statement in statements:
                    try:
                        connection.execute(text(statement))
                    except Exception as e:
                        # Don't fail if table already exists (expected for idempotent migrations)
                        if "already exists" in str(e).lower() or "duplicate key" in str(e).lower():
                            log.debug(f"  ⚠️  {migration_file.name}: {e}")
                        else:
                            log.error(f"  ❌ Error in {migration_file.name}:")
                            log.error(f"     {e}")
                            raise
                
                log.info(f"  ✅ {migration_file.name} completed")
            
            # Commit all changes
            connection.commit()
        
        log.info("\n✅ All migrations completed successfully!")
        return True
        
    except Exception as e:
        log.error(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def seed_default_roles():
    """Create default roles in the database"""
    db_url = f"postgresql://{settings.DB_USER}:{settings.DB_PASS}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    try:
        engine = create_engine(db_url)
        
        default_roles = [
            {"name": "student", "description": "Student with limited access"},
            {"name": "faculty", "description": "Faculty with moderate access"},
            {"name": "admin", "description": "Administrator with full access"},
        ]
        
        with engine.connect() as connection:
            for role in default_roles:
                # Check if role exists
                result = connection.execute(
                    text(f"SELECT id FROM roles WHERE name = '{role['name']}'")
                )
                
                if not result.fetchone():
                    connection.execute(
                        text(
                            f"INSERT INTO roles (name, description) VALUES ('{role['name']}', '{role['description']}')"
                        )
                    )
                    log.info(f"  ✅ Created role: {role['name']}")
                else:
                    log.info(f"  ℹ️  Role already exists: {role['name']}")
            
            connection.commit()
        
        log.info("\n✅ Default roles seeded successfully!")
        return True
        
    except Exception as e:
        log.error(f"Failed to seed default roles: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run complete database setup"""
    log.info("=" * 60)
    log.info("Academic RAG - Database Setup")
    log.info("=" * 60)
    
    log.info(f"\nDatabase Configuration:")
    log.info(f"  Host: {settings.DB_HOST}")
    log.info(f"  Port: {settings.DB_PORT}")
    log.info(f"  User: {settings.DB_USER}")
    log.info(f"  Database: {settings.DB_NAME}")
    
    # Step 1: Ensure database exists
    log.info("\n[1/3] Ensuring database exists...")
    try:
        ensure_database_exists()
    except Exception as e:
        log.error(f"Failed to ensure database: {e}")
        return False
    
    # Step 2: Run migrations
    log.info("\n[2/3] Running migrations...")
    if not run_migrations():
        log.error("Failed to run migrations")
        return False
    
    # Step 3: Seed default roles
    log.info("\n[3/3] Seeding default roles...")
    if not seed_default_roles():
        log.warning("Failed to seed default roles (non-critical)")
    
    log.info("\n" + "=" * 60)
    log.info("✅ Database setup completed successfully!")
    log.info("=" * 60)
    log.info("\nNext steps:")
    log.info("  1. Create a superuser:")
    log.info("     python create_superuser.py")
    log.info("  2. Start the backend server:")
    log.info("     python manage.py runserver")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
