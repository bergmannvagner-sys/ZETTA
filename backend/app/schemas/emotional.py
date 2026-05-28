from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.emotional import SharingCategory


class JournalEntryCreate(BaseModel):
    content: str = Field(min_length=2, max_length=6000)
    entry_type: str = Field(default="REFLECTION", max_length=32)
    tags: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        return [tag.strip().lower()[:32] for tag in tags if tag.strip()]


class JournalEntryResponse(BaseModel):
    id: str
    content: str
    entry_type: str
    tags: list[str]
    occurred_at: datetime
    created_at: datetime


class EmotionLogCreate(BaseModel):
    mood: str = Field(min_length=2, max_length=48)
    emotions: list[str] = Field(default_factory=list, max_length=12)
    intensity: int = Field(ge=1, le=10)
    energy: int | None = Field(default=None, ge=1, le=10)
    anxiety: int | None = Field(default=None, ge=1, le=10)
    stress: int | None = Field(default=None, ge=1, le=10)
    sleep_quality: int | None = Field(default=None, ge=1, le=10)
    motivation: int | None = Field(default=None, ge=1, le=10)
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("emotions")
    @classmethod
    def normalize_emotions(cls, emotions: list[str]) -> list[str]:
        return [emotion.strip().lower()[:48] for emotion in emotions if emotion.strip()]


class EmotionLogResponse(BaseModel):
    id: str
    mood: str
    emotions: list[str]
    intensity: int
    energy: int | None
    anxiety: int | None
    stress: int | None
    sleep_quality: int | None
    motivation: int | None
    note: str | None
    created_at: datetime


class SharingConsentCreate(BaseModel):
    target_email: EmailStr
    categories: list[SharingCategory] = Field(min_length=1, max_length=6)
    summary_only: bool = True
    period_start: datetime | None = None
    period_end: datetime | None = None


class SharingConsentResponse(BaseModel):
    id: str
    target_user_id: str
    target_email: EmailStr
    target_role: str
    categories: list[SharingCategory]
    summary_only: bool
    period_start: datetime | None
    period_end: datetime | None
    granted_at: datetime
    revoked_at: datetime | None


class EmotionalReportResponse(BaseModel):
    id: str
    summary: str
    risk_level: str
    metadata: dict[str, object]
    created_at: datetime


class AuthorizedUserSummary(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    categories: list[SharingCategory]
    summary_only: bool
    latest_mood: str | None
    average_intensity: float | None
    journal_entries_visible: int


class NR1ReportResponse(BaseModel):
    participant_count: int
    suppressed: bool
    summary: str
    indicators: dict[str, object]
    generated_at: datetime
