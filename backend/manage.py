"""
Django-style entrypoint for running the FastAPI backend.
"""
import os
import sys
import subprocess


def parse_host_port(args: list[str], default_port: int) -> tuple[str, int]:
    """Parse runserver host:port argument, defaulting to 127.0.0.1:8000."""
    host = "127.0.0.1"
    port = default_port

    if not args:
        return host, port

    value = args[0]
    if ":" in value:
        host_part, port_part = value.split(":", 1)
        if host_part:
            host = host_part
        if port_part:
            port = int(port_part)
    elif value.isdigit():
        port = int(value)
    else:
        host = value

    return host, port


def runserver() -> None:
    """Run FastAPI development server."""
    default_port = int(os.getenv("PORT", "8000"))
    debug_enabled = os.getenv("DEBUG", "True").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "INFO").lower()

    try:
        import uvicorn  # type: ignore[import-not-found]
    except ModuleNotFoundError:
        print("Missing dependency: uvicorn")
        print("Install backend dependencies first:")
        print("  python -m pip install -r requirements.txt")
        sys.exit(1)

    host, port = parse_host_port(sys.argv[2:3], default_port)

    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=debug_enabled,
        log_level=log_level,
    )


def createsuperuser() -> None:
    """Create an admin user using the project superuser script."""
    try:
        from create_superuser import create_superuser
    except ModuleNotFoundError:
        print("Could not import create_superuser.py")
        sys.exit(1)

    success = create_superuser()
    sys.exit(0 if success else 1)


def migrate() -> None:
    """Run backend SQL migrations from migrations/ directory."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    migrate_script = os.path.join(script_dir, "migrate.py")
    completed = subprocess.run([sys.executable, migrate_script], check=False)
    sys.exit(completed.returncode)


def adminportal() -> None:
    """Run the Django admin portal service."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    django_manage = os.path.join(script_dir, "django_manage.py")
    args = [sys.executable, django_manage] + sys.argv[2:]
    if len(sys.argv) == 2:
        admin_host = os.getenv("DJANGO_ADMIN_HOST", "127.0.0.1")
        admin_port = os.getenv("DJANGO_ADMIN_PORT", "8001")
        args += ["runserver", f"{admin_host}:{admin_port}"]
    completed = subprocess.run(args, check=False)
    sys.exit(completed.returncode)


def main() -> None:
    """Support Django-like backend commands."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python manage.py runserver [host:port]")
        print("  python manage.py migrate")
        print("  python manage.py createsuperuser")
        print("  python manage.py adminportal [django-command]")
        sys.exit(1)

    command = sys.argv[1].lower()
    if command == "runserver":
        runserver()
        return
    if command == "migrate":
        migrate()
        return
    if command == "createsuperuser":
        createsuperuser()
        return
    if command == "adminportal":
        adminportal()
        return

    print(f"Unknown command: {command}")
    print("Available commands: runserver, migrate, createsuperuser, adminportal")
    sys.exit(1)


if __name__ == "__main__":
    main()
