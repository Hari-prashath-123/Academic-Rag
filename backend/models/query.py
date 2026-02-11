"""
Query model for storing chat history and RAG queries
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from models import Base

class Query(Base):
    """Query model for chat history"""
    __tablename__ = "queries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    subject = Column(String)
    document_type = Column(String)
    sources = Column(JSON)  # List of source documents
    context_chunks = Column(JSON)  # Retrieved context chunks
    tokens_used = Column(Integer)
    response_time = Column(Integer)  # in milliseconds
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    session_id = Column(String, index=True)  # For conversational memory
    
    # Relationships
    user = relationship("User", back_populates="queries")
    
    def __repr__(self):
        return f"<Query(id={self.id}, user_id={self.user_id}, timestamp={self.timestamp})>"
    
    def to_dict(self):
        """Convert query to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "query": self.query,
            "response": self.response,
            "subject": self.subject,
            "document_type": self.document_type,
            "sources": self.sources,
            "context_chunks": self.context_chunks,
            "tokens_used": self.tokens_used,
            "response_time": self.response_time,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "session_id": self.session_id
        }
