from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.chat import LanguageCode

SupportSender = Literal["USER", "BERGMANN"]


class SupportChatContextMessage(BaseModel):
    sender: SupportSender
    content: str = Field(min_length=1, max_length=2000)


class SupportChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = None
    language: LanguageCode | None = None
    context_messages: list[SupportChatContextMessage] = Field(default_factory=list)


class SupportChatResponse(BaseModel):
    session_id: str | None = None
    answer: str
    risk_level: str
    fallback: bool = False
    in_scope: bool = True
