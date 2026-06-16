from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.services.encryption import EncryptedText


class ChatSession(Base):
    __tablename__ = "bergmann_chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("bergmann_users.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(24), default="CHAT", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "bergmann_chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    sender: Mapped[str] = mapped_column(String(24), nullable=False)
    content: Mapped[str] = mapped_column(EncryptedText(), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(24), default="LOW", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    session = relationship("ChatSession", back_populates="messages")
