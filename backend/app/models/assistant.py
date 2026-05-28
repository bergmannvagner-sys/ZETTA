import enum
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CareReminderCategory(str, enum.Enum):
    WATER = "WATER"
    PAUSE = "PAUSE"
    BREATHING = "BREATHING"
    REST = "REST"
    ROUTINE = "ROUTINE"
    CUSTOM = "CUSTOM"


class CareReminder(Base):
    __tablename__ = "bergmann_care_reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[CareReminderCategory] = mapped_column(Enum(CareReminderCategory), nullable=False)
    cadence: Mapped[str] = mapped_column(String(32), default="DAILY", nullable=False)
    time_local: Mapped[str | None] = mapped_column(String(5), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User", back_populates="care_reminders")
