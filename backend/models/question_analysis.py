"""
QuestionAnalysis model to store parsed question-paper analyses
"""
from sqlalchemy import Column, String, DateTime, Float, Text, JSON, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from models import Base


class QuestionAnalysis(Base):
    __tablename__ = "question_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    question_number = Column(String, nullable=True)
    question_text = Column(Text, nullable=False)
    marks = Column(Float, nullable=True)
    co_mapping = Column(JSON)
    bloom_level = Column(String)
    unit = Column(String)
    difficulty = Column(String)
    analyzed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": str(self.id) if self.id else None,
            "document_id": str(self.document_id) if self.document_id else None,
            "question_number": self.question_number,
            "question_text": self.question_text,
            "marks": self.marks,
            "co_mapping": self.co_mapping,
            "bloom_level": self.bloom_level,
            "unit": self.unit,
            "difficulty": self.difficulty,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None
        }

    def __repr__(self):
        return f"<QuestionAnalysis(id={self.id}, document_id={self.document_id}, q={self.question_number})>"
