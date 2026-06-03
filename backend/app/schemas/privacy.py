from pydantic import BaseModel


class ConsentStatusResponse(BaseModel):
    required: bool
    accepted: bool
    policy_version: str
    accepted_at: str | None = None


class AcceptConsentRequest(BaseModel):
    policy_version: str = "2026-05-27-mvp"


class AcceptConsentResponse(BaseModel):
    accepted: bool
    policy_version: str
    accepted_at: str


class RevokeConsentResponse(BaseModel):
    accepted: bool
    policy_version: str
    revoked_at: str


class PrivacyExportResponse(BaseModel):
    exported_at: str
    user: dict[str, object]
    consent_records: list[dict[str, object]]
    sharing_consents_granted: list[dict[str, object]]
    sharing_consents_received: list[dict[str, object]]
    journal_entries: list[dict[str, object]]
    emotion_logs: list[dict[str, object]]
    emotional_reports: list[dict[str, object]]
    chat_sessions: list[dict[str, object]]
    sos_events: list[dict[str, object]]
    care_reminders: list[dict[str, object]]
