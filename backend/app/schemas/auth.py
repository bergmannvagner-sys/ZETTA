from typing import Any

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user import AccountStatus, UserRole


PUBLIC_REGISTER_ROLES = {
    UserRole.USER,
    UserRole.PSYCHOLOGIST,
    UserRole.COMPANY,
    UserRole.NGO,
    UserRole.HOSPITAL,
    UserRole.CLINIC,
    UserRole.SPONSOR,
    UserRole.PUBLIC_INSTITUTION,
}


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_client_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        normalized = dict(data)
        if "full_name" not in normalized and "name" in normalized:
            normalized["full_name"] = normalized["name"]
        if "role" not in normalized and "accountType" in normalized:
            normalized["role"] = normalized["accountType"]
        return normalized


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthUserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus


class AuthResponse(TokenResponse):
    user: AuthUserResponse
