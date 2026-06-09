from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.services.encryption import EncryptedText


class SOSEvent(Base):
    __tablename__ = "bergmann_sos_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("bergmann_users.id", ondelete="CASCADE"), nullable=False)
    intensity: Mapped[str] = mapped_column(String(24), nullable=False)
    message: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user = relationship("User", back_populates="sos_events")
