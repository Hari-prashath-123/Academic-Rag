#!/usr/bin/env python
"""Fix unique indexes on user_roles table."""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DB_NAME = os.getenv("DB_NAME") or os.getenv("POSTGRES_DB")
DB_USER = os.getenv("DB_USER") or os.getenv("POSTGRES_USER")
DB_PASS = os.getenv("DB_PASS") or os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

try:
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT
    )
    cursor = conn.cursor()
    
    # Drop bad indexes
    print("Dropping old/bad indexes...")
    cursor.execute("DROP INDEX IF EXISTS idx_user_roles_user_id_unique;")
    print("  - Dropped idx_user_roles_user_id_unique")
    
    cursor.execute("DROP INDEX IF EXISTS idx_user_roles_user_id_role_id;")
    print("  - Dropped idx_user_roles_user_id_role_id")
    
    # Ensure we have the correct unique constraint
    print("\nChecking constraints...")
    cursor.execute("""
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name='user_roles' AND constraint_type='UNIQUE';
    """)
    constraints = [row[0] for row in cursor.fetchall()]
    print(f"  Unique constraints: {constraints}")
    
    # Add the right unique constraint if it doesn't exist
    if "user_roles_user_id_role_id_unique" not in constraints and "user_roles_user_id_role_id_key" not in constraints:
        print("\nAdding unique constraint on (user_id, role_id)...")
        cursor.execute("""
            ALTER TABLE public.user_roles 
            ADD CONSTRAINT user_roles_user_id_role_id_unique UNIQUE (user_id, role_id);
        """)
        print("  - Added user_roles_user_id_role_id_unique")
    
    conn.commit()
    print("\nSUCCESS: Indexes fixed!")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    if conn:
        conn.rollback()
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()
