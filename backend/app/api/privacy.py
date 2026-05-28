from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_active_user
from app.db.session import get_db
from app.models.privacy import AuditAction
from app.models.user import User
from app.schemas.privacy import AcceptConsentRequest, AcceptConsentResponse, ConsentStatusResponse
from app.services.audit import write_audit_log
from app.services.consent import CURRENT_LGPD_POLICY_VERSION, accept_lgpd_consent, get_active_lgpd_consent

router = APIRouter(prefix="/privacy", tags=["privacy"])


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
