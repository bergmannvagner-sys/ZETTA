from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect, status
from sqlalchemy import or_
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
    VoiceChatResponse,
)
from app.services.chat_sessions import get_latest_session, get_or_create_session, recent_context, turn_order_expression
from app.services.audit import write_audit_log
from app.services.consent import get_active_lgpd_consent
from app.services.groq import ask_bergmann
from app.services.rate_limit import client_identifier, enforce_rate_limit, rate_limit_key
from app.services.voice import transcribe_voice_audio

router = APIRouter(prefix="/chat", tags=["chat"])

MAX_VOICE_AUDIO_BYTES = 15 * 1024 * 1024
ALLOWED_VOICE_CONTENT_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
    "application/octet-stream",
}
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
    session = get_or_create_session(db, user, session_id)
    context_messages = recent_context(db, session)

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


@router.post("/voice", response_model=VoiceChatResponse)
async def voice_message(
    request: Request,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
    audio: UploadFile = File(...),
    session_id: str | None = Form(default=None),
    language: str | None = Form(default=None),
) -> VoiceChatResponse:
    _require_common_chat_user(user)
    settings = get_settings()
    enforce_rate_limit(
        key=rate_limit_key("chat-voice", user.id, client_identifier(request)),
        max_requests=settings.chat_rate_limit_requests,
        window_seconds=settings.chat_rate_limit_window_seconds,
    )

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Audio file is empty")
    if len(audio_bytes) > MAX_VOICE_AUDIO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Audio file too large")
    normalized_content_type = (audio.content_type or "").split(";", 1)[0].strip().lower()
    if normalized_content_type and normalized_content_type not in ALLOWED_VOICE_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported audio format")

    transcript = await transcribe_voice_audio(
        audio_bytes=audio_bytes,
        filename=audio.filename or "voice-message.webm",
        content_type=normalized_content_type or audio.content_type,
        language=language,
    )
    transcript = transcript.strip()
    if not transcript:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not transcribe audio")

    response = await _store_chat_turn(
        db=db,
        user=user,
        message_text=transcript,
        session_id=session_id,
        language=language,
    )
    return VoiceChatResponse(**response.model_dump(), transcript=transcript)


@router.get("/history", response_model=ChatHistoryResponse)
def history(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
    limit: int = 80,
) -> ChatHistoryResponse:
    _require_common_chat_user(user)
    session = get_latest_session(db, user)
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
    if not session or session.user_id != user.id or session.channel != "CHAT":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User message not found")

    context_messages = recent_context(db, session, before_message=target)
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
