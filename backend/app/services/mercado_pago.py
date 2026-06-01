from __future__ import annotations

import hmac
from hashlib import sha256
from typing import Any

import httpx

from app.core.config import Settings
from app.models.user import User
from app.schemas.billing import BillingWebhookPayload
from app.services.commercial_plans import commercial_plan_for_role

MERCADO_PAGO_PREFERENCES_URL = "https://api.mercadopago.com/checkout/preferences"
MERCADO_PAGO_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments/{payment_id}"


class MercadoPagoIntegrationError(ValueError):
    pass


def create_mercado_pago_checkout_preference(
    *,
    settings: Settings,
    user: User,
) -> dict[str, Any]:
    if not settings.mercado_pago_configured:
        raise MercadoPagoIntegrationError("Mercado Pago credentials are not configured")

    plan = commercial_plan_for_role(user.role)
    if not plan:
        raise MercadoPagoIntegrationError("Mercado Pago plan is not configured for this account")

    public_api_url = (settings.public_api_url or "https://zetta-bergmann.onrender.com").rstrip("/")
    success_url = settings.mercado_pago_success_url or f"{public_api_url}/billing/success"
    pending_url = settings.mercado_pago_pending_url or f"{public_api_url}/billing/pending"
    failure_url = settings.mercado_pago_failure_url or f"{public_api_url}/billing/failure"
    notification_url = f"{public_api_url}/billing/mercado-pago/webhook"
    payload = {
        "items": [
            {
                "id": user.subscription_plan.value,
                "title": plan.title,
                "description": plan.description,
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": float(plan.price_brl),
            }
        ],
        "payer": {
            "email": user.email,
            "name": user.full_name,
        },
        "back_urls": {
            "success": success_url,
            "pending": pending_url,
            "failure": failure_url,
        },
        "notification_url": notification_url,
        "auto_return": "approved",
        "external_reference": user.id,
        "metadata": {
            "user_id": user.id,
            "role": user.role.value,
            "subscription_plan": user.subscription_plan.value,
        },
    }
    try:
        response = httpx.post(
            MERCADO_PAGO_PREFERENCES_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.mercado_pago_access_token}",
                "Content-Type": "application/json",
            },
            timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise MercadoPagoIntegrationError("Mercado Pago rejected the checkout preference") from exc
    except httpx.HTTPError as exc:
        raise MercadoPagoIntegrationError("Mercado Pago checkout preference request failed") from exc

    data = response.json()
    preference_id = _as_text(data.get("id"))
    checkout_url = _as_text(data.get("init_point"))
    if not preference_id or not checkout_url:
        raise MercadoPagoIntegrationError("Mercado Pago returned an invalid checkout preference")
    return {
        "provider": "MERCADO_PAGO",
        "preference_id": preference_id,
        "checkout_url": checkout_url,
        "client_reference_id": user.id,
        "price_brl": float(plan.price_brl),
    }


def verify_mercado_pago_signature(
    *,
    data_id: str,
    request_id: str | None,
    signature: str | None,
    secret: str | None,
) -> bool:
    if not secret or not request_id or not signature:
        return False
    parts = _signature_parts(signature)
    timestamp = parts.get("ts")
    expected_hash = parts.get("v1")
    if not timestamp or not expected_hash:
        return False
    manifest = f"id:{data_id};request-id:{request_id};ts:{timestamp};"
    actual_hash = hmac.new(secret.encode("utf-8"), manifest.encode("utf-8"), sha256).hexdigest()
    return hmac.compare_digest(actual_hash, expected_hash)


def fetch_mercado_pago_payment(*, settings: Settings, payment_id: str) -> dict[str, Any]:
    if not settings.mercado_pago_access_token:
        raise MercadoPagoIntegrationError("Mercado Pago access token is not configured")
    try:
        response = httpx.get(
            MERCADO_PAGO_PAYMENTS_URL.format(payment_id=payment_id),
            headers={"Authorization": f"Bearer {settings.mercado_pago_access_token}"},
            timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise MercadoPagoIntegrationError("Mercado Pago rejected the payment lookup") from exc
    except httpx.HTTPError as exc:
        raise MercadoPagoIntegrationError("Mercado Pago payment lookup failed") from exc

    data = response.json()
    return data if isinstance(data, dict) else {}


def billing_payload_from_mercado_pago_payment(payment: dict[str, Any]) -> BillingWebhookPayload:
    payment_id = _as_text(payment.get("id"))
    status = _as_text(payment.get("status"))
    payer_email = _payer_email(payment)
    if not payment_id or not status:
        raise MercadoPagoIntegrationError("Mercado Pago payment payload is incomplete")
    return BillingWebhookPayload(
        provider="MERCADO_PAGO",
        event_id=payment_id,
        external_status=status,
        customer_id=payer_email,
        subscription_id=_as_text(payment.get("external_reference")),
    )


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _signature_parts(signature: str) -> dict[str, str]:
    parts: dict[str, str] = {}
    for item in signature.split(","):
        key, separator, value = item.partition("=")
        if separator:
            parts[key.strip()] = value.strip()
    return parts


def _payer_email(payment: dict[str, Any]) -> str | None:
    payer = payment.get("payer")
    if isinstance(payer, dict):
        return _as_text(payer.get("email"))
    return None
