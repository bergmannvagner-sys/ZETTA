from pydantic import BaseModel, EmailStr

from app.models.user import AccountStatus, SubscriptionPlan, SubscriptionStatus, UserRole


class UserMeResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    document_type: str | None = None
    document_last4: str | None = None
    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus


class PendingAccountResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    document_type: str | None = None
    document_last4: str | None = None
    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus
    created_at: str


class ModerationAccountRequest(BaseModel):
    user_id: str
    reason: str | None = None
