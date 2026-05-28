import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.billing import BillingWebhookPayload, BillingWebhookResponse
from app.services.billing_webhooks import apply_billing_webhook, verify_signature

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/webhook", response_model=BillingWebhookResponse)
async def billing_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    x_bergmann_billing_signature: str | None = Header(default=None),
) -> BillingWebhookResponse:
    settings = get_settings()
    if not settings.billing_webhooks_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billing webhooks disabled")
    if not settings.billing_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing webhook secret missing")

    body = await request.body()
    if not verify_signature(body, settings.billing_webhook_secret, x_bergmann_billing_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid billing signature")

    try:
        payload = BillingWebhookPayload.model_validate(json.loads(body.decode("utf-8")))
    except (json.JSONDecodeError, UnicodeDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid billing payload") from exc

    try:
        user, duplicate = apply_billing_webhook(db, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billing account not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported billing status") from exc

    return BillingWebhookResponse(
        status="duplicate" if duplicate else "processed",
        user_id=user.id,
        subscription_status=user.subscription_status.value,
        duplicate=duplicate,
    )
