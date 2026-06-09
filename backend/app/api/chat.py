from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy import case, or_
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.core.config import get_settings
from app.core.security import decode_token
from app.db.session import SessionLocal, get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.privacy import AuditAction
from app.models.user import AccountStatus, User, UserRole
from app.schemas.chat import (
    ChatEditMessageRequest,
    ChatHistoryMessage,
    ChatHistoryResponse,
    ChatMessageRequest,
    ChatMessageResponse,
)
from app.services.audit import write_audit_log
from app.services.consent import get_active_lgpd_consent
from app.services.groq import ask_bergmann
from app.services.rate_limit import client_identifier, enforce_rate_limit, rate_limit_key

router = APIRouter(prefix="/chat", tags=["chat"])


def _get_or_create_session(db: Session, user: User, session_id: str | None) -> ChatSession:
    session = None
    if session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
            .first()
        )
    if session:
        return session
    session = ChatSession(user_id=user.id)
    db.add(session)
    db.flush()
    return session


def _get_latest_session(db: Session, user: User) -> ChatSession | None:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .first()
    )


def _require_common_chat_user(user: User) -> None:
    if user.role not in {UserRole.USER, UserRole.SUPER_ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common area allowed")


def _serialize_message(message: ChatMessage) -> ChatHistoryMessage:
    return ChatHistoryMessage(
        id=message.id,
        sender=message.sender,
        content=message.content,
        risk_level=message.risk_level,
        created_at=message.created_at.isoformat(),
    )


def _turn_order_expression():
    return case((ChatMessage.sender == "USER", 0), else_=1)


def _recent_context(
    db: Session,
    session: ChatSession,
    *,
    before_message: ChatMessage | None = None,
    limit: int = 10,
) -> list[dict[str, str]]:
    query = db.query(ChatMessage).filter(ChatMessage.session_id == session.id)
    if before_message:
        query = query.filter(ChatMessage.created_at < before_message.created_at)
    messages = query.order_by(ChatMessage.created_at.desc(), _turn_order_expression().desc()).limit(limit).all()
    messages.reverse()
    return [{"sender": item.sender, "content": item.content} for item in messages]


def _require_realtime_user(db: Session, token: str | None) -> User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    if payload.get("type") != "access" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending verification")
    if user.role != UserRole.SUPER_ADMIN and not get_active_lgpd_consent(db, user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="LGPD consent required")
    _require_common_chat_user(user)
    return user


async def _store_chat_turn(
    *,
    db: Session,
    user: User,
    message_text: str,
    session_id: str | None,
    language: str | None,
) -> ChatMessageResponse:
    session = _get_or_create_session(db, user, session_id)
    context_messages = _recent_context(db, session)

    user_message = ChatMessage(session_id=session.id, sender="USER", content=message_text)
    db.add(user_message)
    db.flush()

    answer, risk_level, fallback, in_scope = await ask_bergmann(
        message_text,
        language,
        context_messages=context_messages,
        user_name=user.full_name,
    )
    assistant_message = ChatMessage(
        session_id=session.id,
        sender="BERGMANN",
        content=answer,
        risk_level=risk_level,
    )
    db.add(assistant_message)
    db.flush()

    write_audit_log(
        db,
        action=AuditAction.CHAT_MESSAGE_CREATED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="chat_session",
        resource_id=session.id,
        metadata={
            "risk_level": risk_level,
            "fallback": fallback,
            "in_scope": in_scope,
            "user_message_id": user_message.id,
            "assistant_message_id": assistant_message.id,
        },
    )
    db.commit()
    return ChatMessageResponse(
        session_id=session.id,
        user_message_id=user_message.id,
        assistant_message_id=assistant_message.id,
        answer=answer,
        risk_level=risk_level,
        fallback=fallback,
        in_scope=in_scope,
    )


@router.get("/history", response_model=ChatHistoryResponse)
def history(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
    limit: int = 80,
) -> ChatHistoryResponse:
    _require_common_chat_user(user)
    session = _get_latest_session(db, user)
    if not session:
        return ChatHistoryResponse(session_id=None, messages=[])

    safe_limit = max(1, min(limit, 160))
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc(), _turn_order_expression().desc())
        .limit(safe_limit)
        .all()
    )
    messages.reverse()
    return ChatHistoryResponse(
        session_id=session.id,
        messages=[_serialize_message(message) for message in messages],
    )


@router.post("/message", response_model=ChatMessageResponse)
async def message(
    payload: ChatMessageRequest,
    request: Request,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> ChatMessageResponse:
    _require_common_chat_user(user)
    settings = get_settings()
    enforce_rate_limit(
        key=rate_limit_key("chat-message", user.id, client_identifier(request)),
        max_requests=settings.chat_rate_limit_requests,
        window_seconds=settings.chat_rate_limit_window_seconds,
    )

    return await _store_chat_turn(
        db=db,
        user=user,
        message_text=payload.message,
        session_id=payload.session_id,
        language=payload.language,
    )


@router.patch("/messages/{message_id}", response_model=ChatMessageResponse)
async def edit_message(
    message_id: str,
    payload: ChatEditMessageRequest,
    request: Request,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> ChatMessageResponse:
    _require_common_chat_user(user)
    settings = get_settings()
    enforce_rate_limit(
        key=rate_limit_key("chat-edit", user.id, client_identifier(request)),
        max_requests=settings.chat_rate_limit_requests,
        window_seconds=settings.chat_rate_limit_window_seconds,
    )

    target = db.get(ChatMessage, message_id)
    if not target or target.sender != "USER":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User message not found")

    session = db.get(ChatSession, target.session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User message not found")

    context_messages = _recent_context(db, session, before_message=target)
    discarded_count = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.session_id == session.id,
            ChatMessage.id != target.id,
            or_(
                ChatMessage.created_at > target.created_at,
                (ChatMessage.created_at == target.created_at) & (ChatMessage.sender == "BERGMANN"),
            ),
        )
        .delete(synchronize_session=False)
    )
    target.content = payload.message

    answer, risk_level, fallback, in_scope = await ask_bergmann(
        payload.message,
        payload.language,
        context_messages=context_messages,
        user_name=user.full_name,
    )
    assistant_message = ChatMessage(
        session_id=session.id,
        sender="BERGMANN",
        content=answer,
        risk_level=risk_level,
    )
    db.add(assistant_message)
    db.flush()

    write_audit_log(
        db,
        action=AuditAction.CHAT_MESSAGE_CREATED,
        actor_user_id=user.id,
        target_user_id=user.id,
        resource_type="chat_session",
        resource_id=session.id,
        metadata={
            "risk_level": risk_level,
            "fallback": fallback,
            "in_scope": in_scope,
            "edited_user_message_id": target.id,
            "assistant_message_id": assistant_message.id,
            "discarded_following_messages": discarded_count,
        },
    )
    db.commit()

    return ChatMessageResponse(
        session_id=session.id,
        user_message_id=target.id,
        assistant_message_id=assistant_message.id,
        answer=answer,
        risk_level=risk_level,
        fallback=fallback,
        in_scope=in_scope,
    )


@router.websocket("/realtime")
async def realtime(websocket: WebSocket) -> None:
    await websocket.accept()
    db = SessionLocal()
    user: User | None = None
    language: str | None = None
    try:
        auth_payload = await websocket.receive_json()
        token = auth_payload.get("access_token") if isinstance(auth_payload, dict) else None
        language = auth_payload.get("language") if isinstance(auth_payload, dict) else None
        user = _require_realtime_user(db, token)
        await websocket.send_json({"type": "ready"})

        settings = get_settings()
        while True:
            payload = await websocket.receive_json()
            if not isinstance(payload, dict) or payload.get("type") != "message":
                await websocket.send_json({"type": "error", "message": "Mensagem em tempo real inválida."})
                continue
            message_text = str(payload.get("message") or "").strip()
            if not message_text:
                await websocket.send_json({"type": "error", "message": "Escreva uma mensagem antes de enviar."})
                continue
            if len(message_text) > 2000:
                await websocket.send_json({"type": "error", "message": "Mensagem muito longa."})
                continue

            client_host = websocket.client.host if websocket.client else "unknown"
            enforce_rate_limit(
                key=rate_limit_key("chat-realtime", user.id, client_host),
                max_requests=settings.chat_rate_limit_requests,
                window_seconds=settings.chat_rate_limit_window_seconds,
            )
            await websocket.send_json({"type": "typing"})
            response = await _store_chat_turn(
                db=db,
                user=user,
                message_text=message_text,
                session_id=payload.get("session_id"),
                language=str(payload.get("language") or language or ""),
            )
            await websocket.send_json({"type": "answer", **response.model_dump()})
    except WebSocketDisconnect:
        return
    except HTTPException as exc:
        await websocket.send_json({"type": "error", "status": exc.status_code, "message": exc.detail})
        await websocket.close(code=1008)
    except Exception:
        await websocket.send_json({"type": "error", "message": "Não foi possível manter a conversa em tempo real."})
        await websocket.close(code=1011)
    finally:
        db.close()
