# Quick Start Guide - Academic RAG Backend

## 1. Configure Environment

From the backend folder:

```bash
copy .env.example .env
```

Set local PostgreSQL credentials in `.env`. Default example uses:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/Academic-rag
```

## 2. Install Dependencies

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Initialize Database

```bash
python -c "from models import init_db; init_db()"
```

## 4. Start Backend

Use Django-style command naming:

```bash
python manage.py runserver 0.0.0.0:8000
```

Or use helper scripts:

```bash
start.bat
```

## 5. Verify

- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

Full interactive documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🎉 You're All Set!

Your Academic RAG backend is ready for production use. Start by registering a user and uploading documents!

**Happy Coding! 🚀**
