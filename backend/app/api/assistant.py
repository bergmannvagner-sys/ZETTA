from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.db.session import get_db
from app.models.assistant import CareReminder
from app.models.privacy import AuditAction
from app.models.user import User, UserRole
from app.schemas.assistant import CareReminderCreate, CareReminderResponse
from app.services.audit import write_audit_log

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _serialize(reminder: CareReminder) -> CareReminderResponse:
    return CareReminderResponse(
        id=reminder.id,
        title=reminder.title,
        category=reminder.category,
        cadence=reminder.cadence,
        time_local=reminder.time_local,
        note=reminder.note,
        active=reminder.active,
        last_completed_at=reminder.last_completed_at,
        created_at=reminder.created_at,
        updated_at=reminder.updated_at,
    )


@router.post("/reminders", response_model=CareReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: CareReminderCreate,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> CareReminderResponse:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can create reminders")
    reminder = CareReminder(
        user_id=user.id,
        title=payload.title.strip(),
        category=payload.category,
        cadence=payload.cadence,
        time_local=payload.time_local,
        note=payload.note.strip() if payload.note else None,
    )
    db.add(reminder)
    db.flush()
    write_audit_log(
        db,
        action=AuditAction.CARE_REMINDER_CREATED,
        resource_type="care_reminder",
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_id=reminder.id,
        metadata={"category": reminder.category.value, "cadence": reminder.cadence},
    )
    db.commit()
    db.refresh(reminder)
    return _serialize(reminder)


@router.get("/reminders", response_model=list[CareReminderResponse])
def list_reminders(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> list[CareReminderResponse]:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can list reminders")
    reminders = (
        db.query(CareReminder)
        .filter(CareReminder.user_id == user.id, CareReminder.active.is_(True))
        .order_by(CareReminder.created_at.desc())
        .limit(50)
        .all()
    )
    return [_serialize(reminder) for reminder in reminders]


@router.post("/reminders/{reminder_id}/complete", response_model=CareReminderResponse)
def complete_reminder(
    reminder_id: str,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> CareReminderResponse:
    reminder = (
        db.query(CareReminder)
        .filter(CareReminder.id == reminder_id, CareReminder.user_id == user.id, CareReminder.active.is_(True))
        .first()
    )
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    reminder.last_completed_at = datetime.now(UTC)
    write_audit_log(
        db,
        action=AuditAction.CARE_REMINDER_COMPLETED,
        resource_type="care_reminder",
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_id=reminder.id,
        metadata={"category": reminder.category.value},
    )
    db.commit()
    db.refresh(reminder)
    return _serialize(reminder)
