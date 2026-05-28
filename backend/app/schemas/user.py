from pydantic import BaseModel, EmailStr

from app.models.user import AccountStatus, UserRole


class UserMeResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    document_type: str | None = None
    document_last4: str | None = None


class PendingAccountResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    document_type: str | None = None
    document_last4: str | None = None
    created_at: str


class ModerationAccountRequest(BaseModel):
    user_id: str
    reason: str | None = None
