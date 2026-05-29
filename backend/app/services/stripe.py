from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import Settings
from app.models.user import SubscriptionPlan, User

STRIPE_CHECKOUT_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions"


class StripeIntegrationError(ValueError):
    pass


def stripe_price_id_for_plan(settings: Settings, plan: SubscriptionPlan) -> str | None:
    if plan == SubscriptionPlan.PSYCHOLOGIST_PRO:
        return settings.stripe_price_id_psychologist
    if plan == SubscriptionPlan.COMPANY_NR1:
        return settings.stripe_price_id_company
    if plan == SubscriptionPlan.CLINIC:
        return settings.stripe_price_id_clinic
    if plan == SubscriptionPlan.SPONSOR:
        return settings.stripe_price_id_sponsor
    if plan == SubscriptionPlan.INSTITUTIONAL:
        return settings.stripe_price_id_institutional
    return None


def create_stripe_checkout_session(
    *,
    settings: Settings,
    user: User,
) -> dict[str, Any]:
    if not settings.stripe_configured:
        raise StripeIntegrationError("Stripe credentials are not configured")
    if settings.stripe_sandbox_mode and not settings.stripe_secret_key_is_test:
        raise StripeIntegrationError("Stripe sandbox mode requires a sk_test_ secret key")

    price_id = stripe_price_id_for_plan(settings, user.subscription_plan)
    if not price_id:
        raise StripeIntegrationError("Stripe Price ID is not configured for this plan")

    success_url = settings.stripe_success_url or "https://zetta-bergmann.onrender.com/billing/success"
    cancel_url = settings.stripe_cancel_url or "https://zetta-bergmann.onrender.com/billing/cancel"
    form = {
        "mode": "subscription",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": user.id,
        "customer_email": user.email,
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "metadata[user_id]": user.id,
        "metadata[role]": user.role.value,
        "metadata[subscription_plan]": user.subscription_plan.value,
        "subscription_data[metadata][user_id]": user.id,
        "subscription_data[metadata][role]": user.role.value,
        "subscription_data[metadata][subscription_plan]": user.subscription_plan.value,
    }
    try:
        response = httpx.post(
            STRIPE_CHECKOUT_SESSIONS_URL,
            content=urlencode(form),
            headers={
                "Authorization": f"Bearer {settings.stripe_secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise StripeIntegrationError("Stripe rejected the checkout session") from exc
    except httpx.HTTPError as exc:
        raise StripeIntegrationError("Stripe checkout request failed") from exc

    data = response.json()
    session_id = _as_text(data.get("id"))
    checkout_url = _as_text(data.get("url"))
    if not session_id or not checkout_url:
        raise StripeIntegrationError("Stripe returned an invalid checkout session")
    return {
        "provider": "STRIPE",
        "session_id": session_id,
        "checkout_url": checkout_url,
        "client_reference_id": user.id,
        "price_id": price_id,
        "live_mode": bool(data.get("livemode")),
    }


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
