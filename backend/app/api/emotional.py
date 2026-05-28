import json
from datetime import UTC, datetime
from statistics import mean
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent, require_roles
from app.db.session import get_db
from app.models.emotional import (
    EmotionLog,
    EmotionalReport,
    JournalEntry,
    NR1Report,
    ReportAudience,
    SharingCategory,
    UserSharingConsent,
)
from app.models.privacy import AuditAction
from app.models.user import User, UserRole
from app.schemas.emotional import (
    AuthorizedUserSummary,
    EmotionLogCreate,
    EmotionLogResponse,
    EmotionalReportResponse,
    JournalEntryCreate,
    JournalEntryResponse,
    NR1ReportResponse,
    SharingConsentCreate,
    SharingConsentResponse,
)
from app.services.audit import write_audit_log
from app.services.connection_codes import generate_connection_code, normalize_connection_code

router = APIRouter(tags=["emotional"])

COMPANY_ROLES = {UserRole.COMPANY}
PROFESSIONAL_ROLES = {UserRole.PSYCHOLOGIST}
SHARE_TARGET_ROLES = COMPANY_ROLES | PROFESSIONAL_ROLES
NR1_MIN_PARTICIPANTS = 3


def _json_list(value: str | None) -> list[str]:
    if not value:
        return []
    data = json.loads(value)
    return data if isinstance(data, list) else []


def _json_dict(value: str | None) -> dict[str, object]:
    if not value:
        return {}
    data = json.loads(value)
    return data if isinstance(data, dict) else {}


def _categories(consent: UserSharingConsent) -> list[SharingCategory]:
    return [SharingCategory(category) for category in _json_list(consent.categories_json)]


def _serialize_journal(entry: JournalEntry) -> JournalEntryResponse:
    return JournalEntryResponse(
        id=entry.id,
        content=entry.content,
        entry_type=entry.entry_type,
        tags=_json_list(entry.tags_json),
        occurred_at=entry.occurred_at,
        created_at=entry.created_at,
    )


def _serialize_emotion(log: EmotionLog) -> EmotionLogResponse:
    return EmotionLogResponse(
        id=log.id,
        mood=log.mood,
        emotions=_json_list(log.emotions_json),
        intensity=log.intensity,
        energy=log.energy,
        anxiety=log.anxiety,
        stress=log.stress,
        sleep_quality=log.sleep_quality,
        motivation=log.motivation,
        note=log.note,
        created_at=log.created_at,
    )


def _serialize_consent(consent: UserSharingConsent) -> SharingConsentResponse:
    return SharingConsentResponse(
        id=consent.id,
        target_user_id=consent.target_user_id,
        target_email=consent.target.email,
        target_role=consent.target_role.value,
        categories=_categories(consent),
        summary_only=consent.summary_only,
        period_start=consent.period_start,
        period_end=consent.period_end,
        granted_at=consent.granted_at,
        revoked_at=consent.revoked_at,
    )


def _find_share_target(db: Session, payload: SharingConsentCreate) -> User | None:
    identifier = str(payload.target_email or payload.target_identifier or "").strip()
    if not identifier:
        return None
    if "@" in identifier:
        return db.query(User).filter(User.email == identifier.lower()).first()
    return db.query(User).filter(User.connection_code == normalize_connection_code(identifier)).first()


def _active_consents_for_target(db: Session, target: User) -> list[UserSharingConsent]:
    return (
        db.query(UserSharingConsent)
        .filter(
            UserSharingConsent.target_user_id == target.id,
            UserSharingConsent.revoked_at.is_(None),
        )
        .all()
    )


@router.post("/journal/entries", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    payload: JournalEntryCreate,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> JournalEntryResponse:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can create journal entries")
    entry = JournalEntry(
        user_id=user.id,
        content=payload.content.strip(),
        entry_type=payload.entry_type.strip().upper() or "REFLECTION",
        tags_json=json.dumps(payload.tags, ensure_ascii=True),
    )
    db.add(entry)
    write_audit_log(
        db,
        action=AuditAction.JOURNAL_ENTRY_CREATED,
        resource_type="journal_entry",
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_id=entry.id,
        metadata={"entry_type": entry.entry_type, "tags_count": len(payload.tags)},
    )
    db.commit()
    db.refresh(entry)
    return _serialize_journal(entry)


@router.get("/journal/entries", response_model=list[JournalEntryResponse])
def list_journal_entries(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> list[JournalEntryResponse]:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can list own journal")
    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.created_at.desc())
        .limit(50)
        .all()
    )
    return [_serialize_journal(entry) for entry in entries]


@router.post("/emotions/logs", response_model=EmotionLogResponse, status_code=status.HTTP_201_CREATED)
def create_emotion_log(
    payload: EmotionLogCreate,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> EmotionLogResponse:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can create emotion logs")
    log = EmotionLog(
        user_id=user.id,
        mood=payload.mood.strip().lower(),
        emotions_json=json.dumps(payload.emotions, ensure_ascii=True),
        intensity=payload.intensity,
        energy=payload.energy,
        anxiety=payload.anxiety,
        stress=payload.stress,
        sleep_quality=payload.sleep_quality,
        motivation=payload.motivation,
        note=payload.note.strip() if payload.note else None,
    )
    db.add(log)
    write_audit_log(
        db,
        action=AuditAction.EMOTION_LOG_CREATED,
        resource_type="emotion_log",
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_id=log.id,
        metadata={"mood": log.mood, "intensity": log.intensity},
    )
    db.commit()
    db.refresh(log)
    return _serialize_emotion(log)


@router.post("/sharing/consents", response_model=SharingConsentResponse, status_code=status.HTTP_201_CREATED)
def grant_sharing_consent(
    payload: SharingConsentCreate,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> SharingConsentResponse:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can grant sharing consent")
    target = _find_share_target(db, payload)
    if not target or target.role not in SHARE_TARGET_ROLES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional or company account not found")
    if target.status.value != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target account is not active")
    if not target.connection_code:
        target.connection_code = generate_connection_code(db)
    if payload.period_start and payload.period_end and payload.period_start > payload.period_end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sharing period")

    existing = (
        db.query(UserSharingConsent)
        .filter(
            UserSharingConsent.owner_user_id == user.id,
            UserSharingConsent.target_user_id == target.id,
            UserSharingConsent.revoked_at.is_(None),
        )
        .first()
    )
    if existing:
        existing.categories_json = json.dumps([category.value for category in payload.categories], ensure_ascii=True)
        existing.summary_only = payload.summary_only
        existing.period_start = payload.period_start
        existing.period_end = payload.period_end
        consent = existing
    else:
        consent = UserSharingConsent(
            owner_user_id=user.id,
            target_user_id=target.id,
            target_role=target.role,
            categories_json=json.dumps([category.value for category in payload.categories], ensure_ascii=True),
            summary_only=payload.summary_only,
            period_start=payload.period_start,
            period_end=payload.period_end,
        )
        db.add(consent)

    write_audit_log(
        db,
        action=AuditAction.SHARING_CONSENT_GRANTED,
        resource_type="sharing_consent",
        actor_user_id=user.id,
        target_user_id=target.id,
        resource_id=consent.id,
        metadata={"target_role": target.role.value, "categories": [category.value for category in payload.categories]},
    )
    db.commit()
    db.refresh(consent)
    return _serialize_consent(consent)


@router.get("/sharing/consents", response_model=list[SharingConsentResponse])
def list_sharing_consents(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> list[SharingConsentResponse]:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can list sharing consents")
    consents = (
        db.query(UserSharingConsent)
        .filter(UserSharingConsent.owner_user_id == user.id)
        .order_by(UserSharingConsent.granted_at.desc())
        .all()
    )
    return [_serialize_consent(consent) for consent in consents]


@router.delete("/sharing/consents/{consent_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_sharing_consent(
    consent_id: str,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> None:
    consent = (
        db.query(UserSharingConsent)
        .filter(UserSharingConsent.id == consent_id, UserSharingConsent.owner_user_id == user.id)
        .first()
    )
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sharing consent not found")
    consent.revoked_at = datetime.now(UTC)
    write_audit_log(
        db,
        action=AuditAction.SHARING_CONSENT_REVOKED,
        resource_type="sharing_consent",
        actor_user_id=user.id,
        target_user_id=consent.target_user_id,
        resource_id=consent.id,
    )
    db.commit()


@router.post("/reports/emotional/me", response_model=EmotionalReportResponse, status_code=status.HTTP_201_CREATED)
def create_my_emotional_report(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> EmotionalReportResponse:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can create own report")
    logs = (
        db.query(EmotionLog)
        .filter(EmotionLog.user_id == user.id)
        .order_by(EmotionLog.created_at.desc())
        .limit(14)
        .all()
    )
    entries_count = db.query(JournalEntry).filter(JournalEntry.user_id == user.id).count()
    if not logs:
        summary = "Ainda nao ha registros emocionais suficientes. Comece com um registro simples de humor ou diario."
        risk_level = "UNKNOWN"
        metadata: dict[str, object] = {"emotion_logs": 0, "journal_entries": entries_count}
    else:
        avg_intensity = round(mean(log.intensity for log in logs), 2)
        latest = logs[0]
        risk_level = "ELEVATED" if avg_intensity >= 7 or any((log.anxiety or 0) >= 8 for log in logs) else "LOW"
        summary = (
            f"Nos ultimos registros, o humor mais recente foi {latest.mood}. "
            f"A intensidade media ficou em {avg_intensity}. Use isso como apoio de reflexao, nao como diagnostico."
        )
        metadata = {
            "emotion_logs": len(logs),
            "journal_entries": entries_count,
            "average_intensity": avg_intensity,
            "latest_mood": latest.mood,
        }
    report = EmotionalReport(
        user_id=user.id,
        audience=ReportAudience.USER,
        summary=summary,
        risk_level=risk_level,
        metadata_json=json.dumps(metadata, ensure_ascii=True, sort_keys=True),
    )
    db.add(report)
    write_audit_log(
        db,
        action=AuditAction.EMOTIONAL_REPORT_CREATED,
        resource_type="emotional_report",
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_id=report.id,
        metadata={"audience": ReportAudience.USER.value, "risk_level": risk_level},
    )
    db.commit()
    db.refresh(report)
    return EmotionalReportResponse(
        id=report.id,
        summary=report.summary,
        risk_level=report.risk_level,
        metadata=_json_dict(report.metadata_json),
        created_at=report.created_at,
    )


@router.get("/professional/authorized-users", response_model=list[AuthorizedUserSummary])
def list_authorized_users_for_professional(
    user: Annotated[User, Depends(require_roles(UserRole.PSYCHOLOGIST))],
    db: Session = Depends(get_db),
) -> list[AuthorizedUserSummary]:
    consents = _active_consents_for_target(db, user)
    result: list[AuthorizedUserSummary] = []
    for consent in consents:
        categories = _categories(consent)
        logs = (
            db.query(EmotionLog)
            .filter(EmotionLog.user_id == consent.owner_user_id)
            .order_by(EmotionLog.created_at.desc())
            .limit(14)
            .all()
        )
        latest_mood = logs[0].mood if logs and SharingCategory.MOOD in categories else None
        average_intensity = (
            round(mean(log.intensity for log in logs), 2)
            if logs and SharingCategory.TRENDS in categories
            else None
        )
        journal_entries_visible = (
            db.query(JournalEntry).filter(JournalEntry.user_id == consent.owner_user_id).count()
            if SharingCategory.JOURNAL in categories and not consent.summary_only
            else 0
        )
        result.append(
            AuthorizedUserSummary(
                user_id=consent.owner.id,
                full_name=consent.owner.full_name,
                email=consent.owner.email,
                categories=categories,
                summary_only=consent.summary_only,
                latest_mood=latest_mood,
                average_intensity=average_intensity,
                journal_entries_visible=journal_entries_visible,
            )
        )
    return result


@router.get("/nr1/report", response_model=NR1ReportResponse)
def get_nr1_report(
    user: Annotated[User, Depends(require_roles(UserRole.COMPANY))],
    db: Session = Depends(get_db),
) -> NR1ReportResponse:
    consents = [
        consent
        for consent in _active_consents_for_target(db, user)
        if SharingCategory.TRENDS in _categories(consent) or SharingCategory.MOOD in _categories(consent)
    ]
    participant_count = len({consent.owner_user_id for consent in consents})
    now = datetime.now(UTC)
    if participant_count < NR1_MIN_PARTICIPANTS:
        summary = "Relatorio NR-1 suprimido por privacidade: amostra insuficiente para indicadores agregados."
        indicators: dict[str, object] = {"minimum_participants": NR1_MIN_PARTICIPANTS}
        suppressed = True
    else:
        logs: list[EmotionLog] = []
        owner_ids = {consent.owner_user_id for consent in consents}
        for owner_id in owner_ids:
            logs.extend(db.query(EmotionLog).filter(EmotionLog.user_id == owner_id).limit(30).all())
        avg_intensity = round(mean(log.intensity for log in logs), 2) if logs else None
        avg_stress = round(mean(log.stress for log in logs if log.stress is not None), 2) if logs else None
        avg_anxiety = round(mean(log.anxiety for log in logs if log.anxiety is not None), 2) if logs else None
        indicators = {
            "average_intensity": avg_intensity,
            "average_stress": avg_stress,
            "average_anxiety": avg_anxiety,
            "logs_count": len(logs),
        }
        summary = "Indicadores coletivos autorizados gerados sem exposicao individual."
        suppressed = False
    report = NR1Report(
        company_user_id=user.id,
        participant_count=participant_count,
        suppressed=suppressed,
        summary=summary,
        indicators_json=json.dumps(indicators, ensure_ascii=True, sort_keys=True),
    )
    db.add(report)
    write_audit_log(
        db,
        action=AuditAction.NR1_REPORT_VIEWED,
        resource_type="nr1_report",
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_id=report.id,
        metadata={"participant_count": participant_count, "suppressed": suppressed},
    )
    db.commit()
    return NR1ReportResponse(
        participant_count=participant_count,
        suppressed=suppressed,
        summary=summary,
        indicators=indicators,
        generated_at=now,
    )
