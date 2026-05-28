from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.assistant import CareReminderCategory


class CareReminderCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    category: CareReminderCategory = CareReminderCategory.CUSTOM
    cadence: str = Field(default="DAILY", max_length=32)
    time_local: str | None = Field(default=None, max_length=5)
    note: str | None = Field(default=None, max_length=1000)

    @field_validator("cadence")
    @classmethod
    def normalize_cadence(cls, value: str) -> str:
        normalized = value.strip().upper() or "DAILY"
        if normalized not in {"DAILY", "WEEKLY", "AS_NEEDED"}:
            raise ValueError("Cadencia invalida.")
        return normalized

    @field_validator("time_local")
    @classmethod
    def validate_time(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        normalized = value.strip()
        if len(normalized) != 5 or normalized[2] != ":":
            raise ValueError("Use horario no formato HH:MM.")
        hour, minute = normalized.split(":")
        if not (hour.isdigit() and minute.isdigit() and 0 <= int(hour) <= 23 and 0 <= int(minute) <= 59):
            raise ValueError("Use horario no formato HH:MM.")
        return normalized


class CareReminderResponse(BaseModel):
    id: str
    title: str
    category: CareReminderCategory
    cadence: str
    time_local: str | None
    note: str | None
    active: bool
    last_completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
