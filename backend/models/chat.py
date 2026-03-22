"""Chat history model for conversational sessions."""
from datetime import datetime
import enum

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from models import Base


class MessageRole(str, enum.Enum):
    """Allowed message roles."""

    USER = "user"
    ASSISTANT = "assistant"


class ChatHistory(Base):
    """Chat message persisted per user session."""

    __tablename__ = "chat_history"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)
    message_role = Column(SQLEnum(MessageRole), nullable=False)
    message_content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="chat_messages")

    def __repr__(self):
        return f"<ChatHistory(id={self.id}, user_id={self.user_id}, session_id={self.session_id})>"
