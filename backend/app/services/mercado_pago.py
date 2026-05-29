from __future__ import annotations

from typing import Any

import httpx

from app.core.config import Settings
from app.models.user import User
from app.services.commercial_plans import CommercialPlan

MERCADO_PAGO_PREFERENCES_URL = "https://api.mercadopago.com/checkout/preferences"


class MercadoPagoIntegrationError(ValueError):
    pass


def build_mercado_pago_preference_payload(
    *,
    settings: Settings,
    user: User,
    plan: CommercialPlan,
    amount_brl: float,
    title: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "items": [
            {
                "title": title or f"Bergmann - {plan.title}",
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": round(float(amount_brl), 2),
            }
        ],
        "payer": {
            "email": user.email,
            "name": user.full_name,
        },
        "external_reference": user.id,
        "metadata": {
            "user_id": user.id,
            "role": user.role.value,
            "subscription_plan": user.subscription_plan.value,
        },
    }
    back_urls = {
        "success": settings.mercado_pago_success_url,
        "failure": settings.mercado_pago_failure_url,
        "pending": settings.mercado_pago_pending_url,
    }
    clean_back_urls = {key: value for key, value in back_urls.items() if value}
    if clean_back_urls:
        payload["back_urls"] = clean_back_urls
    if settings.public_api_url:
        payload["notification_url"] = f"{settings.public_api_url.rstrip('/')}/billing/webhook"
    return payload


def create_mercado_pago_checkout_preference(
    *,
    settings: Settings,
    user: User,
    plan: CommercialPlan,
    amount_brl: float,
    title: str | None = None,
) -> dict[str, Any]:
    if not settings.mercado_pago_configured:
        raise MercadoPagoIntegrationError("Mercado Pago credentials are not configured")
    if not settings.mercado_pago_sandbox_mode:
        raise MercadoPagoIntegrationError("Mercado Pago sandbox mode is required for this MVP step")

    payload = build_mercado_pago_preference_payload(
        settings=settings,
        user=user,
        plan=plan,
        amount_brl=amount_brl,
        title=title,
    )
    try:
        response = httpx.post(
            MERCADO_PAGO_PREFERENCES_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.mercado_pago_access_token}"},
            timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise MercadoPagoIntegrationError("Mercado Pago rejected the checkout preference") from exc
    except httpx.HTTPError as exc:
        raise MercadoPagoIntegrationError("Mercado Pago checkout request failed") from exc

    data = response.json()
    preference_id = _as_text(data.get("id"))
    checkout_url = _as_text(data.get("init_point"))
    sandbox_checkout_url = _as_text(data.get("sandbox_init_point"))
    if not preference_id or not (checkout_url or sandbox_checkout_url):
        raise MercadoPagoIntegrationError("Mercado Pago returned an invalid checkout preference")
    return {
        "provider": "MERCADO_PAGO",
        "preference_id": preference_id,
        "checkout_url": sandbox_checkout_url or checkout_url,
        "sandbox_checkout_url": sandbox_checkout_url,
        "external_reference": user.id,
        "amount_brl": round(float(amount_brl), 2),
        "live_mode": bool(data.get("live_mode")),
    }


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
