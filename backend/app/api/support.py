from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.schemas.support import SupportChatRequest, SupportChatResponse
from app.services.groq import ask_support_bergmann
from app.services.rate_limit import client_identifier, enforce_rate_limit, rate_limit_key

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/message", response_model=SupportChatResponse)
async def message(
    payload: SupportChatRequest,
    request: Request,
) -> SupportChatResponse:
    settings = get_settings()
    enforce_rate_limit(
        key=rate_limit_key("support-message", client_identifier(request)),
        max_requests=settings.chat_rate_limit_requests,
        window_seconds=settings.chat_rate_limit_window_seconds,
    )
    answer, risk_level, fallback, in_scope = await ask_support_bergmann(
        payload.message,
        payload.language,
        context_messages=[item.model_dump() for item in payload.context_messages],
    )
    return SupportChatResponse(
        answer=answer,
        risk_level=risk_level,
        fallback=fallback,
        in_scope=in_scope,
    )
