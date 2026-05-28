from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.privacy import ConsentRecord, ConsentType

CURRENT_LGPD_POLICY_VERSION = "2026-05-27-mvp"


def get_active_lgpd_consent(db: Session, user_id: str) -> ConsentRecord | None:
    return (
        db.query(ConsentRecord)
        .filter(
            ConsentRecord.user_id == user_id,
            ConsentRecord.consent_type == ConsentType.LGPD_MVP,
            ConsentRecord.policy_version == CURRENT_LGPD_POLICY_VERSION,
            ConsentRecord.revoked_at.is_(None),
        )
        .order_by(ConsentRecord.accepted_at.desc())
        .first()
    )


def accept_lgpd_consent(db: Session, user_id: str, policy_version: str) -> ConsentRecord:
    existing = get_active_lgpd_consent(db, user_id)
    if existing and existing.policy_version == policy_version:
        return existing

    db.query(ConsentRecord).filter(
        ConsentRecord.user_id == user_id,
        ConsentRecord.consent_type == ConsentType.LGPD_MVP,
        ConsentRecord.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(UTC)})

    record = ConsentRecord(
        user_id=user_id,
        consent_type=ConsentType.LGPD_MVP,
        policy_version=policy_version,
    )
    db.add(record)
    db.flush()
    return record
