from typing import Literal

from pydantic import BaseModel, Field

LanguageCode = Literal["pt-BR", "en", "es"]
Sender = Literal["USER", "BERGMANN"]


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = None
    language: LanguageCode | None = None


class ChatEditMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: LanguageCode | None = None


class ChatMessageResponse(BaseModel):
    session_id: str
    user_message_id: str | None = None
    assistant_message_id: str | None = None
    answer: str
    risk_level: str
    fallback: bool = False
    in_scope: bool = True


class VoiceChatResponse(ChatMessageResponse):
    transcript: str


class ChatHistoryMessage(BaseModel):
    id: str
    sender: Sender
    content: str
    risk_level: str
    created_at: str


class ChatHistoryResponse(BaseModel):
    session_id: str | None
    messages: list[ChatHistoryMessage]
