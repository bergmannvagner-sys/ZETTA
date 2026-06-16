from sqlalchemy import case
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, ChatSession
from app.models.user import User

CHAT_CHANNEL = "CHAT"
SUPPORT_CHANNEL = "SUPPORT"


def turn_order_expression():
    return case((ChatMessage.sender == "USER", 0), else_=1)


def get_or_create_session(
    db: Session,
    user: User,
    session_id: str | None,
    *,
    channel: str = CHAT_CHANNEL,
) -> ChatSession:
    session = None
    if session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user.id, ChatSession.channel == channel)
            .first()
        )
    if session:
        return session

    session = ChatSession(user_id=user.id, channel=channel)
    db.add(session)
    db.flush()
    return session


def get_latest_session(db: Session, user: User, *, channel: str = CHAT_CHANNEL) -> ChatSession | None:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id, ChatSession.channel == channel)
        .order_by(ChatSession.created_at.desc())
        .first()
    )


def recent_context(
    db: Session,
    session: ChatSession,
    *,
    before_message: ChatMessage | None = None,
    limit: int = 10,
) -> list[dict[str, str]]:
    query = db.query(ChatMessage).filter(ChatMessage.session_id == session.id)
    if before_message:
        query = query.filter(ChatMessage.created_at < before_message.created_at)
    messages = query.order_by(ChatMessage.created_at.desc(), turn_order_expression().desc()).limit(limit).all()
    messages.reverse()
    return [{"sender": item.sender, "content": item.content} for item in messages]
