from pydantic import BaseModel, EmailStr

from app.models.user import AccountStatus, UserRole


class UserMeResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus


class PendingAccountResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    created_at: str


class ModerationAccountRequest(BaseModel):
    user_id: str
