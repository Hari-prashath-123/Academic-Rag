#!/bin/bash
#
# start-all.sh - Start both FastAPI backend (port 8000) and Django admin portal (port 8001)
#
# Usage: ./start-all.sh

set -e

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

echo "================================================================"
echo "Academic RAG Backend - Multi-Service Launcher"
echo "================================================================"
echo ""

# Activate virtual environment
echo "Activating Python virtual environment..."
source venv/bin/activate

echo ""
echo "Starting services..."
echo ""

# Start FastAPI on port 8000
echo "Launching FastAPI REST API on http://127.0.0.1:8000..."
python manage.py runserver 127.0.0.1:8000 &
FASTAPI_PID=$!

# Small delay to let FastAPI start
sleep 1

# Start Django admin on port 8001
echo "Launching Django Admin Portal on http://127.0.0.1:8001..."
python manage.py adminportal &
DJANGO_PID=$!

echo ""
echo "================================================================"
echo "Both services started successfully."
echo "================================================================"
echo ""
echo "FastAPI REST API"
echo "  URL: http://127.0.0.1:8000"
echo "  Docs: http://127.0.0.1:8000/docs"
echo "  Login: http://127.0.0.1:8000/api/auth/login-page"
echo ""
echo "Django Admin Portal"
echo "  URL: http://127.0.0.1:8001/admin/"
echo "  Username: hari"
echo "  Password: 123"
echo ""
echo "FastAPI Login Credentials"
echo "  Email: admin@test.local"
echo "  Password: admin123"
echo ""
echo "To stop all services: Press Ctrl+C"
echo ""

# Wait for both processes and handle cleanup
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $FASTAPI_PID 2>/dev/null || true
    kill $DJANGO_PID 2>/dev/null || true
    echo "Services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
