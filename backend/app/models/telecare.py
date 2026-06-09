from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.services.encryption import EncryptedText


class TelecareSession(Base):
    __tablename__ = "bergmann_telecare_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    requester_user_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider_user_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider_role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="REQUESTED", index=True, nullable=False)
    room_code: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    daily_room_name: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    daily_room_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    daily_room_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    session_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    platform_fee_bps: Mapped[int] = mapped_column(Integer, nullable=False)
    platform_fee_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    provider_payout_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)
    notes: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    requester = relationship("User", foreign_keys=[requester_user_id])
    provider = relationship("User", foreign_keys=[provider_user_id])
