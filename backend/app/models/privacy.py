import enum
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ConsentType(str, enum.Enum):
    LGPD_MVP = "LGPD_MVP"


class ConsentRecord(Base):
    __tablename__ = "bergmann_consent_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("bergmann_users.id", ondelete="CASCADE"), nullable=False)
    consent_type: Mapped[ConsentType] = mapped_column(Enum(ConsentType), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="consent_records")


class AuditAction(str, enum.Enum):
    USER_REGISTERED = "USER_REGISTERED"
    USER_LOGIN = "USER_LOGIN"
    TOKEN_REFRESHED = "TOKEN_REFRESHED"
    CONSENT_ACCEPTED = "CONSENT_ACCEPTED"
    CHAT_MESSAGE_CREATED = "CHAT_MESSAGE_CREATED"
    SOS_EVENT_CREATED = "SOS_EVENT_CREATED"
    ACCOUNT_APPROVED = "ACCOUNT_APPROVED"
    ACCOUNT_REJECTED = "ACCOUNT_REJECTED"
    JOURNAL_ENTRY_CREATED = "JOURNAL_ENTRY_CREATED"
    EMOTION_LOG_CREATED = "EMOTION_LOG_CREATED"
    SHARING_CONSENT_GRANTED = "SHARING_CONSENT_GRANTED"
    SHARING_CONSENT_REVOKED = "SHARING_CONSENT_REVOKED"
    EMOTIONAL_REPORT_CREATED = "EMOTIONAL_REPORT_CREATED"
    NR1_REPORT_VIEWED = "NR1_REPORT_VIEWED"
    CARE_REMINDER_CREATED = "CARE_REMINDER_CREATED"
    CARE_REMINDER_COMPLETED = "CARE_REMINDER_COMPLETED"
    SUBSCRIPTION_STATUS_UPDATED = "SUBSCRIPTION_STATUS_UPDATED"


class AuditLog(Base):
    __tablename__ = "bergmann_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    actor_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="SET NULL"), nullable=True
    )
    target_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    actor = relationship("User", foreign_keys=[actor_user_id])
    target = relationship("User", foreign_keys=[target_user_id])
