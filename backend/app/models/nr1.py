from __future__ import annotations

import enum
from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.services.encryption import EncryptedText


class NR1WorkspaceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    ACTIVE = "ACTIVE"
    MONITORING = "MONITORING"
    PAUSED = "PAUSED"


class NR1RiskCategory(str, enum.Enum):
    PSYCHOSOCIAL = "PSYCHOSOCIAL"
    ORGANIZATIONAL = "ORGANIZATIONAL"
    ERGONOMIC = "ERGONOMIC"
    ENVIRONMENTAL = "ENVIRONMENTAL"
    SAFETY = "SAFETY"


class NR1RiskSource(str, enum.Enum):
    TEMPLATE = "TEMPLATE"
    MANUAL = "MANUAL"
    EMPLOYEE_FEEDBACK = "EMPLOYEE_FEEDBACK"
    EMOTIONAL_SIGNAL = "EMOTIONAL_SIGNAL"
    INCIDENT = "INCIDENT"


class NR1RiskStatus(str, enum.Enum):
    OPEN = "OPEN"
    MITIGATING = "MITIGATING"
    CONTROLLED = "CONTROLLED"
    MONITORING = "MONITORING"
    ARCHIVED = "ARCHIVED"


class NR1ActionStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"


class NR1TrainingStatus(str, enum.Enum):
    PENDING = "PENDING"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"
    CANCELED = "CANCELED"


class NR1Workspace(Base):
    __tablename__ = "bergmann_nr1_workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    company_user_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    organization_name: Mapped[str] = mapped_column(String(160), nullable=False)
    unit_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    gro_owner_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    scope_statement: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    notes: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=NR1WorkspaceStatus.DRAFT.value, index=True, nullable=False)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    company = relationship("User", back_populates="nr1_workspace")
    risks = relationship("NR1RiskItem", back_populates="workspace", cascade="all, delete-orphan")
    actions = relationship("NR1ActionItem", back_populates="workspace", cascade="all, delete-orphan")
    trainings = relationship("NR1TrainingItem", back_populates="workspace", cascade="all, delete-orphan")


class NR1RiskItem(Base):
    __tablename__ = "bergmann_nr1_risk_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_nr1_workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=NR1RiskStatus.OPEN.value, index=True, nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    likelihood: Mapped[int] = mapped_column(Integer, nullable=False)
    owner_label: Mapped[str | None] = mapped_column(String(160), nullable=True)
    due_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    workspace = relationship("NR1Workspace", back_populates="risks")
    action_items = relationship("NR1ActionItem", back_populates="risk_item")


class NR1ActionItem(Base):
    __tablename__ = "bergmann_nr1_action_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_nr1_workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    risk_item_id: Mapped[str | None] = mapped_column(
        ForeignKey("bergmann_nr1_risk_items.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    owner_label: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=NR1ActionStatus.PLANNED.value, index=True, nullable=False)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    due_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    workspace = relationship("NR1Workspace", back_populates="actions")
    risk_item = relationship("NR1RiskItem", back_populates="action_items")


class NR1TrainingItem(Base):
    __tablename__ = "bergmann_nr1_training_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("bergmann_nr1_workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    audience: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=NR1TrainingStatus.PENDING.value, index=True, nullable=False)
    frequency_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    required_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    due_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    workspace = relationship("NR1Workspace", back_populates="trainings")
