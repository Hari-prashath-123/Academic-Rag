"""
Mark model for storing student assessment marks and OBE analytics
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from models import Base

class AssessmentType(str, enum.Enum):
    """Assessment type enumeration"""
    CIA1 = "cia1"
    CIA2 = "cia2"
    SAA1 = "saa1"
    SAA2 = "saa2"
    ASSIGNMENT = "assignment"
    LAB = "lab"
    PROJECT = "project"
    QUIZ = "quiz"
    OTHER = "other"

class Mark(Base):
    """Mark model for student assessments"""
    __tablename__ = "marks"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String, nullable=False, index=True)
    assessment_type = Column(SQLEnum(AssessmentType), nullable=False, index=True)
    assessment_name = Column(String)
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False)
    co_mapping = Column(JSON)  # Mapping to Course Outcomes
    bloom_level = Column(String)  # Bloom's taxonomy level
    unit = Column(String)
    question_number = Column(String)
    semester = Column(String, index=True)
    academic_year = Column(String, index=True)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", back_populates="marks", foreign_keys=[student_id])
    
    def __repr__(self):
        return f"<Mark(id={self.id}, student_id={self.student_id}, subject={self.subject})>"
    
    def to_dict(self):
        """Convert mark to dictionary"""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "subject": self.subject,
            "assessment_type": self.assessment_type.value,
            "assessment_name": self.assessment_name,
            "marks_obtained": self.marks_obtained,
            "max_marks": self.max_marks,
            "percentage": (self.marks_obtained / self.max_marks * 100) if self.max_marks > 0 else 0,
            "co_mapping": self.co_mapping,
            "bloom_level": self.bloom_level,
            "unit": self.unit,
            "question_number": self.question_number,
            "semester": self.semester,
            "academic_year": self.academic_year,
            "recorded_by": self.recorded_by,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
