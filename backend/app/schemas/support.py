from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.chat import LanguageCode

SupportSender = Literal["USER", "BERGMANN"]


class SupportChatContextMessage(BaseModel):
    sender: SupportSender
    content: str = Field(min_length=1, max_length=2000)


class SupportChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: LanguageCode | None = None
    context_messages: list[SupportChatContextMessage] = Field(default_factory=list)


class SupportChatResponse(BaseModel):
    answer: str
    risk_level: str
    fallback: bool = False
    in_scope: bool = True
