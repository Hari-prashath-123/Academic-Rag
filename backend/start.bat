@echo off
echo Starting Academic RAG Backend Server...
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Check if .env exists
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and configure your settings.
    echo.
    pause
    exit /b 1
)

REM Initialize database
echo.
echo Initializing database...
python -c "from models import init_db; init_db()"

REM Start server
echo.
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo Documentation at: http://localhost:8000/docs
echo.
uvicorn app:app --reload --host 0.0.0.0 --port 8000
