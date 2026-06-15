from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import AccountStatus, User, UserRole
from app.services.billing import has_paid_access
from app.services.consent import get_active_lgpd_consent

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    if payload.get("type") != "access" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_active_user(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.status == AccountStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account archived",
        )
    if user.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending verification",
        )
    return user


def require_lgpd_consent(
    user: Annotated[User, Depends(require_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if user.role == UserRole.SUPER_ADMIN:
        return user
    if not get_active_lgpd_consent(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="LGPD consent required",
        )
    return user


def require_roles(*roles: UserRole):
    def dependency(user: Annotated[User, Depends(require_active_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        return user

    return dependency


def require_paid_roles(*roles: UserRole):
    def dependency(user: Annotated[User, Depends(require_active_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        if not has_paid_access(user):
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Paid plan required")
        return user

    return dependency
