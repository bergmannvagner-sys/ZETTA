from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.emotional import SharingCategory
from app.models.user import UserRole


class InstitutionCategoryCount(BaseModel):
    category: SharingCategory
    count: int


class InstitutionMoodCount(BaseModel):
    mood: str
    count: int


class InstitutionSharedUserSummary(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    categories: list[SharingCategory]
    summary_only: bool
    latest_mood: str | None
    average_intensity: float | None
    journal_entries_visible: int
    shared_at: datetime


class InstitutionDashboardResponse(BaseModel):
    institution_role: UserRole
    participant_count: int
    category_breakdown: list[InstitutionCategoryCount]
    mood_breakdown: list[InstitutionMoodCount]
    average_intensity: float | None
    average_anxiety: float | None
    average_stress: float | None
    risk_flags: int
    summary: str
    privacy_note: str
    shared_users: list[InstitutionSharedUserSummary]
    generated_at: datetime
