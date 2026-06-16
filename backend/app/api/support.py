from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import require_active_user
from app.core.config import get_settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.chat import ChatMessage
from app.models.privacy import AuditAction
from app.models.user import AccountStatus, User
from app.schemas.chat import ChatHistoryMessage, ChatHistoryResponse
from app.schemas.support import SupportChatRequest, SupportChatResponse
from app.services.audit import write_audit_log
from app.services.chat_sessions import SUPPORT_CHANNEL, get_latest_session, get_or_create_session, recent_context, turn_order_expression
from app.services.groq import ask_support_bergmann
from app.services.rate_limit import client_identifier, enforce_rate_limit, rate_limit_key

router = APIRouter(prefix="/support", tags=["support"])
bearer_scheme = HTTPBearer(auto_error=False)


def _serialize_message(message: ChatMessage) -> ChatHistoryMessage:
    return ChatHistoryMessage(
        id=message.id,
        sender=message.sender,
        content=message.content,
        risk_level=message.risk_level,
        created_at=message.created_at.isoformat(),
    )


def _resolve_optional_user(
    db: Session,
    credentials: HTTPAuthorizationCredentials | None,
) -> User | None:
    if credentials is None:
        return None

    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("type") != "access" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status == AccountStatus.ARCHIVED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account archived")
    if user.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending verification")
    return user


def _get_support_session(db: Session, user: User, session_id: str | None):
    if session_id:
        return get_or_create_session(db, user, session_id, channel=SUPPORT_CHANNEL)

    session = get_latest_session(db, user, channel=SUPPORT_CHANNEL)
    if session:
        return session
    return get_or_create_session(db, user, None, channel=SUPPORT_CHANNEL)


@router.get("/history", response_model=ChatHistoryResponse)
def history(
    user: Annotated[User, Depends(require_active_user)],
    db: Session = Depends(get_db),
    limit: int = 80,
) -> ChatHistoryResponse:
    session = get_latest_session(db, user, channel=SUPPORT_CHANNEL)
    if not session:
        return ChatHistoryResponse(session_id=None, messages=[])

    safe_limit = max(1, min(limit, 160))
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc(), turn_order_expression().desc())
        .limit(safe_limit)
        .all()
    )
    messages.reverse()
    return ChatHistoryResponse(
        session_id=session.id,
        messages=[_serialize_message(message) for message in messages],
    )


@router.post("/message", response_model=SupportChatResponse)
async def message(
    payload: SupportChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> SupportChatResponse:
    settings = get_settings()
    enforce_rate_limit(
        key=rate_limit_key("support-message", (payload.session_id or client_identifier(request))),
        max_requests=settings.chat_rate_limit_requests,
        window_seconds=settings.chat_rate_limit_window_seconds,
    )

    user = _resolve_optional_user(db, credentials)
    session = None
    if user:
        session = _get_support_session(db, user, payload.session_id)

    context_messages = recent_context(db, session) if session else []
    if not context_messages and payload.context_messages:
        context_messages = [item.model_dump() for item in payload.context_messages]

    answer, risk_level, fallback, in_scope = await ask_support_bergmann(
        payload.message,
        payload.language,
        context_messages=context_messages,
    )

    response_session_id = session.id if session else None
    if session:
        user_message = ChatMessage(session_id=session.id, sender="USER", content=payload.message)
        assistant_message = ChatMessage(
            session_id=session.id,
            sender="BERGMANN",
            content=answer,
            risk_level=risk_level,
        )
        db.add(user_message)
        db.add(assistant_message)
        db.flush()
        write_audit_log(
            db,
            action=AuditAction.CHAT_MESSAGE_CREATED,
            actor_user_id=user.id if user else None,
            target_user_id=user.id if user else None,
            resource_type="support_session",
            resource_id=session.id,
            metadata={
                "risk_level": risk_level,
                "fallback": fallback,
                "in_scope": in_scope,
                "support": True,
            },
        )
        db.commit()

    return SupportChatResponse(
        session_id=response_session_id,
        answer=answer,
        risk_level=risk_level,
        fallback=fallback,
        in_scope=in_scope,
    )
