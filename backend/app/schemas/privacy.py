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
