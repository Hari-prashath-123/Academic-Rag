# Academic-Rag

Project is now split into two folders:

- `frontend/` - Next.js application
- `backend/` - FastAPI API with local PostgreSQL

## Run Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs on `http://localhost:3000`.

## Run Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -c "from models import init_db; init_db()"
python manage.py runserver 0.0.0.0:8000
```

Backend runs on `http://localhost:8000`.