# 🚀 Quick Start Guide - Academic RAG Backend

## Overview

Your production-ready backend for the RAG-Powered Academic Knowledge Assistant has been successfully created! This guide will help you get started.

## 📁 What's Been Created

```
backend/
├── 📄 Configuration Files
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment template
│   ├── config.py             # App configuration
│   └── .gitignore            # Git ignore rules
│
├── 🗄️ Database Models (models/)
│   ├── user.py               # User authentication
│   ├── document.py           # Document metadata
│   ├── query.py              # Chat history
│   └── mark.py               # Student marks/assessments
│
├── 🛣️ API Routes (routes/)
│   ├── auth.py               # POST /auth/register, /auth/login
│   ├── documents.py          # POST /documents/upload
│   ├── rag.py                # POST /rag/query
│   ├── obe.py                # POST /obe/co-attainment
│   └── qp.py                 # POST /qp/analyze
│
├── ⚙️ Services (services/)
│   ├── document_loader.py    # PDF, DOCX, XLSX extraction
│   ├── embeddings.py         # FAISS vector store
│   ├── rag_pipeline.py       # LangChain RAG pipeline
│   ├── obe_analytics.py      # CO attainment calculations
│   └── qp_analyzer.py        # Question paper AI analysis
│
├── 🔧 Utilities (utils/)
│   ├── auth.py               # JWT & password hashing
│   ├── schemas.py            # Pydantic models
│   ├── logger.py             # Logging setup
│   └── helpers.py            # Helper functions
│
└── 🚀 Startup Files
    ├── app.py                # Main FastAPI app
    ├── start.bat             # Windows startup script
    └── start.sh              # Linux/Mac startup script
```

## ⚡ 5-Minute Setup

### Step 1: Configure Environment

1. Copy the environment template:
   ```bash
   cd backend
   copy .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```env
   # Required - Get from Supabase
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-key
   
   # Required - Get from OpenAI
   OPENAI_API_KEY=sk-your-key-here
   
   # Required - Generate random secret
   SECRET_KEY=your-super-secret-jwt-key
   
   # Optional - Frontend URL
   CORS_ORIGINS=http://localhost:3000
   ```

### Step 2: Install Dependencies

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Initialize Database

```bash
python -c "from models import init_db; init_db()"
```

### Step 4: Start Server

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Or manually:**
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Step 5: Test API

Open browser to:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🔑 Getting API Keys

### Supabase Database

1. Go to https://supabase.com and create account
2. Create new project
3. Go to Settings → Database
4. Copy connection string:
   ```
   postgresql://postgres:[password]@[host]:5432/postgres
   ```
5. Replace in `.env` as `DATABASE_URL`

### OpenAI API

1. Go to https://platform.openai.com
2. Create account / Login
3. Go to API Keys
4. Create new secret key
5. Copy to `.env` as `OPENAI_API_KEY`

### JWT Secret

Generate random secret:
```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or use any random string generator
```

## 📚 API Testing Examples

### 1. Register User

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "faculty"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Copy the `access_token` from response.

### 3. Upload Document

```bash
curl -X POST http://localhost:8000/documents/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@document.pdf" \
  -F "title=Data Structures Notes" \
  -F "subject=Data Structures" \
  -F "document_type=lecture_notes"
```

### 4. Query with AI

```bash
curl -X POST http://localhost:8000/rag/query \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "What is a binary tree?",
    "subject": "Data Structures"
  }'
```

## 🎯 Key Features Implemented

### ✅ Authentication System
- JWT-based authentication
- Role-based access control (Student, Faculty, Admin)
- Password hashing with bcrypt
- Token expiration management

### ✅ Document Processing
- Multi-format support (PDF, DOCX, XLSX, PPTX)
- Asynchronous processing
- Text extraction and chunking
- FAISS vector indexing
- Document metadata storage

### ✅ RAG Query System
- Context-aware AI responses
- Source citations with page numbers
- Conversational memory
- Subject and document type filtering
- Query history tracking

### ✅ OBE Analytics
- CO (Course Outcome) attainment calculation
- Pass percentage analysis
- Bloom's taxonomy distribution
- Student performance tracking
- Assessment type analysis
- Comprehensive report generation

### ✅ Question Paper Intelligence
- Automatic question extraction
- CO mapping inference
- Bloom's level detection
- Marks distribution analysis
- Unit-wise coverage
- Difficulty level classification
- Multi-paper comparison

## 🔧 Troubleshooting

### Database Connection Error
```
Error: Could not connect to database
```
**Solution:** Check `DATABASE_URL` in `.env`. Ensure Supabase project is running.

### OpenAI API Error
```
Error: Invalid API key
```
**Solution:** Verify `OPENAI_API_KEY` in `.env`. Check OpenAI account has credits.

### Port Already in Use
```
Error: Address already in use
```
**Solution:** Change port in config or kill process using port 8000:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Import Errors
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solution:** Ensure virtual environment is activated and dependencies are installed:
```bash
pip install -r requirements.txt
```

### FAISS Index Error
```
Error: FAISS index not found
```
**Solution:** The index is created automatically on first document upload. Ensure `vectorstore/` directory exists.

## 📊 Database Schema

The following tables are automatically created:

- **users**: User accounts with roles
- **documents**: Uploaded document metadata
- **queries**: RAG query history
- **marks**: Student assessment data

## 🔐 Security Best Practices

1. **Never commit `.env`** - It's already in `.gitignore`
2. **Use strong JWT secret** - Generate with `secrets.token_urlsafe(32)`
3. **Rotate API keys** - Change OpenAI keys periodically
4. **Use HTTPS in production** - Never use HTTP for sensitive data
5. **Set CORS properly** - Only allow trusted origins
6. **Validate file uploads** - Max size and type restrictions are in place

## 🚀 Production Deployment

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t academic-rag-backend .
docker run -p 8000:8000 --env-file .env academic-rag-backend
```

### Using Render/Railway/Heroku

1. Push code to GitHub
2. Connect repository to platform
3. Add environment variables
4. Deploy!

### Performance Optimization

- Use Gunicorn with multiple workers:
  ```bash
  gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker
  ```
- Enable caching for FAISS searches
- Use Redis for session storage
- Set up CDN for file uploads

## 📈 Next Steps

1. **Test all endpoints** - Use Swagger UI at `/docs`
2. **Upload sample documents** - Test document processing
3. **Try RAG queries** - Test AI responses
4. **Add student marks** - Test OBE analytics
5. **Analyze question papers** - Test QP intelligence
6. **Connect frontend** - Update CORS settings

## 🆘 Support

For issues:
1. Check logs in `logs/app.log`
2. Enable DEBUG mode in `.env`
3. Review API documentation at `/docs`
4. Check database connection
5. Verify API keys are valid

## 📝 API Documentation

Full interactive documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🎉 You're All Set!

Your Academic RAG backend is ready for production use. Start by registering a user and uploading documents!

**Happy Coding! 🚀**
