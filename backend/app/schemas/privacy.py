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


class ArchiveAccountResponse(BaseModel):
    archived: bool
    archived_at: str
    revoked_refresh_tokens: int
    revoked_sharing_consents: int
    consent_revoked: bool


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


class PrivacyAuditEntry(BaseModel):
    id: str
    action: str
    actor_user_id: str | None = None
    target_user_id: str | None = None
    resource_type: str
    resource_id: str | None = None
    metadata: dict[str, object] | list[object] | str | None = None
    created_at: str
