"""
Django-style entrypoint for running the FastAPI backend.
"""
import os
import sys


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


def main() -> None:
    """Support a minimal Django-like command: python manage.py runserver."""
    if len(sys.argv) < 2 or sys.argv[1] != "runserver":
        print("Usage: python manage.py runserver [host:port]")
        sys.exit(1)

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


if __name__ == "__main__":
    main()
