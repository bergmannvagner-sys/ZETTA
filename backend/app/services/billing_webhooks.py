import hmac
from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.billing import BillingWebhookEvent
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
    if payload.account_reference_id:
        filters.append(User.id == payload.account_reference_id)
    if payload.subscription_id:
        filters.append(User.billing_subscription_id == payload.subscription_id)
        if payload.provider == "MERCADO_PAGO":
            filters.append(User.id == payload.subscription_id)
    if payload.customer_id:
        filters.append(User.billing_customer_id == payload.customer_id)
    if not filters:
        return None
    return db.query(User).filter(or_(*filters)).first()


def find_duplicate_event_user(db: Session, event_id: str) -> User | None:
    return db.query(User).filter(User.billing_last_event_id == event_id).first()


def find_billing_webhook_event(db: Session, *, provider: str, event_id: str) -> BillingWebhookEvent | None:
    return (
        db.query(BillingWebhookEvent)
        .filter(BillingWebhookEvent.provider == provider, BillingWebhookEvent.event_id == event_id)
        .first()
    )


def get_or_create_billing_webhook_event(
    db: Session, payload: BillingWebhookPayload
) -> tuple[BillingWebhookEvent, bool]:
    event = find_billing_webhook_event(db, provider=payload.provider, event_id=payload.event_id)
    if event:
        return event, event.processing_status == "processed"

    event = BillingWebhookEvent(
        provider=payload.provider,
        event_id=payload.event_id,
        account_reference_id=payload.account_reference_id,
        customer_id=payload.customer_id,
        subscription_id=payload.subscription_id,
        external_status=payload.external_status,
        processing_status="received",
        duplicate=False,
        received_at=payload.occurred_at or datetime.now(UTC),
    )
    db.add(event)
    db.flush()
    return event, False


def apply_billing_webhook(db: Session, payload: BillingWebhookPayload) -> tuple[User, bool]:
    event, already_processed = get_or_create_billing_webhook_event(db, payload)
    if already_processed:
        duplicate = db.get(User, event.linked_user_id) if event.linked_user_id else find_billing_user(db, payload)
        if duplicate is None:
            raise LookupError("Billing account not found")
        write_audit_log(
            db,
            action=AuditAction.BILLING_WEBHOOK_PROCESSED,
            target_user_id=duplicate.id,
            resource_type="billing_webhook",
            resource_id=duplicate.id,
            metadata={
                "provider": payload.provider,
                "event_id": payload.event_id,
                "external_status": payload.external_status,
                "subscription_status": duplicate.subscription_status.value,
                "processing_status": "duplicate",
                "duplicate": True,
            },
        )
        db.commit()
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
    event.account_reference_id = payload.account_reference_id
    event.linked_user_id = user.id
    event.customer_id = payload.customer_id or user.billing_customer_id
    event.subscription_id = payload.subscription_id or user.billing_subscription_id
    event.external_status = payload.external_status
    event.processing_status = "processed"
    event.duplicate = False
    event.error = None
    event.processed_at = datetime.now(UTC)
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
            "has_account_reference_id": bool(payload.account_reference_id),
            "previous_status": previous_status.value,
            "subscription_status": user.subscription_status.value,
            "processing_status": "processed",
            "duplicate": False,
        },
    )
    db.commit()
    return user, False


def record_billing_webhook_error(
    db: Session,
    *,
    provider: str,
    event_id: str | None,
    external_status: str | None = None,
    customer_id: str | None = None,
    subscription_id: str | None = None,
    error: str,
) -> None:
    if event_id:
        event = find_billing_webhook_event(db, provider=provider, event_id=event_id)
        if event is None:
            event = BillingWebhookEvent(
                provider=provider,
                event_id=event_id,
                customer_id=customer_id,
                subscription_id=subscription_id,
                external_status=external_status,
                processing_status="error",
                duplicate=False,
                error=error,
                received_at=datetime.now(UTC),
                processed_at=datetime.now(UTC),
            )
            db.add(event)
        else:
            event.customer_id = customer_id or event.customer_id
            event.subscription_id = subscription_id or event.subscription_id
            event.external_status = external_status or event.external_status
            event.processing_status = "error"
            event.duplicate = False
            event.error = error
            event.processed_at = datetime.now(UTC)

    write_audit_log(
        db,
        action=AuditAction.BILLING_WEBHOOK_PROCESSED,
        resource_type="billing_webhook",
        resource_id=None,
        metadata={
            "provider": provider,
            "event_id": event_id,
            "external_status": external_status,
            "has_customer_id": bool(customer_id),
            "has_subscription_id": bool(subscription_id),
            "processing_status": "error",
            "duplicate": False,
            "error": error,
        },
    )
    db.commit()
