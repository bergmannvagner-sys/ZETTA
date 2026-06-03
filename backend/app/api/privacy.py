import json
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_active_user
from app.db.session import get_db
from app.models.assistant import CareReminder
from app.models.chat import ChatMessage, ChatSession
from app.models.emotional import EmotionalReport, EmotionLog, JournalEntry, UserSharingConsent
from app.models.privacy import AuditAction, ConsentRecord, ConsentType
from app.models.sos import SOSEvent
from app.models.user import User
from app.schemas.privacy import (
    AcceptConsentRequest,
    AcceptConsentResponse,
    ConsentStatusResponse,
    PrivacyExportResponse,
    RevokeConsentResponse,
)
from app.services.audit import write_audit_log
from app.services.consent import (
    CURRENT_LGPD_POLICY_VERSION,
    accept_lgpd_consent,
    get_active_lgpd_consent,
    revoke_lgpd_consent,
)

router = APIRouter(prefix="/privacy", tags=["privacy"])


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _json_value(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


@router.get("/consent", response_model=ConsentStatusResponse)
def get_consent_status(
    user: Annotated[User, Depends(require_active_user)],
    db: Session = Depends(get_db),
) -> ConsentStatusResponse:
    record = get_active_lgpd_consent(db, user.id)
    return ConsentStatusResponse(
        required=True,
        accepted=record is not None,
        policy_version=CURRENT_LGPD_POLICY_VERSION,
        accepted_at=record.accepted_at.isoformat() if record else None,
    )


@router.post("/consent", response_model=AcceptConsentResponse)
def accept_consent(
    payload: AcceptConsentRequest,
    user: Annotated[User, Depends(require_active_user)],
    db: Session = Depends(get_db),
) -> AcceptConsentResponse:
    if payload.policy_version != CURRENT_LGPD_POLICY_VERSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported consent policy version",
        )
    record = accept_lgpd_consent(db, user.id, payload.policy_version)
    write_audit_log(
        db,
        action=AuditAction.CONSENT_ACCEPTED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="consent_record",
        resource_id=record.id,
        metadata={"policy_version": record.policy_version},
    )
    db.commit()
    db.refresh(record)
    return AcceptConsentResponse(
        accepted=True,
        policy_version=record.policy_version,
        accepted_at=record.accepted_at.isoformat(),
    )


@router.post("/consent/revoke", response_model=RevokeConsentResponse)
def revoke_consent(
    user: Annotated[User, Depends(require_active_user)],
    db: Session = Depends(get_db),
) -> RevokeConsentResponse:
    record = revoke_lgpd_consent(db, user.id)
    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active consent to revoke")
    write_audit_log(
        db,
        action=AuditAction.CONSENT_REVOKED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="consent_record",
        resource_id=record.id,
        metadata={"policy_version": record.policy_version},
    )
    db.commit()
    db.refresh(record)
    return RevokeConsentResponse(
        accepted=False,
        policy_version=record.policy_version,
        revoked_at=record.revoked_at.isoformat() if record.revoked_at else datetime.now(UTC).isoformat(),
    )


@router.get("/export", response_model=PrivacyExportResponse)
def export_my_data(
    user: Annotated[User, Depends(require_active_user)],
    db: Session = Depends(get_db),
) -> PrivacyExportResponse:
    consent_records = (
        db.query(ConsentRecord)
        .filter(ConsentRecord.user_id == user.id, ConsentRecord.consent_type == ConsentType.LGPD_MVP)
        .order_by(ConsentRecord.accepted_at.desc())
        .all()
    )
    sharing_granted = (
        db.query(UserSharingConsent)
        .filter(UserSharingConsent.owner_user_id == user.id)
        .order_by(UserSharingConsent.granted_at.desc())
        .all()
    )
    sharing_received = (
        db.query(UserSharingConsent)
        .filter(UserSharingConsent.target_user_id == user.id)
        .order_by(UserSharingConsent.granted_at.desc())
        .all()
    )
    journal_entries = (
        db.query(JournalEntry).filter(JournalEntry.user_id == user.id).order_by(JournalEntry.created_at.desc()).all()
    )
    emotion_logs = db.query(EmotionLog).filter(EmotionLog.user_id == user.id).order_by(EmotionLog.created_at.desc()).all()
    emotional_reports = (
        db.query(EmotionalReport)
        .filter(EmotionalReport.user_id == user.id)
        .order_by(EmotionalReport.created_at.desc())
        .all()
    )
    chat_sessions = (
        db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc()).all()
    )
    session_ids = [session.id for session in chat_sessions]
    chat_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id.in_(session_ids))
        .order_by(ChatMessage.created_at.asc())
        .all()
        if session_ids
        else []
    )
    messages_by_session: dict[str, list[dict[str, object]]] = {session.id: [] for session in chat_sessions}
    for message in chat_messages:
        messages_by_session.setdefault(message.session_id, []).append(
            {
                "id": message.id,
                "sender": message.sender,
                "content": message.content,
                "risk_level": message.risk_level,
                "created_at": _iso(message.created_at),
            }
        )
    sos_events = db.query(SOSEvent).filter(SOSEvent.user_id == user.id).order_by(SOSEvent.created_at.desc()).all()
    care_reminders = (
        db.query(CareReminder).filter(CareReminder.user_id == user.id).order_by(CareReminder.created_at.desc()).all()
    )

    write_audit_log(
        db,
        action=AuditAction.DATA_EXPORT_REQUESTED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="privacy_export",
        metadata={
            "journal_entries": len(journal_entries),
            "emotion_logs": len(emotion_logs),
            "chat_sessions": len(chat_sessions),
            "sos_events": len(sos_events),
        },
    )
    db.commit()

    return PrivacyExportResponse(
        exported_at=datetime.now(UTC).isoformat(),
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "status": user.status.value,
            "document_type": user.document_type,
            "document_last4": user.document_last4,
            "subscription_plan": user.subscription_plan.value,
            "subscription_status": user.subscription_status.value,
            "created_at": _iso(user.created_at),
            "updated_at": _iso(user.updated_at),
        },
        consent_records=[
            {
                "id": record.id,
                "policy_version": record.policy_version,
                "accepted_at": _iso(record.accepted_at),
                "revoked_at": _iso(record.revoked_at),
            }
            for record in consent_records
        ],
        sharing_consents_granted=[
            {
                "id": consent.id,
                "target_user_id": consent.target_user_id,
                "target_role": consent.target_role.value,
                "categories": _json_value(consent.categories_json),
                "summary_only": consent.summary_only,
                "period_start": _iso(consent.period_start),
                "period_end": _iso(consent.period_end),
                "granted_at": _iso(consent.granted_at),
                "revoked_at": _iso(consent.revoked_at),
            }
            for consent in sharing_granted
        ],
        sharing_consents_received=[
            {
                "id": consent.id,
                "owner_user_id": consent.owner_user_id,
                "target_role": consent.target_role.value,
                "categories": _json_value(consent.categories_json),
                "summary_only": consent.summary_only,
                "period_start": _iso(consent.period_start),
                "period_end": _iso(consent.period_end),
                "granted_at": _iso(consent.granted_at),
                "revoked_at": _iso(consent.revoked_at),
            }
            for consent in sharing_received
        ],
        journal_entries=[
            {
                "id": entry.id,
                "content": entry.content,
                "entry_type": entry.entry_type,
                "tags": _json_value(entry.tags_json),
                "occurred_at": _iso(entry.occurred_at),
                "created_at": _iso(entry.created_at),
            }
            for entry in journal_entries
        ],
        emotion_logs=[
            {
                "id": log.id,
                "mood": log.mood,
                "emotions": _json_value(log.emotions_json),
                "intensity": log.intensity,
                "energy": log.energy,
                "anxiety": log.anxiety,
                "stress": log.stress,
                "sleep_quality": log.sleep_quality,
                "motivation": log.motivation,
                "note": log.note,
                "created_at": _iso(log.created_at),
            }
            for log in emotion_logs
        ],
        emotional_reports=[
            {
                "id": report.id,
                "audience": report.audience.value,
                "summary": report.summary,
                "risk_level": report.risk_level,
                "metadata": _json_value(report.metadata_json),
                "created_at": _iso(report.created_at),
            }
            for report in emotional_reports
        ],
        chat_sessions=[
            {
                "id": session.id,
                "created_at": _iso(session.created_at),
                "messages": messages_by_session.get(session.id, []),
            }
            for session in chat_sessions
        ],
        sos_events=[
            {
                "id": event.id,
                "intensity": event.intensity,
                "message": event.message,
                "created_at": _iso(event.created_at),
            }
            for event in sos_events
        ],
        care_reminders=[
            {
                "id": reminder.id,
                "title": reminder.title,
                "category": reminder.category.value,
                "cadence": reminder.cadence,
                "time_local": reminder.time_local,
                "note": reminder.note,
                "active": reminder.active,
                "last_completed_at": _iso(reminder.last_completed_at),
                "created_at": _iso(reminder.created_at),
                "updated_at": _iso(reminder.updated_at),
            }
            for reminder in care_reminders
        ],
    )
