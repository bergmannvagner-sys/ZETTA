from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BillingWebhookPayload(BaseModel):
    provider: Literal["STRIPE"]
    event_id: str = Field(min_length=4, max_length=160)
    external_status: str = Field(min_length=2, max_length=64)
    customer_id: str | None = Field(default=None, max_length=120)
    subscription_id: str | None = Field(default=None, max_length=120)
    occurred_at: datetime | None = None


class BillingWebhookResponse(BaseModel):
    status: str
    user_id: str | None = None
    subscription_status: str | None = None
    duplicate: bool = False
