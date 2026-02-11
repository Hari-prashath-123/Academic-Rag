"""
Main FastAPI application
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time

from config import settings
from models import init_db
from utils.logger import log

# Import routers
from routes import auth, documents, rag, obe, qp

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events for FastAPI application
    """
    # Startup
    log.info("Starting Academic RAG Assistant API")
    log.info(f"Environment: {settings.APP_ENV}")
    log.info(f"Debug mode: {settings.DEBUG}")
    
    # Initialize database
    try:
        init_db()
        log.info("Database initialized successfully")
    except Exception as e:
        log.error(f"Error initializing database: {e}")
    
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
    log.info(f"Incoming request: {request.method} {request.url.path}")
    
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
    log.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    
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
    log.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    
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
    """
    Root endpoint - API information
    """
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
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
        log.error(f"Error getting stats: {e}")
        return {"error": "Unable to retrieve stats"}
    
    finally:
        db.close()

# Include routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(rag.router)
app.include_router(obe.router)
app.include_router(qp.router)

# Run with: uvicorn app:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    
    log.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
