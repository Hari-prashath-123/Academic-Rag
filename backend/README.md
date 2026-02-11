# Academic RAG Backend

Production-ready backend for RAG-Powered Academic Knowledge Assistant for Outcome-Based Education (OBE).

## Features

- 🔐 **JWT Authentication** - Role-based access (Student, Faculty, Admin)
- 📄 **Document Processing** - Upload and index PDF, DOCX, XLSX, PPTX files
- 🤖 **RAG Query System** - AI-powered chat with document context
- 📊 **OBE Analytics** - CO attainment, Bloom's taxonomy analysis
- 📝 **Question Paper Intelligence** - Automated QP analysis and mapping

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL (via Supabase)
- **Vector Store**: FAISS
- **LLM**: OpenAI GPT-4
- **Embeddings**: OpenAI text-embedding-3-small
- **ORM**: SQLAlchemy
- **Document Processing**: PyPDF, python-docx, pandas
- **RAG**: LangChain

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- Database URL (Supabase PostgreSQL)
- OpenAI API key
- JWT secret key
- CORS origins

### 3. Initialize Database

```bash
python -c "from models import init_db; init_db()"
```

### 4. Run Server

```bash
# Development
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

API will be available at: `http://localhost:8000`

Documentation: `http://localhost:8000/docs`

## Project Structure

```
backend/
├── app.py                 # Main FastAPI application
├── config.py              # Configuration and settings
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
│
├── models/               # Database models
│   ├── __init__.py
│   ├── user.py           # User model (auth)
│   ├── document.py       # Document model
│   ├── query.py          # Query/chat history model
│   └── mark.py           # Marks/assessment model
│
├── routes/               # API routes
│   ├── auth.py           # Authentication endpoints
│   ├── documents.py      # Document upload/management
│   ├── rag.py            # RAG query endpoints
│   ├── obe.py            # OBE analytics endpoints
│   └── qp.py             # Question paper analysis
│
├── services/             # Business logic
│   ├── document_loader.py     # Document text extraction
│   ├── embeddings.py          # Vector embeddings service
│   ├── rag_pipeline.py        # RAG retrieval pipeline
│   ├── obe_analytics.py       # OBE calculations
│   └── qp_analyzer.py         # Question paper analysis
│
├── utils/                # Utilities
│   ├── auth.py           # JWT and password utilities
│   ├── schemas.py        # Pydantic schemas
│   ├── logger.py         # Logging configuration
│   └── helpers.py        # Helper functions
│
├── uploads/              # Uploaded files storage
└── vectorstore/          # FAISS vector index storage
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user profile

### Documents
- `POST /documents/upload` - Upload document
- `GET /documents/` - List documents
- `GET /documents/{id}` - Get document details
- `DELETE /documents/{id}` - Delete document
- `POST /documents/{id}/reindex` - Re-index document

### RAG Query
- `POST /rag/query` - Query documents with AI
- `GET /rag/history` - Get query history
- `GET /rag/sessions` - Get chat sessions
- `DELETE /rag/sessions/{id}` - Clear session

### OBE Analytics
- `POST /obe/marks` - Add student marks
- `GET /obe/marks` - Get marks
- `POST /obe/co-attainment` - Calculate CO attainment
- `POST /obe/bloom-mapping` - Get Bloom's distribution
- `POST /obe/generate-report` - Generate OBE report
- `GET /obe/student-performance/{id}` - Student performance

### Question Paper
- `POST /qp/analyze` - Analyze question paper
- `POST /qp/map-cos/{id}` - Map questions to COs
- `GET /qp/compare` - Compare question papers

## Usage Examples

### 1. Register and Login

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "faculty"
  }'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 2. Upload Document

```bash
curl -X POST http://localhost:8000/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@syllabus.pdf" \
  -F "title=Data Structures Syllabus" \
  -F "subject=Data Structures" \
  -F "document_type=syllabus"
```

### 3. Query with RAG

```bash
curl -X POST http://localhost:8000/rag/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "What are the topics covered in Unit 3?",
    "subject": "Data Structures"
  }'
```

### 4. Calculate CO Attainment

```bash
curl -X POST http://localhost:8000/obe/co-attainment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Data Structures",
    "semester": "Fall 2024"
  }'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `SECRET_KEY` | JWT secret key | - |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration time | 30 |
| `CHUNK_SIZE` | Text chunk size for RAG | 1000 |
| `CHUNK_OVERLAP` | Chunk overlap size | 200 |
| `TOP_K_RESULTS` | Number of results in RAG | 5 |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:3000 |

## Database Schema

### Users
- `id`, `name`, `email`, `password_hash`, `role`, `created_at`, `updated_at`

### Documents
- `id`, `title`, `subject`, `document_type`, `file_path`, `uploaded_by`, `indexing_status`, `chunk_count`

### Queries
- `id`, `user_id`, `query`, `response`, `sources`, `timestamp`, `session_id`

### Marks
- `id`, `student_id`, `subject`, `assessment_type`, `marks_obtained`, `max_marks`, `co_mapping`, `bloom_level`

## Development

### Run Tests
```bash
pytest
```

### Format Code
```bash
black .
isort .
```

### Type Checking
```bash
mypy .
```

## Production Deployment

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using Gunicorn

```bash
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License

## Support

For issues and questions, please create an issue in the repository.
