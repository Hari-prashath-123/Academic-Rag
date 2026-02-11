#!/bin/bash

echo "Starting Academic RAG Backend Server..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "WARNING: .env file not found!"
    echo "Please copy .env.example to .env and configure your settings."
    echo ""
    exit 1
fi

# Initialize database
echo ""
echo "Initializing database..."
python -c "from models import init_db; init_db()"

# Start server
echo ""
echo "Starting FastAPI server..."
echo "Server will be available at: http://localhost:8000"
echo "Documentation at: http://localhost:8000/docs"
echo ""
uvicorn app:app --reload --host 0.0.0.0 --port 8000
