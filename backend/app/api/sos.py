from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.db.session import get_db
from app.models.sos import SOSEvent
from app.models.privacy import AuditAction
from app.models.user import User
from app.schemas.sos import SOSEventRequest, SOSEventResponse
from app.services.audit import write_audit_log

router = APIRouter(prefix="/sos", tags=["sos"])

SAFETY_MESSAGE = (
    "Evento SOS registrado. Se houver risco imediato, ligue para a emergência local agora. "
    "No Brasil, o CVV atende pelo 188. Tente ficar perto de alguém de confiança e afaste "
    "objetos que possam te machucar."
)


@router.post("/event", response_model=SOSEventResponse)
def create_sos_event(
    payload: SOSEventRequest,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> SOSEventResponse:
    event = SOSEvent(user_id=user.id, intensity=payload.intensity, message=payload.message)
    db.add(event)
    db.flush()
    write_audit_log(
        db,
        action=AuditAction.SOS_EVENT_CREATED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="sos_event",
        resource_id=event.id,
        metadata={"intensity": event.intensity},
    )
    db.commit()
    db.refresh(event)
    return SOSEventResponse(id=event.id, safety_message=SAFETY_MESSAGE)
