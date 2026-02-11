"""
User model for authentication and authorization
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from models import Base

class UserRole(str, enum.Enum):
    """User role enumeration"""
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"

class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", back_populates="uploader", cascade="all, delete-orphan")
    queries = relationship("Query", back_populates="user", cascade="all, delete-orphan")
    marks = relationship("Mark", back_populates="student", foreign_keys="Mark.student_id")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
