"""
Database migration script using Alembic
"""
from alembic import command
from alembic.config import Config

def run_migrations():
    """Run database migrations"""
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")

if __name__ == "__main__":
    run_migrations()
