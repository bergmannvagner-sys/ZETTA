from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.db.session import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.privacy import AuditAction
from app.models.user import User, UserRole
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
from app.services.groq import ask_bergmann
from app.services.audit import write_audit_log

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatMessageResponse)
async def message(
    payload: ChatMessageRequest,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> ChatMessageResponse:
    if user.role not in {UserRole.USER, UserRole.SUPER_ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common area allowed")

    session = None
    if payload.session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == payload.session_id, ChatSession.user_id == user.id)
            .first()
        )
    if not session:
        session = ChatSession(user_id=user.id)
        db.add(session)
        db.flush()

    db.add(ChatMessage(session_id=session.id, sender="USER", content=payload.message))
    answer, risk_level, fallback = await ask_bergmann(payload.message)
    db.add(ChatMessage(session_id=session.id, sender="BERGMANN", content=answer, risk_level=risk_level))
    write_audit_log(
        db,
        action=AuditAction.CHAT_MESSAGE_CREATED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="chat_session",
        resource_id=session.id,
        metadata={"risk_level": risk_level, "fallback": fallback},
    )
    db.commit()
    return ChatMessageResponse(
        session_id=session.id,
        answer=answer,
        risk_level=risk_level,
        fallback=fallback,
    )
