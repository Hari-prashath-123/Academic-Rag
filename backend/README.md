# Academic RAG Backend

Backend API for the Academic RAG project.

## Stack

- Framework: FastAPI
- Database: Local PostgreSQL
- ORM: SQLAlchemy
- Vector Store: FAISS

## Local Setup

1. Create and activate a virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env` and update credentials.
4. Start the backend with `runserver` command style.

### Windows

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -c "from models import init_db; init_db()"
python manage.py runserver 0.0.0.0:8000
```

### Linux / macOS

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -c "from models import init_db; init_db()"
python manage.py runserver 0.0.0.0:8000
```

### Convenience Scripts

- Windows: `start.bat`
- Linux/macOS: `./start.sh`

## Important Environment Variables

- `DATABASE_URL`: local PostgreSQL SQLAlchemy URL
- `OPENAI_API_KEY`: LLM key
- `SECRET_KEY`: JWT signing key
- `CORS_ORIGINS`: frontend origins (default `http://localhost:3000`)

## API URLs

- API root: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
