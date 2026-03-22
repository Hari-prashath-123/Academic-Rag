#!/usr/bin/env python
"""Apply migration to add id column to user_roles table."""
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
    
    migration_sql = """
    -- Alter user_roles table to add id column
    BEGIN;
    
    ALTER TABLE public.user_roles 
    ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
    
    ALTER TABLE public.user_roles 
    DROP CONSTRAINT IF EXISTS user_roles_pkey;
    
    ALTER TABLE public.user_roles 
    ADD PRIMARY KEY (id);
    
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_role_id_unique UNIQUE (user_id, role_id);
    
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
    
    COMMIT;
    """
    
    print("Applying migration to user_roles table...")
    cursor.execute(migration_sql)
    conn.commit()
    print("SUCCESS: Migration applied successfully!")
    
    # Verify the change
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='user_roles' ORDER BY ordinal_position;")
    columns = [row[0] for row in cursor.fetchall()]
    print(f"\nTable columns: {', '.join(columns)}")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    if conn:
        conn.rollback()
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()
