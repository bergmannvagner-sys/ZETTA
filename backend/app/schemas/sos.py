from pydantic import BaseModel, Field


class SOSEventRequest(BaseModel):
    intensity: str = Field(default="HIGH", max_length=24)
    message: str | None = Field(default=None, max_length=1000)


class SOSEventResponse(BaseModel):
    id: str
    safety_message: str
