import psycopg2
from config import settings

try:
    conn = psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASS,
        dbname=settings.DB_NAME
    )
    cur = conn.cursor()
    
    # Check if course_materials table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'course_materials'
        )
    """)
    exists = cur.fetchone()[0]
    print(f"course_materials table exists: {exists}")
    
    # Check if courses table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'courses'
        )
    """)
    exists = cur.fetchone()[0]
    print(f"courses table exists: {exists}")
    
    # List all tables
    cur.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema='public'
    """)
    tables = cur.fetchall()
    print(f"\nAll tables in public schema:")
    for table in tables:
        print(f"  - {table[0]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error connecting to database: {e}")
