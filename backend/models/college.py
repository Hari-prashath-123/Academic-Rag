"""
College model for multi-college support
"""
from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from models import Base


class College(Base):
    """College model"""
    __tablename__ = "colleges"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": str(self.id) if self.id is not None else None,
            "name": self.name,
            "code": self.code,
            "address": self.address,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<College(id={self.id}, code={self.code}, name={self.name})>"
