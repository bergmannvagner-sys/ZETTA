from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.core.config import get_settings
from app.db.session import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.privacy import AuditAction
from app.models.user import User, UserRole
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
from app.services.groq import ask_bergmann
from app.services.audit import write_audit_log
from app.services.rate_limit import client_identifier, enforce_rate_limit, rate_limit_key

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatMessageResponse)
async def message(
    payload: ChatMessageRequest,
    request: Request,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> ChatMessageResponse:
    if user.role not in {UserRole.USER, UserRole.SUPER_ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common area allowed")
    settings = get_settings()
    enforce_rate_limit(
        key=rate_limit_key("chat-message", user.id, client_identifier(request)),
        max_requests=settings.chat_rate_limit_requests,
        window_seconds=settings.chat_rate_limit_window_seconds,
    )

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
    answer, risk_level, fallback, in_scope = await ask_bergmann(payload.message)
    db.add(ChatMessage(session_id=session.id, sender="BERGMANN", content=answer, risk_level=risk_level))
    write_audit_log(
        db,
        action=AuditAction.CHAT_MESSAGE_CREATED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="chat_session",
        resource_id=session.id,
        metadata={"risk_level": risk_level, "fallback": fallback, "in_scope": in_scope},
    )
    db.commit()
    return ChatMessageResponse(
        session_id=session.id,
        answer=answer,
        risk_level=risk_level,
        fallback=fallback,
        in_scope=in_scope,
    )
