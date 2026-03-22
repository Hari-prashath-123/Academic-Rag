"""
Database migration script - runs raw SQL migrations from migrations/ directory
"""
import sys
from pathlib import Path
from sqlalchemy import text, create_engine
from sqlalchemy.exc import OperationalError
from config import settings


def _build_db_url(db_name: str) -> str:
    """Build PostgreSQL URL from environment settings."""
    return f"postgresql://{settings.DB_USER}:{settings.DB_PASS}@{settings.DB_HOST}:{settings.DB_PORT}/{db_name}"


def _quoted_identifier(identifier: str) -> str:
    """Safely quote PostgreSQL identifier (database/table/column name)."""
    return f'"{identifier.replace("\"", "\"\"")}"'


def ensure_database_exists() -> None:
    """Ensure target database exists; create it if missing."""
    admin_engine = create_engine(
        _build_db_url("postgres"),
        isolation_level="AUTOCOMMIT",
    )
    db_name = settings.DB_NAME
    with admin_engine.connect() as connection:
        exists = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
            {"db_name": db_name},
        ).scalar()

        if exists:
            return

        print(f"Database '{db_name}' not found. Creating it...")
        connection.execute(text(f"CREATE DATABASE {_quoted_identifier(db_name)}"))
        print(f"✅ Database created: {db_name}")

def run_migrations():
    """Run database migrations from migrations/ directory"""
    db_url = _build_db_url(settings.DB_NAME)
    
    try:
        engine = create_engine(db_url)
        
        # Get migration files in order
        migrations_dir = Path(__file__).parent / "migrations"
        migration_files = sorted(migrations_dir.glob("*.sql"))
        
        if not migration_files:
            print("No migration files found in migrations/ directory")
            return True
        
        print(f"Found {len(migration_files)} migration(s)")
        
        pending = list(migration_files)
        max_passes = len(migration_files) + 1

        with engine.connect() as connection:
            for pass_index in range(1, max_passes + 1):
                if not pending:
                    break

                print(f"\nMigration pass {pass_index} ({len(pending)} pending)")
                next_pending = []
                progress_made = False

                for migration_file in pending:
                    print(f"\nRunning: {migration_file.name}")

                    with open(migration_file, "r", encoding="utf-8") as f:
                        sql_content = f.read()
                    file_completed = True

                    try:
                        # Execute full file content to support PL/pgSQL blocks (e.g., DO $$ ... $$).
                        connection.execute(text(sql_content))
                    except Exception as e:
                        error_text = str(e)
                        error_text_lower = error_text.lower()

                        # Idempotent re-run noise; continue processing.
                        if "already exists" in error_text_lower or "duplicate key" in error_text_lower:
                            print(f"  ⚠️  {migration_file.name}: {e}")
                        # Dependency not met yet (e.g., FK references table from later migration).
                        elif "undefinedtable" in error_text_lower or "relation" in error_text_lower and "does not exist" in error_text_lower:
                            print(f"  ⏭️  Deferring {migration_file.name}: {e}")
                            file_completed = False
                            next_pending.append(migration_file)
                            connection.rollback()
                        else:
                            print(f"  ❌ Error in {migration_file.name}:")
                            print(f"     {e}")
                            raise

                    if file_completed:
                        connection.commit()
                        print(f"  ✅ {migration_file.name} completed")
                        progress_made = True

                if not progress_made and next_pending:
                    unresolved = ", ".join(file.name for file in next_pending)
                    raise RuntimeError(
                        f"Could not resolve migration dependencies after {pass_index} passes. Remaining: {unresolved}"
                    )

                pending = next_pending

            if pending:
                unresolved = ", ".join(file.name for file in pending)
                raise RuntimeError(f"Unapplied migrations remain: {unresolved}")
        
        print("\n✅ All migrations completed successfully!")
        return True
        
    except OperationalError as e:
        message = str(e).lower()
        if "does not exist" in message and "database" in message:
            print(f"\nTarget database '{settings.DB_NAME}' does not exist.")
            ensure_database_exists()
            print("Retrying migrations...\n")
            return run_migrations()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
