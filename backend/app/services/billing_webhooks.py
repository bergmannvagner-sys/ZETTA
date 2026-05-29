import hmac
from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.privacy import AuditAction
from app.models.user import SubscriptionStatus, User
from app.schemas.billing import BillingWebhookPayload
from app.services.audit import write_audit_log


STATUS_MAP: dict[str, SubscriptionStatus] = {
    "trial": SubscriptionStatus.PENDING,
    "trialing": SubscriptionStatus.PENDING,
    "active": SubscriptionStatus.ACTIVE,
    "paid": SubscriptionStatus.ACTIVE,
    "approved": SubscriptionStatus.ACTIVE,
    "past_due": SubscriptionStatus.PAST_DUE,
    "unpaid": SubscriptionStatus.PAST_DUE,
    "payment_failed": SubscriptionStatus.PAST_DUE,
    "incomplete": SubscriptionStatus.PAST_DUE,
    "expired": SubscriptionStatus.PAST_DUE,
    "canceled": SubscriptionStatus.CANCELED,
    "cancelled": SubscriptionStatus.CANCELED,
}


def build_signature(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body, sha256).hexdigest()


def verify_signature(body: bytes, secret: str, signature: str | None) -> bool:
    if not signature:
        return False
    return hmac.compare_digest(build_signature(body, secret), signature.strip())


def map_external_status(value: str) -> SubscriptionStatus | None:
    return STATUS_MAP.get(value.strip().lower())


def find_billing_user(db: Session, payload: BillingWebhookPayload) -> User | None:
    filters = []
    if payload.subscription_id:
        filters.append(User.billing_subscription_id == payload.subscription_id)
    if payload.customer_id:
        filters.append(User.billing_customer_id == payload.customer_id)
    if not filters:
        return None
    return db.query(User).filter(or_(*filters)).first()


def find_duplicate_event_user(db: Session, event_id: str) -> User | None:
    return db.query(User).filter(User.billing_last_event_id == event_id).first()


def apply_billing_webhook(db: Session, payload: BillingWebhookPayload) -> tuple[User, bool]:
    duplicate = find_duplicate_event_user(db, payload.event_id)
    if duplicate:
        return duplicate, True

    user = find_billing_user(db, payload)
    if user is None:
        raise LookupError("Billing account not found")

    mapped_status = map_external_status(payload.external_status)
    if mapped_status is None:
        raise ValueError("Unsupported billing status")

    previous_status = user.subscription_status
    user.subscription_status = mapped_status
    user.billing_provider = payload.provider
    user.billing_customer_id = payload.customer_id or user.billing_customer_id
    user.billing_subscription_id = payload.subscription_id or user.billing_subscription_id
    user.billing_last_event_id = payload.event_id
    user.billing_last_event_at = payload.occurred_at or datetime.now(UTC)
    write_audit_log(
        db,
        action=AuditAction.BILLING_WEBHOOK_PROCESSED,
        target_user_id=user.id,
        resource_type="billing_webhook",
        resource_id=user.id,
        metadata={
            "provider": payload.provider,
            "event_id": payload.event_id,
            "external_status": payload.external_status,
            "previous_status": previous_status.value,
            "subscription_status": user.subscription_status.value,
        },
    )
    db.commit()
    return user, False
