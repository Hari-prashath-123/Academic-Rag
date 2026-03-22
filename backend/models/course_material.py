"""Course and course-material models for course-wise uploads."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from models import Base


class MaterialType(str, enum.Enum):
    """Allowed course material types."""

    pdf = "pdf"
    notes = "notes"
    question_paper = "question_paper"


class Course(Base):
    """Academic course master."""

    __tablename__ = "courses"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    semester = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_by_user = relationship("User", back_populates="created_courses")
    materials = relationship("CourseMaterial", back_populates="course", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Course(code={self.code}, name={self.name})>"


class CourseMaterial(Base):
    """Uploaded course material (pdf, notes, question paper)."""

    __tablename__ = "course_materials"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    material_type = Column(SQLEnum(MaterialType), nullable=False, index=True)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

    course = relationship("Course", back_populates="materials")
    uploader = relationship("User", back_populates="uploaded_course_materials")

    def __repr__(self):
        return f"<CourseMaterial(title={self.title}, material_type={self.material_type})>"
