import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.models.token import PasswordResetToken, RefreshToken
from app.models.user import User


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def issue_token_pair(db: Session, user: User) -> tuple[str, str]:
    settings = get_settings()
    access_token = create_access_token(user.id, user.role.value, user.status.value)
    refresh_token = secrets.token_urlsafe(48)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_refresh_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return access_token, refresh_token


def rotate_refresh_token(db: Session, refresh_token: str) -> tuple[User, str, str] | None:
    token_hash = _hash_refresh_token(refresh_token)
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    now = datetime.now(UTC)
    if not stored or stored.revoked_at or stored.expires_at <= now:
        return None

    stored.revoked_at = now
    db.add(stored)
    db.flush()
    access_token, new_refresh = issue_token_pair(db, stored.user)
    return stored.user, access_token, new_refresh


def issue_password_reset_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(48)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_password_reset_token(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=30),
        )
    )
    db.commit()
    return token


def reset_password_with_token(db: Session, token: str, new_password: str) -> bool:
    stored = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == _hash_password_reset_token(token))
        .first()
    )
    now = datetime.now(UTC)
    if not stored or stored.used_at or _as_aware_utc(stored.expires_at) <= now:
        return False

    stored.used_at = now
    stored.user.password_hash = hash_password(new_password)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == stored.user_id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": now})
    db.add(stored)
    db.commit()
    return True
