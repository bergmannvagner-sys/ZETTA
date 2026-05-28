import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.privacy import AuditAction, AuditLog

SENSITIVE_KEYS = {"token", "access_token", "refresh_token", "password", "groq_api_key", "jwt_secret_key"}


def _safe_metadata(metadata: dict[str, Any] | None) -> str | None:
    if not metadata:
        return None
    clean = {key: value for key, value in metadata.items() if key.lower() not in SENSITIVE_KEYS}
    return json.dumps(clean, ensure_ascii=True, sort_keys=True)


def write_audit_log(
    db: Session,
    *,
    action: AuditAction,
    resource_type: str,
    actor_user_id: str | None = None,
    target_user_id: str | None = None,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_json=_safe_metadata(metadata),
    )
    db.add(entry)
    return entry
