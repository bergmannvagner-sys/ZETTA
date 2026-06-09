from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BillingWebhookEvent(Base):
    __tablename__ = "bergmann_billing_webhook_events"
    __table_args__ = (
        UniqueConstraint("provider", "event_id", name="uq_bergmann_billing_webhook_events_provider_event"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    provider: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    event_id: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    account_reference_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    linked_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bergmann_users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    subscription_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    external_status: Mapped[str | None] = mapped_column(String(80), nullable=True)
    processing_status: Mapped[str] = mapped_column(String(32), nullable=False, default="received", index=True)
    duplicate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
