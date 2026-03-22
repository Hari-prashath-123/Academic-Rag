# Backend Startup Guide

## Prerequisites

1. **PostgreSQL** running locally on `localhost:5432`
2. **Python 3.12+** with virtual environment activated: `venv\Scripts\activate`
3. **Dependencies installed**: `pip install -r requirements.txt`

## Environment Setup

Create a `.env` file in the `backend/` directory with:

```env
# Application
APP_ENV=development
DEBUG=True
LOG_LEVEL=INFO

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
CORS_ORIGINS_RAW=http://localhost:3000,http://localhost:8000

# OpenAI (for RAG features)
OPENAI_API_KEY=your-openai-api-key

# Embeddings
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## Startup Steps

### 1. PostgreSQL Running

Ensure PostgreSQL is running locally on `localhost:5432`. If using WSL/Linux:

```bash
sudo service postgresql start
```

Or verify via psql:

```bash
psql -U postgres -c "SELECT 1;"
```

### 2. Complete Database Setup (Recommended)

Run the comprehensive setup script that will:
- Create the database if it doesn't exist
- Run all migrations
- Seed default roles (student, faculty, admin)

```bash
cd backend
python setup_db.py
```

**OR** manually run migrations (if database already exists):

```bash
python migrate.py
```

### 3. Create Superuser (Admin Account)

```bash
python create_superuser.py
```

You will be prompted to enter:
- Email address
- Password (min 6 characters)

The script will:
- Create a User account
- Create an associated Profile
- Create/assign the 'admin' role
- Grant all permissions

**Or use environment variables:**

```bash
CREATE_SUPERUSER_EMAIL=admin@example.com CREATE_SUPERUSER_PASSWORD=password123 python create_superuser.py
```

### 4. Start Backend Server

```bash
python manage.py runserver
```

Or with custom host/port:

```bash
python manage.py runserver 127.0.0.1:8000
```

The server will start at: `http://127.0.0.1:8000`

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
  - Request: `{ email, password, first_name, last_name, phone, default_role }`
  - Response: `{ access_token, token_type }`

- `POST /api/auth/login` - Login user
  - Request: `{ email, password }`
  - Response: `{ access_token, token_type }`

- `GET /api/auth/me` - Get current user (protected)
  - Response: `{ id, email, roles, permissions, profile, created_at }`

### Document Endpoints

- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/{id}` - Get document
- `DELETE /api/documents/{id}` - Delete document

### RAG Endpoints

- `POST /api/rag/query` - Query documents with RAG

## Troubleshooting

### Missing Database

```
psycopg2.OperationalError: database "academic_rag" does not exist
```

**Solution 1:** Use the setup_db.py script (recommended):
```bash
python setup_db.py
```

**Solution 2:** Create manually:
```bash
psql -U postgres -c "CREATE DATABASE academic_rag;"
```

### Migration Errors

If migrations fail, common issues:

1. **Database doesn't exist**: Use `python setup_db.py`
2. **Connection refused**: Ensure PostgreSQL is running (see below)
3. **Tables already exist**: Re-run `python migrate.py` - migrations are idempotent (IF NOT EXISTS)

### Connection Refused (PostgreSQL)

```
Error: could not translate host name "localhost" to address: Name or service not known
```

**Solution:** Ensure PostgreSQL is running:
```bash
# Windows (native PostgreSQL)
services.msc  # Search for PostgreSQL service and start it

# WSL/Linux
sudo service postgresql start

# Or verify connection
psql -U postgres -c "SELECT 1;"
```

### Import Errors

If you see `ModuleNotFoundError` or `ImportError`:

1. Ensure virtual environment is activated: `venv\Scripts\activate`
2. Reinstall dependencies: `pip install -r requirements.txt`
3. Check `backend/config.py` for environment variable issues

### Port Already in Use

```
OSError: [Errno 48] Address already in use
```

**Solution:** Kill the process using port 8000:
```bash
# Find process
netstat -ano | findstr :8000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use different port
python manage.py runserver 8001
```

## Frontend Integration

Once backend is running at `http://127.0.0.1:8000`, start the frontend:

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will be at: `http://localhost:3000`

The frontend automatically connects to the backend via the API client in `lib/api.ts`.

## Database Migrations

### Auto-running Migrations

Migrations in `migrations/` directory are automatically run on backend startup via `migrate.py`.

### Manual Migration

```bash
python migrate.py
```

### Creating New Migrations

1. Update model in `models/`
2. Add SQL migration file to `migrations/` with format: `NNN_description.sql`
3. Restart backend to auto-run

## Development Tips

- **Watch mode**: Backend auto-reloads on file changes
- **Logs**: Check `logs/` directory for server logs
- **API docs**: Visit `http://127.0.0.1:8000/docs` for Swagger UI
- **Debug mode**: Set `DEBUG=True` in `.env`
