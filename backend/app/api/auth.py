import os

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
    PasswordResetConfirmRequest,
    PasswordResetConfirmResponse,
    PasswordResetRequest,
    PasswordResetRequestResponse,
    PUBLIC_REGISTER_ROLES,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.identity import (
    document_last4,
    document_lookup_hash,
    document_type_for_role,
    normalize_document,
    validate_document,
)
from app.services.email import send_password_reset_email
from app.services.audit import write_audit_log
from app.services.tokens import (
    issue_password_reset_token,
    issue_token_pair,
    reset_password_with_token,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_user(user: User) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        status=user.status,
        document_type=user.document_type,
        document_last4=user.document_last4,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if payload.role not in PUBLIC_REGISTER_ROLES or payload.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not allowed")
    if not payload.lgpdConsent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="LGPD consent required")
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    document_type = document_type_for_role(payload.role)
    normalized_document = normalize_document(document_type, payload.document)
    document_error = validate_document(document_type, normalized_document)
    if document_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=document_error)
    document_hash = document_lookup_hash(document_type, normalized_document)
    existing_document = db.query(User).filter(User.document_value_hash == document_hash).first()
    if existing_document:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Document already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=AccountStatus.PENDING_VERIFICATION,
        document_type=document_type,
        document_value_hash=document_hash,
        document_last4=document_last4(normalized_document),
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
        metadata={"role": user.role.value, "status": user.status.value, "document_type": document_type},
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


@router.post("/password-reset/request", response_model=PasswordResetRequestResponse)
def request_password_reset(
    payload: PasswordResetRequest,
    db: Session = Depends(get_db),
) -> PasswordResetRequestResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    reset_token = issue_password_reset_token(db, user) if user else None
    if user and reset_token:
        send_password_reset_email(user.email, reset_token)
    message = "Se o email existir, enviaremos instrucoes para recuperar sua senha."
    if reset_token and os.getenv("APP_ENV", "").lower() == "test":
        return PasswordResetRequestResponse(message=message, reset_token=reset_token)
    return PasswordResetRequestResponse(message=message)


@router.post("/password-reset/confirm", response_model=PasswordResetConfirmResponse)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: Session = Depends(get_db),
) -> PasswordResetConfirmResponse:
    if not reset_password_with_token(db, payload.token, payload.new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    return PasswordResetConfirmResponse(message="Senha atualizada com seguranca.")
