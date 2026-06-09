from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TelecareProviderResponse(BaseModel):
    id: str
    full_name: str
    role: str
    session_price_brl: float
    platform_fee_percent: float
    platform_fee_brl: float
    provider_payout_brl: float
    accepts_telecare: bool


class TelecareSessionCreate(BaseModel):
    provider_user_id: str
    notes: str | None = Field(default=None, max_length=1000)
    scheduled_for: datetime | None = None


class TelecareSessionStatusUpdate(BaseModel):
    status: Literal["ACCEPTED", "IN_SESSION", "COMPLETED", "CANCELED"]


class TelecareSessionResponse(BaseModel):
    id: str
    requester_user_id: str
    requester_name: str
    provider_user_id: str
    provider_name: str
    provider_role: str
    status: str
    room_code: str
    session_price_brl: float
    platform_fee_percent: float
    platform_fee_brl: float
    provider_payout_brl: float
    payment_status: str
    notes: str | None
    requested_at: datetime
    scheduled_for: datetime | None
    updated_at: datetime
    room_title: str = "Sala ZETTA de teleatendimento"
    video_engine_status: str = "DAILY_NOT_CONFIGURED"


class TelecareJoinResponse(BaseModel):
    session_id: str
    room_code: str
    provider_name: str
    requester_name: str
    join_url: str
    expires_at: datetime
    video_engine: str = "DAILY"
