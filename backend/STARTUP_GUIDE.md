# Backend Startup Guide

## Quick Start (All-in-One)

### Windows PowerShell
```powershell
cd backend
.\start-all.ps1
```

### macOS / Linux
```bash
cd backend
chmod +x start-all.sh
./start-all.sh
```

This launches **both services simultaneously:**
- **FastAPI REST API** on `http://127.0.0.1:8000`
- **Django Admin Portal** on `http://127.0.0.1:8001` (started with `--noreload` for stable dual-process launch)

---

## Prerequisites

1. **PostgreSQL** running locally on `localhost:5432`
2. **Python 3.12+** with virtual environment: `venv/` (auto-created)
3. **Dependencies installed**: Activate venv and run `pip install -r requirements.txt`

---

## Environment Setup

Create a `.env` file in the `backend/` directory with:

```env
# Application
APP_ENV=development
DEBUG=True
LOG_LEVEL=INFO
PORT=8000
DJANGO_ADMIN_PORT=8001

# Database (Local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_postgres_password
DB_NAME=academic_rag

# JWT
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS_RAW=http://localhost:3000,http://127.0.0.1:8000

# OpenAI (optional for RAG features)
OPENAI_API_KEY=your-openai-api-key
```

---

## Service Ports

| Service | Port |
|---------|------|
| FastAPI REST API | 8000 |
| Django Admin Portal | 8001 |

---

## Individual Service Startup

### FastAPI REST API (port 8000)

**Windows:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver
```

**macOS / Linux:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

Access: `http://127.0.0.1:8000`

---

### Django Admin Portal (port 8001)

**Windows:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py adminportal
```

**macOS / Linux:**
```bash
cd backend
source venv/bin/activate
python manage.py adminportal
```

Access: `http://127.0.0.1:8001/admin/`

---

## First-Time Setup

Run these commands **once** before starting services:

**Windows:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python migrate.py
python django_manage.py migrate
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python migrate.py
python django_manage.py migrate
```

---

## Create Superuser (Admin Account)

### For FastAPI:
```bash
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
python create_superuser.py
```

Or with environment variables:
```bash
CREATE_SUPERUSER_EMAIL=admin@test.local CREATE_SUPERUSER_PASSWORD=admin123 python create_superuser.py
```

### For Django Admin (already done):
Django superuser is created after running `python django_manage.py migrate`

---

## Credentials

### FastAPI REST API
- **Email:** `admin@test.local`
- **Password:** `admin123`
- **Endpoint:** `POST http://127.0.0.1:8000/api/auth/login`

### Django Admin Portal
- **Username:** `hari`
- **Password:** `123`
- **URL:** `http://127.0.0.1:8001/admin/`

---

## API Endpoints & Documentation

### FastAPI
- **REST API Docs (Swagger):** http://127.0.0.1:8000/docs
- **Alternative Docs (ReDoc):** http://127.0.0.1:8000/redoc
- **Login Page:** http://127.0.0.1:8000/api/auth/login-page
- **Health Check:** http://127.0.0.1:8000/health
- **System Stats:** http://127.0.0.1:8000/stats

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user profile (protected)

### Django Admin
- **Users:** http://127.0.0.1:8001/admin/auth/user/
- **Backend Users:** http://127.0.0.1:8001/admin/admin_users/portaluser/
- **Roles:** http://127.0.0.1:8001/admin/admin_users/role/
- **Permissions:** http://127.0.0.1:8001/admin/admin_users/rolepermission/
- **User Roles:** http://127.0.0.1:8001/admin/admin_users/userrole/
- **Profiles:** http://127.0.0.1:8001/admin/admin_users/profile/

---

## Troubleshooting

### Port Already in Use

```
OSError: [Errno 48] Address already in use
```

Set different ports:
```powershell
$env:PORT = "8888"
$env:DJANGO_ADMIN_PORT = "8889"
.\start-all.ps1
```

### PostgreSQL Connection Error

```
psycopg2.OperationalError: connection to server at "localhost", port 5432 failed
```

**Verify PostgreSQL is running:**
```bash
psql -U postgres -c "SELECT 1;"
```

### Missing Dependencies

```
ModuleNotFoundError: No module named 'fastapi'
```

Reinstall dependencies:
**Windows:**
```powershell
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

**macOS / Linux:**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Database Missing

```
psycopg2.OperationalError: database "academic_rag" does not exist
```

Create it:
```bash
psql -U postgres -c "CREATE DATABASE academic_rag;"
```

Then run migrations:
```bash
python migrate.py
```

---

## Frontend Integration

Once backend is running at `http://127.0.0.1:8000`, start the frontend:

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will be at: `http://localhost:3000`

The frontend automatically connects to the backend via the API client in `lib/api.ts`.

---

## Architecture Notes

- **FastAPI (Port 8000):** REST API, user authentication, RAG pipeline
- **Django Admin (Port 8001):** User management, role/permission administration
- **Both services** share the same PostgreSQL database with unmanaged models to prevent ORM conflicts
- **Password hashing:** Upgraded from passlib to pwdlib with Argon2 for modern security

---

## Development Tips

- **Auto-reload:** Files are monitored; changes trigger automatic restarts
- **Logs:** Check console output for errors and debugging info
- **API Docs:** Visit http://127.0.0.1:8000/docs for interactive API documentation
- **Debug mode:** Set `DEBUG=True` in `.env` for detailed error messages
