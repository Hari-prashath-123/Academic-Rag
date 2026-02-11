"""
Configuration module for the Academic RAG Assistant
"""
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = os.getenv("APP_NAME", "Academic RAG Assistant")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    # Perplexity (used for generation)
    PERPLEXITY_API_KEY: str = os.getenv("PERPLEXITY_API_KEY", "")
    PERPLEXITY_MODEL: str = os.getenv("PERPLEXITY_MODEL", "sonar")
    PERPLEXITY_BASE_URL: str = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")
    
    # Mistral (Alternative)
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-medium")
    
    # Vector Store
    FAISS_INDEX_PATH: str = os.getenv("FAISS_INDEX_PATH", "./vectorstore/faiss_index")
    VECTOR_DIMENSION: int = int(os.getenv("VECTOR_DIMENSION", "1536"))
    
    # File Upload
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "10485760"))  # 10MB
    ALLOWED_EXTENSIONS_RAW: str = os.getenv("ALLOWED_EXTENSIONS", "pdf,docx,xlsx,pptx")
    UPLOAD_FOLDER: str = os.getenv("UPLOAD_FOLDER", "./uploads")
    
    # RAG Configuration
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))
    TOP_K_RESULTS: int = int(os.getenv("TOP_K_RESULTS", "5"))
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.7"))
    
    # OBE Configuration
    PASSING_THRESHOLD: int = int(os.getenv("PASSING_THRESHOLD", "40"))
    CO_ATTAINMENT_THRESHOLD: int = int(os.getenv("CO_ATTAINMENT_THRESHOLD", "50"))
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "./logs/app.log")
    
    class Config:
        case_sensitive = True
        env_file = ".env"

    @property
    def ALLOWED_EXTENSIONS(self) -> List[str]:
        return [s.strip() for s in self.ALLOWED_EXTENSIONS_RAW.split(",") if s.strip()]

# Create settings instance
settings = Settings()

# Ensure required directories exist
Path(settings.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
Path(settings.FAISS_INDEX_PATH).mkdir(parents=True, exist_ok=True)
Path(os.path.dirname(settings.LOG_FILE)).mkdir(parents=True, exist_ok=True)
