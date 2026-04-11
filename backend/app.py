"""
Main FastAPI application
"""
import os
import django

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.wsgi import WSGIMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
import time
from django.core.wsgi import get_wsgi_application
from django.conf import settings as django_settings
from django.contrib.staticfiles.handlers import StaticFilesHandler

from config import settings
from models import engine
from utils.logger import log

# Import routers
from routes import auth, documents, rag, obe, qp, users, advisor_mapping, course_materials


def check_sqlalchemy_connection() -> None:
    """Verify PostgreSQL connectivity using SQLAlchemy engine."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def get_psycopg2_connection():
    """Optional raw psycopg2 connection boilerplate."""
    try:
        import psycopg2
    except ImportError:
        return None

    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASS,
        dbname=settings.DB_NAME,
    )

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events for FastAPI application
    """
    # Startup
    log.info("Starting Academic RAG Assistant API")
    log.info("Environment: {}", settings.APP_ENV)
    log.info("Debug mode: {}", settings.DEBUG)
    
    # Validate database connectivity (schema managed via migrations)
    try:
        # SQLAlchemy ORM connectivity check
        check_sqlalchemy_connection()
        log.info("PostgreSQL connection via SQLAlchemy is healthy")
        log.info("Database schema initialization is managed by migrate.py")

        # Optional raw psycopg2 connectivity check
        raw_conn = get_psycopg2_connection()
        if raw_conn:
            try:
                with raw_conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                log.info("PostgreSQL connection via psycopg2 is healthy")
            finally:
                raw_conn.close()
        else:
            log.info("psycopg2 not installed; skipped raw SQL connection check")
    except Exception as e:
        log.error("Error initializing database: {}", e)
    
    yield
    
    # Shutdown
    log.info("Shutting down Academic RAG Assistant API")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="RAG-Powered Academic Knowledge Assistant for Outcome-Based Education (OBE)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log all incoming requests and their processing time
    """
    start_time = time.time()
    
    # Log request
    log.info("Incoming request: {} {}", request.method, request.url.path)
    
    # Process request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log response
    log.info(
        f"Completed: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    # Add custom header
    response.headers["X-Process-Time"] = str(process_time)
    
    return response

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors
    """
    log.warning("Validation error on {}: {}", request.url.path, exc.errors())
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle general exceptions
    """
    log.opt(exception=exc).error("Unhandled exception on {}", request.url.path)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An error occurred"
        }
    )

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Redirect backend root to login page."""
    return RedirectResponse(url="/api/auth/login-page", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@app.get("/api-info", tags=["Root"])
async def api_info():
    """API information endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "backend_login_page": "/api/auth/login-page",
        "environment": settings.APP_ENV
    }

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "timestamp": time.time()
    }

# System stats endpoint
@app.get("/stats", tags=["System"])
async def system_stats():
    """
    Get system statistics
    """
    from models import get_db
    from models.user import User
    from models.document import Document
    from models.query import Query
    
    db = next(get_db())
    
    try:
        stats = {
            "users": db.query(User).count(),
            "documents": db.query(Document).filter(Document.is_deleted == False).count(),
            "queries": db.query(Query).count(),
            "indexed_documents": db.query(Document).filter(
                Document.indexing_status == "completed"
            ).count()
        }
        
        return stats
    
    except Exception as e:
        log.error("Error getting stats: {}", e)
        return {"error": "Unable to retrieve stats"}
    
    finally:
        db.close()

# Include routers
app.include_router(auth.router)
app.include_router(auth.accounts_router)
app.include_router(documents.router)
app.include_router(rag.router)
app.include_router(obe.router)
app.include_router(qp.router)
app.include_router(users.router)
app.include_router(advisor_mapping.router)
app.include_router(course_materials.router)

# Mount Django after FastAPI routes so /api endpoints keep priority, while Django handles /admin and /static.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_portal.settings")
django.setup()
django_wsgi_app = get_wsgi_application()
if django_settings.DEBUG:
    django_wsgi_app = StaticFilesHandler(django_wsgi_app)
app.mount("/", WSGIMiddleware(django_wsgi_app))

# Run with: uvicorn app:app --host 0.0.0.0 --port 8000 --reload
if __name__ == "__main__":
    import uvicorn
    
    log.info("Starting server on {}:{}", settings.HOST, settings.PORT)
    
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
