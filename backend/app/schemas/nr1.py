from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.nr1 import (
    NR1ActionStatus,
    NR1RiskCategory,
    NR1RiskSource,
    NR1RiskStatus,
    NR1TrainingStatus,
    NR1WorkspaceStatus,
)


class NR1WorkspaceUpdate(BaseModel):
    organization_name: str | None = Field(default=None, min_length=2, max_length=160)
    unit_name: str | None = Field(default=None, min_length=2, max_length=160)
    gro_owner_name: str | None = Field(default=None, min_length=2, max_length=160)
    scope_statement: str | None = Field(default=None, max_length=4000)
    notes: str | None = Field(default=None, max_length=4000)
    status: NR1WorkspaceStatus | None = None


class NR1RiskItemCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    category: NR1RiskCategory
    source: NR1RiskSource = NR1RiskSource.MANUAL
    status: NR1RiskStatus = NR1RiskStatus.OPEN
    severity: int = Field(ge=1, le=5)
    likelihood: int = Field(ge=1, le=5)
    owner_label: str | None = Field(default=None, max_length=160)
    due_on: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    is_template: bool = False


class NR1RiskItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    category: NR1RiskCategory | None = None
    source: NR1RiskSource | None = None
    status: NR1RiskStatus | None = None
    severity: int | None = Field(default=None, ge=1, le=5)
    likelihood: int | None = Field(default=None, ge=1, le=5)
    owner_label: str | None = Field(default=None, max_length=160)
    due_on: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    is_template: bool | None = None
    reviewed_at: datetime | None = None


class NR1ActionItemCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    owner_label: str | None = Field(default=None, max_length=160)
    status: NR1ActionStatus = NR1ActionStatus.PLANNED
    progress_percent: int = Field(default=0, ge=0, le=100)
    due_on: date | None = None
    completed_on: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    risk_item_id: str | None = None
    is_template: bool = False


class NR1ActionItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    owner_label: str | None = Field(default=None, max_length=160)
    status: NR1ActionStatus | None = None
    progress_percent: int | None = Field(default=None, ge=0, le=100)
    due_on: date | None = None
    completed_on: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    risk_item_id: str | None = None
    is_template: bool | None = None


class NR1TrainingItemCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    audience: str | None = Field(default=None, max_length=160)
    status: NR1TrainingStatus = NR1TrainingStatus.PENDING
    frequency_days: int | None = Field(default=None, ge=1, le=3650)
    required_hours: float | None = Field(default=None, ge=0, le=200)
    due_on: date | None = None
    completed_on: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    is_template: bool = False


class NR1TrainingItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    audience: str | None = Field(default=None, max_length=160)
    status: NR1TrainingStatus | None = None
    frequency_days: int | None = Field(default=None, ge=1, le=3650)
    required_hours: float | None = Field(default=None, ge=0, le=200)
    due_on: date | None = None
    completed_on: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    is_template: bool | None = None


class NR1WorkspaceResponse(BaseModel):
    id: str
    company_user_id: str
    organization_name: str
    unit_name: str | None
    gro_owner_name: str | None
    scope_statement: str | None
    notes: str | None
    status: NR1WorkspaceStatus
    last_reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class NR1RiskItemResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    description: str | None
    category: NR1RiskCategory
    source: NR1RiskSource
    status: NR1RiskStatus
    severity: int
    likelihood: int
    risk_score: int
    owner_label: str | None
    due_on: date | None
    notes: str | None
    is_template: bool
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class NR1ActionItemResponse(BaseModel):
    id: str
    workspace_id: str
    risk_item_id: str | None
    title: str
    description: str | None
    owner_label: str | None
    status: NR1ActionStatus
    progress_percent: int
    due_on: date | None
    completed_on: date | None
    notes: str | None
    is_template: bool
    is_overdue: bool
    created_at: datetime
    updated_at: datetime


class NR1TrainingItemResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    audience: str | None
    status: NR1TrainingStatus
    frequency_days: int | None
    required_hours: float | None
    due_on: date | None
    completed_on: date | None
    notes: str | None
    is_template: bool
    is_overdue: bool
    created_at: datetime
    updated_at: datetime


class NR1SummaryResponse(BaseModel):
    participant_count: int
    minimum_participants: int
    suppressed: bool
    signal_count: int | None
    average_intensity: float | None
    average_anxiety: float | None
    average_stress: float | None
    high_risk_signal_count: int | None
    open_risk_count: int
    mitigating_risk_count: int
    controlled_risk_count: int
    open_action_count: int
    overdue_action_count: int
    training_count: int
    overdue_training_count: int
    template_count: int
    summary: str
    current_state: str
    privacy_note: str
    generated_at: datetime


class NR1WorkspaceOverviewResponse(BaseModel):
    workspace: NR1WorkspaceResponse
    summary: NR1SummaryResponse
    risks: list[NR1RiskItemResponse]
    actions: list[NR1ActionItemResponse]
    trainings: list[NR1TrainingItemResponse]
