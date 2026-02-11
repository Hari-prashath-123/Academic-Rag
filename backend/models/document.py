"""
Document model for uploaded files and their metadata
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from models import Base

class DocumentType(str, enum.Enum):
    """Document type enumeration"""
    SYLLABUS = "syllabus"
    QUESTION_PAPER = "question_paper"
    MARKSHEET = "marksheet"
    CO_MAPPING = "co_mapping"
    LECTURE_NOTES = "lecture_notes"
    ASSIGNMENT = "assignment"
    LAB_MANUAL = "lab_manual"
    OTHER = "other"

class IndexingStatus(str, enum.Enum):
    """Indexing status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class Document(Base):
    """Document model"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, index=True)
    document_type = Column(SQLEnum(DocumentType), nullable=False, index=True)
    file_path = Column(String, nullable=False)
    file_url = Column(String)
    file_size = Column(Integer)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    indexing_status = Column(SQLEnum(IndexingStatus), default=IndexingStatus.PENDING, nullable=False)
    indexed_at = Column(DateTime)
    chunk_count = Column(Integer, default=0)
    metadata = Column(Text)  # JSON string for additional metadata
    error_message = Column(Text)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    uploader = relationship("User", back_populates="documents")
    
    def __repr__(self):
        return f"<Document(id={self.id}, title={self.title}, type={self.document_type})>"
    
    def to_dict(self):
        """Convert document to dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "subject": self.subject,
            "document_type": self.document_type.value,
            "file_path": self.file_path,
            "file_url": self.file_url,
            "file_size": self.file_size,
            "uploaded_by": self.uploaded_by,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "indexing_status": self.indexing_status.value,
            "indexed_at": self.indexed_at.isoformat() if self.indexed_at else None,
            "chunk_count": self.chunk_count,
            "metadata": self.metadata,
            "error_message": self.error_message
        }
