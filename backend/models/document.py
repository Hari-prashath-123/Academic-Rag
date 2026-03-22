"""Document model for uploaded files and their metadata."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from models import Base


class DocumentType(str, enum.Enum):
    """Document type enumeration."""

    SYLLABUS = "syllabus"
    QUESTION_PAPER = "question_paper"
    MARKSHEET = "marksheet"
    CO_MAPPING = "co_mapping"
    LECTURE_NOTES = "lecture_notes"
    ASSIGNMENT = "assignment"
    LAB_MANUAL = "lab_manual"
    OTHER = "other"


class IndexingStatus(str, enum.Enum):
    """Indexing status enumeration."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base):
    """Document model."""

    __tablename__ = "documents"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    title = Column(String, nullable=False)
    subject = Column(String, index=True, nullable=True)
    document_type = Column(SQLEnum(DocumentType), nullable=False, index=True)
    file_path = Column(String, nullable=False)
    file_url = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    indexing_status = Column(SQLEnum(IndexingStatus), default=IndexingStatus.PENDING, nullable=False)
    indexed_at = Column(DateTime, nullable=True)
    chunk_count = Column(Integer, default=0)
    meta_json = Column(Text, nullable=True)  # JSON string for additional metadata
    error_message = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)

    # Relationships
    uploader = relationship("User", back_populates="documents")

    def __repr__(self):
        return f"<Document(id={self.id}, title={self.title}, type={self.document_type})>"

    def to_dict(self):
        """Convert document to dictionary."""
        return {
            "id": str(self.id),
            "title": self.title,
            "subject": self.subject,
            "document_type": self.document_type.value if self.document_type else None,
            "file_path": self.file_path,
            "file_url": self.file_url,
            "file_size": self.file_size,
            "uploader_id": str(self.uploader_id),
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "indexing_status": self.indexing_status.value if self.indexing_status else None,
            "indexed_at": self.indexed_at.isoformat() if self.indexed_at else None,
            "chunk_count": self.chunk_count,
            "metadata": self.meta_json,
            "error_message": self.error_message,
        }
