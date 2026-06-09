import enum
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import UserRole
from app.services.encryption import EncryptedText


class SharingCategory(str, enum.Enum):
    JOURNAL = "JOURNAL"
    AI_SUMMARY = "AI_SUMMARY"
    TRENDS = "TRENDS"
    MOOD = "MOOD"
    CRISIS = "CRISIS"


class ReportAudience(str, enum.Enum):
    USER = "USER"
    PSYCHOLOGIST = "PSYCHOLOGIST"
    COMPANY = "COMPANY"


class JournalEntry(Base):
    __tablename__ = "bergmann_journal_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(EncryptedText(), nullable=False)
    entry_type: Mapped[str] = mapped_column(String(32), default="REFLECTION", nullable=False)
    tags_json: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    user = relationship("User", back_populates="journal_entries")


class EmotionLog(Base):
    __tablename__ = "bergmann_emotion_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False)
    mood: Mapped[str] = mapped_column(String(48), nullable=False)
    emotions_json: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    intensity: Mapped[int] = mapped_column(Integer, nullable=False)
    energy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    anxiety: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stress: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_quality: Mapped[int | None] = mapped_column(Integer, nullable=True)
    motivation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    user = relationship("User", back_populates="emotion_logs")


class UserSharingConsent(Base):
    __tablename__ = "bergmann_user_sharing_consents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_user_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    categories_json: Mapped[str] = mapped_column(EncryptedText(), nullable=False)
    summary_only: Mapped[bool] = mapped_column(default=True, nullable=False)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", foreign_keys=[owner_user_id], back_populates="sharing_consents")
    target = relationship("User", foreign_keys=[target_user_id])


class EmotionalReport(Base):
    __tablename__ = "bergmann_emotional_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False)
    audience: Mapped[ReportAudience] = mapped_column(Enum(ReportAudience), nullable=False)
    summary: Mapped[str] = mapped_column(EncryptedText(), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), default="LOW", nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)


class NR1Report(Base):
    __tablename__ = "bergmann_nr1_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    company_user_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    participant_count: Mapped[int] = mapped_column(Integer, nullable=False)
    suppressed: Mapped[bool] = mapped_column(default=True, nullable=False)
    summary: Mapped[str] = mapped_column(EncryptedText(), nullable=False)
    indicators_json: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
