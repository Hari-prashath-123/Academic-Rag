"""Advisor-student mapping models."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from models import Base


class AdvisorStudentMapping(Base):
    """Maps one faculty advisor to many student users."""

    __tablename__ = "advisor_student_mappings"
    __table_args__ = (UniqueConstraint("advisor_id", "student_id", name="uq_advisor_student"),)

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    advisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    advisor = relationship("User", foreign_keys=[advisor_id], back_populates="advisor_mappings")
    student = relationship("User", foreign_keys=[student_id], back_populates="student_mappings")

    def __repr__(self):
        return f"<AdvisorStudentMapping(advisor_id={self.advisor_id}, student_id={self.student_id})>"
