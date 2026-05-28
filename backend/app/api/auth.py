from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import AccountStatus, User, UserRole
from app.models.privacy import AuditAction
from app.schemas.auth import (
    AuthResponse,
    AuthUserResponse,
    LoginRequest,
    PUBLIC_REGISTER_ROLES,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.tokens import issue_token_pair, rotate_refresh_token
from app.services.audit import write_audit_log

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_user(user: User) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        status=user.status,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if payload.role not in PUBLIC_REGISTER_ROLES or payload.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not allowed")
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    account_status = (
        AccountStatus.ACTIVE if payload.role == UserRole.USER else AccountStatus.PENDING_VERIFICATION
    )
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=account_status,
    )
    db.add(user)
    db.flush()
    write_audit_log(
        db,
        action=AuditAction.USER_REGISTERED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={"role": user.role.value, "status": user.status.value},
    )
    db.commit()
    db.refresh(user)
    access_token, refresh_token = issue_token_pair(db, user)
    return AuthResponse(access_token=access_token, refresh_token=refresh_token, user=_auth_user(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    write_audit_log(
        db,
        action=AuditAction.USER_LOGIN,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="auth_session",
        metadata={"role": user.role.value, "status": user.status.value},
    )
    access_token, refresh_token = issue_token_pair(db, user)
    return AuthResponse(access_token=access_token, refresh_token=refresh_token, user=_auth_user(user))


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    rotated = rotate_refresh_token(db, payload.refresh_token)
    if not rotated:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user, access_token, refresh_token = rotated
    write_audit_log(
        db,
        action=AuditAction.TOKEN_REFRESHED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="refresh_token",
    )
    db.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
