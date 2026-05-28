from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = None


class ChatMessageResponse(BaseModel):
    session_id: str
    answer: str
    risk_level: str
    fallback: bool = False
