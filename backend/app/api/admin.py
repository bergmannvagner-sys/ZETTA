import json
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import AccountStatus, SubscriptionStatus, User, UserRole
from app.models.privacy import AuditAction, AuditLog
from app.schemas.user import (
    AdminOperationsSummaryResponse,
    AdminAlertResponse,
    AuditLogResponse,
    BillingConfigResponse,
    BillingPendingAlertResponse,
    BillingPendingAlertStatusResponse,
    BillingReferenceUpdateRequest,
    BillingWebhookMonitorResponse,
    CommercialPlanResponse,
    EmailConfigResponse,
    MercadoPagoCheckoutRequest,
    MercadoPagoCheckoutResponse,
    ModerationAccountRequest,
    PendingAccountResponse,
    SubscriptionAccountResponse,
    SubscriptionStatusUpdateRequest,
)
from app.services.audit import write_audit_log
from app.services.billing import approval_subscription_status_for_role
from app.services.billing_webhooks import STATUS_MAP
from app.services.commercial_plans import commercial_plan_for_role, list_commercial_plans
from app.services.email import send_admin_alert_email
from app.services.mercado_pago import MercadoPagoIntegrationError, create_mercado_pago_checkout_preference
from app.services.payment_adapters import list_payment_adapter_capabilities, validate_billing_reference
from app.services.verification import build_verification_triage

router = APIRouter(prefix="/admin", tags=["admin"])

PAID_ADMIN_ROLES = {
    UserRole.PSYCHOLOGIST,
    UserRole.COMPANY,
    UserRole.NGO,
    UserRole.HOSPITAL,
    UserRole.CLINIC,
    UserRole.SPONSOR,
    UserRole.PUBLIC_INSTITUTION,
}


def clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def parse_audit_metadata(metadata_json: str | None) -> dict[str, object] | None:
    if not metadata_json:
        return None
    try:
        parsed = json.loads(metadata_json)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def audit_event_id(log: AuditLog | None) -> str | None:
    metadata = parse_audit_metadata(log.metadata_json if log else None)
    if not metadata:
        return None
    value = metadata.get("event_id") or metadata.get("preference_id")
    return str(value).strip() if value else None


def audit_external_status(log: AuditLog | None) -> str | None:
    metadata = parse_audit_metadata(log.metadata_json if log else None)
    if not metadata:
        return None
    value = metadata.get("external_status")
    return str(value).strip() if value else None


def audit_metadata_text(metadata: dict[str, object] | None, key: str) -> str | None:
    if not metadata:
        return None
    value = metadata.get(key)
    return str(value).strip() if value is not None else None


def audit_metadata_bool(metadata: dict[str, object] | None, key: str) -> bool:
    if not metadata:
        return False
    return bool(metadata.get(key))


def audit_metadata_int(metadata: dict[str, object] | None, key: str) -> int | None:
    if not metadata:
        return None
    value = metadata.get(key)
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            return None
    return None


def latest_audit_logs_by_user(
    db: Session,
    *,
    user_ids: list[str],
    resource_type: str,
) -> dict[str, AuditLog]:
    if not user_ids:
        return {}
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.target_user_id.in_(user_ids), AuditLog.resource_type == resource_type)
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    latest: dict[str, AuditLog] = {}
    for log in logs:
        if log.target_user_id and log.target_user_id not in latest:
            latest[log.target_user_id] = log
    return latest


def aware_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def billing_webhook_monitor_response(
    log: AuditLog,
    users_by_id: dict[str, User],
) -> BillingWebhookMonitorResponse:
    metadata = parse_audit_metadata(log.metadata_json) or {}
    linked_user = users_by_id.get(log.target_user_id or "")
    processing_status = audit_metadata_text(metadata, "processing_status")
    if not processing_status:
        processing_status = "error" if metadata.get("error") else "processed"
    return BillingWebhookMonitorResponse(
        id=log.id,
        provider=audit_metadata_text(metadata, "provider"),
        processing_status=processing_status,
        event_id=audit_metadata_text(metadata, "event_id"),
        external_status=audit_metadata_text(metadata, "external_status"),
        subscription_status=audit_metadata_text(metadata, "subscription_status"),
        linked_user_id=linked_user.id if linked_user else log.target_user_id,
        linked_user_email=linked_user.email if linked_user else None,
        linked_user_name=linked_user.full_name if linked_user else None,
        duplicate=audit_metadata_bool(metadata, "duplicate"),
        error=audit_metadata_text(metadata, "error"),
        received_at=log.created_at.isoformat(),
    )


def admin_alert_response(log: AuditLog) -> AdminAlertResponse:
    metadata = parse_audit_metadata(log.metadata_json) or {}
    alert_type = audit_metadata_text(metadata, "alert_type")
    if not alert_type:
        alert_type = "PENDING_FINANCIAL" if log.resource_type == "billing_pending_alert" else "ADMIN_EMAIL"
    return AdminAlertResponse(
        id=log.id,
        alert_type=alert_type,
        source=log.resource_type,
        email_sent=audit_metadata_bool(metadata, "email_sent"),
        admin_recipient_configured=audit_metadata_bool(metadata, "admin_recipient_configured"),
        subject=audit_metadata_text(metadata, "subject"),
        trigger=audit_metadata_text(metadata, "trigger"),
        days_threshold=audit_metadata_int(metadata, "days_threshold"),
        checked_accounts=audit_metadata_int(metadata, "checked_accounts"),
        pending_accounts=audit_metadata_int(metadata, "pending_accounts"),
        provider=audit_metadata_text(metadata, "provider"),
        event_id=audit_metadata_text(metadata, "event_id"),
        error=audit_metadata_text(metadata, "error"),
        alerted_accounts=audit_metadata_int(metadata, "alerted_accounts"),
        created_at=log.created_at.isoformat(),
    )


def billing_activation_source(
    user: User,
    latest_webhook: AuditLog | None,
) -> str:
    if user.subscription_status != SubscriptionStatus.ACTIVE:
        return "NOT_ACTIVE"
    webhook_status = audit_external_status(latest_webhook)
    if webhook_status and STATUS_MAP.get(webhook_status.strip().lower()) == SubscriptionStatus.ACTIVE:
        return "WEBHOOK_PAYMENT"
    return "ADMIN_OR_MANUAL"


def has_confirmed_webhook_payment(latest_webhook: AuditLog | None) -> bool:
    webhook_status = audit_external_status(latest_webhook)
    return bool(webhook_status and STATUS_MAP.get(webhook_status.strip().lower()) == SubscriptionStatus.ACTIVE)


def billing_activation_blocker(
    user: User,
    *,
    latest_checkout: AuditLog | None,
    latest_webhook: AuditLog | None,
) -> str | None:
    if user.subscription_status == SubscriptionStatus.ACTIVE:
        return None
    if user.status != AccountStatus.ACTIVE:
        return "Conta comercial ainda nao aprovada para ativacao paga."
    if not user.billing_provider:
        return "Provider de pagamento ainda nao vinculado."
    if user.billing_provider != "MERCADO_PAGO":
        return "Provider de pagamento nao suportado para ativacao automatica."
    if not latest_checkout and not user.billing_subscription_id:
        return "Checkout Mercado Pago ainda nao foi criado para esta conta."
    if not latest_webhook:
        return "Nenhum webhook de pagamento validado foi recebido ainda."
    webhook_status = audit_external_status(latest_webhook) or "desconhecido"
    mapped = STATUS_MAP.get(webhook_status.strip().lower())
    if mapped is None:
        return f"Ultimo webhook recebido com status nao mapeado: {webhook_status}."
    if mapped == SubscriptionStatus.PAST_DUE:
        return f"Ultimo pagamento nao ativou acesso: status Mercado Pago {webhook_status}."
    if mapped == SubscriptionStatus.CANCELED:
        return f"Assinatura cancelada pelo status Mercado Pago {webhook_status}."
    if mapped == SubscriptionStatus.PENDING:
        return f"Pagamento ainda pendente no Mercado Pago: {webhook_status}."
    return "Assinatura ainda nao ativa apesar de webhook recebido; revisar manualmente."


def billing_financial_pending_reason(
    user: User,
    *,
    latest_checkout: AuditLog | None,
    latest_webhook: AuditLog | None,
) -> str | None:
    if user.status != AccountStatus.ACTIVE:
        return None
    if has_confirmed_webhook_payment(latest_webhook):
        return None
    if user.subscription_status == SubscriptionStatus.ACTIVE:
        return "Conta ativa manualmente, mas sem webhook de pagamento confirmado."
    blocker = billing_activation_blocker(user, latest_checkout=latest_checkout, latest_webhook=latest_webhook)
    return blocker or "Conta aprovada sem pagamento confirmado por webhook."


def subscription_account_response(
    user: User,
    *,
    latest_checkout: AuditLog | None = None,
    latest_webhook: AuditLog | None = None,
) -> SubscriptionAccountResponse:
    webhook_status = audit_external_status(latest_webhook)
    webhook_event_id = audit_event_id(latest_webhook)
    checkout_preference_id = audit_event_id(latest_checkout)
    webhook_mapped_status = STATUS_MAP.get(webhook_status.strip().lower()) if webhook_status else None
    payment_received = webhook_mapped_status == SubscriptionStatus.ACTIVE
    return SubscriptionAccountResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        status=user.status,
        document_type=user.document_type,
        document_last4=user.document_last4,
        subscription_plan=user.subscription_plan,
        subscription_status=user.subscription_status,
        billing_provider=user.billing_provider,
        billing_customer_id=user.billing_customer_id,
        billing_subscription_id=user.billing_subscription_id,
        billing_last_event_id=user.billing_last_event_id,
        billing_last_event_at=user.billing_last_event_at.isoformat() if user.billing_last_event_at else None,
        billing_last_checkout_preference_id=checkout_preference_id,
        billing_last_checkout_at=latest_checkout.created_at.isoformat() if latest_checkout else None,
        billing_last_webhook_event_id=webhook_event_id,
        billing_last_webhook_status=webhook_status,
        billing_last_webhook_at=latest_webhook.created_at.isoformat() if latest_webhook else None,
        billing_last_payment_event_id=webhook_event_id if payment_received else None,
        billing_last_payment_received_at=latest_webhook.created_at.isoformat() if payment_received and latest_webhook else None,
        billing_activation_source=billing_activation_source(user, latest_webhook),
        billing_activation_blocker=billing_activation_blocker(
            user,
            latest_checkout=latest_checkout,
            latest_webhook=latest_webhook,
        ),
        billing_financial_pending_reason=billing_financial_pending_reason(
            user,
            latest_checkout=latest_checkout,
            latest_webhook=latest_webhook,
        ),
        created_at=user.created_at.isoformat(),
    )


def provider_configured(provider: str) -> bool:
    settings = get_settings()
    if provider == "MERCADO_PAGO":
        return settings.mercado_pago_configured
    return False


def provider_production_enabled(provider: str) -> bool:
    if provider == "MERCADO_PAGO":
        return provider_configured(provider)
    return False


def current_billing_pending_accounts(db: Session) -> list[SubscriptionAccountResponse]:
    users = (
        db.query(User)
        .filter(User.role.in_(PAID_ADMIN_ROLES), User.status == AccountStatus.ACTIVE)
        .order_by(User.updated_at.desc(), User.created_at.desc())
        .all()
    )
    user_ids = [user.id for user in users]
    latest_checkouts = latest_audit_logs_by_user(
        db,
        user_ids=user_ids,
        resource_type="mercado_pago_checkout_preference",
    )
    latest_webhooks = latest_audit_logs_by_user(db, user_ids=user_ids, resource_type="billing_webhook")
    responses = [
        subscription_account_response(
            user,
            latest_checkout=latest_checkouts.get(user.id),
            latest_webhook=latest_webhooks.get(user.id),
        )
        for user in users
    ]
    return [response for response in responses if response.billing_financial_pending_reason]


@router.get("/pending-accounts", response_model=list[PendingAccountResponse])
def pending_accounts(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    q: str | None = Query(default=None, max_length=120),
    role: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[PendingAccountResponse]:
    query = db.query(User).filter(User.status == AccountStatus.PENDING_VERIFICATION)
    if role:
        query = query.filter(User.role == role)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter((User.email.ilike(like)) | (User.full_name.ilike(like)))
    users = query.order_by(User.created_at.asc()).all()
    responses: list[PendingAccountResponse] = []
    for user in users:
        triage = build_verification_triage(user)
        responses.append(
            PendingAccountResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                status=user.status,
                document_type=user.document_type,
                document_last4=user.document_last4,
                subscription_plan=user.subscription_plan,
                subscription_status=user.subscription_status,
                verification_score=triage.score,
                verification_recommendation=triage.recommendation,
                verification_signals=triage.signals,
                verification_warnings=triage.warnings,
                created_at=user.created_at.isoformat(),
            )
        )
    return responses


@router.get("/subscriptions", response_model=list[SubscriptionAccountResponse])
def subscriptions(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    q: str | None = Query(default=None, max_length=120),
    role: UserRole | None = Query(default=None),
    subscription_status: SubscriptionStatus | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[SubscriptionAccountResponse]:
    query = db.query(User).filter(User.role.in_(PAID_ADMIN_ROLES))
    if role:
        if role not in PAID_ADMIN_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role has no paid subscription")
        query = query.filter(User.role == role)
    if subscription_status:
        query = query.filter(User.subscription_status == subscription_status)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter((User.email.ilike(like)) | (User.full_name.ilike(like)))
    users = query.order_by(User.created_at.desc()).all()
    user_ids = [user.id for user in users]
    latest_checkouts = latest_audit_logs_by_user(
        db,
        user_ids=user_ids,
        resource_type="mercado_pago_checkout_preference",
    )
    latest_webhooks = latest_audit_logs_by_user(db, user_ids=user_ids, resource_type="billing_webhook")
    return [
        subscription_account_response(
            user,
            latest_checkout=latest_checkouts.get(user.id),
            latest_webhook=latest_webhooks.get(user.id),
        )
        for user in users
    ]


@router.get("/billing-pending-accounts", response_model=list[SubscriptionAccountResponse])
def billing_pending_accounts(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    q: str | None = Query(default=None, max_length=120),
    role: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[SubscriptionAccountResponse]:
    query = db.query(User).filter(User.role.in_(PAID_ADMIN_ROLES), User.status == AccountStatus.ACTIVE)
    if role:
        if role not in PAID_ADMIN_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role has no paid subscription")
        query = query.filter(User.role == role)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter((User.email.ilike(like)) | (User.full_name.ilike(like)))
    users = query.order_by(User.updated_at.desc(), User.created_at.desc()).all()
    user_ids = [user.id for user in users]
    latest_checkouts = latest_audit_logs_by_user(
        db,
        user_ids=user_ids,
        resource_type="mercado_pago_checkout_preference",
    )
    latest_webhooks = latest_audit_logs_by_user(db, user_ids=user_ids, resource_type="billing_webhook")
    responses = [
        subscription_account_response(
            user,
            latest_checkout=latest_checkouts.get(user.id),
            latest_webhook=latest_webhooks.get(user.id),
        )
        for user in users
    ]
    return [response for response in responses if response.billing_financial_pending_reason]


@router.post("/billing-pending-alerts", response_model=BillingPendingAlertResponse)
def billing_pending_alerts(
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    days: int = Query(default=7, ge=0, le=365),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> BillingPendingAlertResponse:
    return run_billing_pending_alert(
        db,
        days=days,
        limit=limit,
        actor_user_id=admin.id,
        trigger="manual",
    )


def run_billing_pending_alert(
    db: Session,
    *,
    days: int,
    limit: int,
    actor_user_id: str | None = None,
    trigger: str,
) -> BillingPendingAlertResponse:
    users = (
        db.query(User)
        .filter(User.role.in_(PAID_ADMIN_ROLES), User.status == AccountStatus.ACTIVE)
        .order_by(User.updated_at.desc(), User.created_at.desc())
        .all()
    )
    user_ids = [user.id for user in users]
    latest_checkouts = latest_audit_logs_by_user(
        db,
        user_ids=user_ids,
        resource_type="mercado_pago_checkout_preference",
    )
    latest_webhooks = latest_audit_logs_by_user(db, user_ids=user_ids, resource_type="billing_webhook")
    pending_pairs = [
        (
            user,
            subscription_account_response(
                user,
                latest_checkout=latest_checkouts.get(user.id),
                latest_webhook=latest_webhooks.get(user.id),
            ),
        )
        for user in users
    ]
    pending_pairs = [
        (user, response) for user, response in pending_pairs if response.billing_financial_pending_reason
    ]

    threshold = datetime.now(UTC) - timedelta(days=days)
    old_pending: list[SubscriptionAccountResponse] = []
    for user, response in pending_pairs:
        latest_checkout = latest_checkouts.get(user.id)
        reference_date = latest_checkout.created_at if latest_checkout else user.updated_at
        if aware_datetime(reference_date) <= threshold:
            old_pending.append(response)

    alert_accounts = old_pending[:limit]
    settings = get_settings()
    email_sent = False
    if alert_accounts:
        email_sent = send_admin_alert_email(
            subject="Bergmann: contas comerciais com pendencia financeira",
            body=build_billing_pending_alert_body(alert_accounts, days=days),
        )

    write_audit_log(
        db,
        action=AuditAction.SUBSCRIPTION_STATUS_UPDATED,
        actor_user_id=actor_user_id,
        resource_type="billing_pending_alert",
        metadata={
            "alert_type": "PENDING_FINANCIAL",
            "subject": "Bergmann: contas comerciais com pendencia financeira",
            "trigger": trigger,
            "days_threshold": days,
            "checked_accounts": len(users),
            "pending_accounts": len(pending_pairs),
            "alerted_accounts": len(alert_accounts),
            "email_sent": email_sent,
            "admin_recipient_configured": bool(settings.admin_alert_recipient),
            "account_ids": [account.id for account in alert_accounts],
        },
    )
    db.commit()

    return BillingPendingAlertResponse(
        checked_accounts=len(users),
        pending_accounts=len(pending_pairs),
        alerted_accounts=len(alert_accounts),
        days_threshold=days,
        email_sent=email_sent,
        admin_recipient_configured=bool(settings.admin_alert_recipient),
        accounts=alert_accounts,
    )


def build_billing_pending_alert_body(accounts: list[SubscriptionAccountResponse], *, days: int) -> str:
    lines = [
        "Existem contas comerciais aprovadas com pendencia financeira antiga.",
        "",
        f"Limite usado: {days} dia(s).",
        f"Contas no alerta: {len(accounts)}.",
        "",
    ]
    for account in accounts:
        lines.extend(
            [
                f"- {account.full_name} <{account.email}>",
                f"  Perfil: {account.role.value}",
                f"  Plano: {account.subscription_plan.value}",
                f"  Status assinatura: {account.subscription_status.value}",
                f"  Motivo: {account.billing_financial_pending_reason or 'Sem pagamento confirmado.'}",
                f"  Ultimo checkout: {account.billing_last_checkout_at or 'sem registro'}",
                f"  Ultimo webhook: {account.billing_last_webhook_at or 'sem registro'}",
                "",
            ]
        )
    lines.append("Abra Pendencias financeiras no admin do Bergmann para cobrar ou reenviar checkout.")
    return "\n".join(lines)


def recent_scheduled_billing_pending_alert_exists(db: Session, *, interval_hours: int) -> bool:
    if interval_hours <= 0:
        return False
    threshold = datetime.now(UTC) - timedelta(hours=interval_hours)
    return (
        db.query(AuditLog)
        .filter(
            AuditLog.resource_type == "billing_pending_alert",
            AuditLog.created_at >= threshold,
            AuditLog.metadata_json.contains('"trigger": "scheduled"'),
        )
        .first()
        is not None
    )


def latest_scheduled_billing_pending_alert(db: Session) -> AuditLog | None:
    return (
        db.query(AuditLog)
        .filter(
            AuditLog.resource_type == "billing_pending_alert",
            AuditLog.metadata_json.contains('"trigger": "scheduled"'),
        )
        .order_by(AuditLog.created_at.desc())
        .first()
    )


@router.get("/billing-pending-alert-status", response_model=BillingPendingAlertStatusResponse)
def billing_pending_alert_status(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> BillingPendingAlertStatusResponse:
    settings = get_settings()
    latest_alert = latest_scheduled_billing_pending_alert(db)
    metadata = parse_audit_metadata(latest_alert.metadata_json if latest_alert else None)
    last_scheduled_alert_at = latest_alert.created_at.isoformat() if latest_alert else None
    next_allowed_alert_at = None
    if latest_alert and settings.billing_pending_alerts_auto_interval_hours > 0:
        next_allowed = aware_datetime(latest_alert.created_at) + timedelta(
            hours=settings.billing_pending_alerts_auto_interval_hours
        )
        next_allowed_alert_at = next_allowed.isoformat()

    return BillingPendingAlertStatusResponse(
        auto_enabled=settings.billing_pending_alerts_auto_enabled,
        days_threshold=settings.billing_pending_alerts_auto_days,
        interval_hours=settings.billing_pending_alerts_auto_interval_hours,
        limit=settings.billing_pending_alerts_auto_limit,
        admin_recipient_configured=bool(settings.admin_alert_recipient),
        last_scheduled_alert_at=last_scheduled_alert_at,
        last_scheduled_email_sent=audit_metadata_bool(metadata, "email_sent") if latest_alert else None,
        last_scheduled_checked_accounts=audit_metadata_int(metadata, "checked_accounts"),
        last_scheduled_pending_accounts=audit_metadata_int(metadata, "pending_accounts"),
        last_scheduled_alerted_accounts=audit_metadata_int(metadata, "alerted_accounts"),
        recent_scheduled_alert_exists=recent_scheduled_billing_pending_alert_exists(
            db,
            interval_hours=settings.billing_pending_alerts_auto_interval_hours,
        ),
        next_allowed_alert_at=next_allowed_alert_at,
    )


@router.get("/operations-summary", response_model=AdminOperationsSummaryResponse)
def operations_summary(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> AdminOperationsSummaryResponse:
    settings = get_settings()
    pending_accounts = current_billing_pending_accounts(db)

    webhook_logs = (
        db.query(AuditLog)
        .filter(AuditLog.resource_type == "billing_webhook")
        .order_by(AuditLog.created_at.desc())
        .limit(100)
        .all()
    )
    target_ids = sorted({log.target_user_id for log in webhook_logs if log.target_user_id})
    users_by_id = {user.id: user for user in db.query(User).filter(User.id.in_(target_ids)).all()} if target_ids else {}
    webhook_entries = [billing_webhook_monitor_response(log, users_by_id) for log in webhook_logs]
    webhook_errors = [entry for entry in webhook_entries if entry.processing_status == "error"]
    duplicate_webhooks = [entry for entry in webhook_entries if entry.duplicate]

    alert_logs = (
        db.query(AuditLog)
        .filter(AuditLog.resource_type.in_(["admin_email_alert", "billing_pending_alert"]))
        .order_by(AuditLog.created_at.desc())
        .limit(100)
        .all()
    )
    alerts = [admin_alert_response(log) for log in alert_logs]
    unsent_alerts = [alert for alert in alerts if not alert.email_sent]
    alert_errors = [alert for alert in alerts if alert.error]
    latest_alert = latest_scheduled_billing_pending_alert(db)

    return AdminOperationsSummaryResponse(
        pending_financial_accounts=len(pending_accounts),
        recent_webhook_events=len(webhook_entries),
        webhook_error_events=len(webhook_errors),
        duplicate_webhook_events=len(duplicate_webhooks),
        recent_alerts=len(alerts),
        unsent_alerts=len(unsent_alerts),
        last_webhook_error=webhook_errors[0].error if webhook_errors else None,
        last_webhook_error_at=webhook_errors[0].received_at if webhook_errors else None,
        last_alert_error=alert_errors[0].error if alert_errors else None,
        last_alert_error_at=alert_errors[0].created_at if alert_errors else None,
        billing_alert_auto_enabled=settings.billing_pending_alerts_auto_enabled,
        billing_last_scheduled_alert_at=latest_alert.created_at.isoformat() if latest_alert else None,
        mercado_pago_ready=provider_configured("MERCADO_PAGO"),
        billing_webhooks_enabled=settings.billing_webhooks_enabled,
        smtp_configured=settings.smtp_configured,
        admin_alert_recipient_configured=bool(settings.admin_alert_recipient),
    )


@router.get("/alerts", response_model=list[AdminAlertResponse])
def admin_alerts(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    alert_type: str | None = Query(default=None, max_length=40),
    email_sent: bool | None = Query(default=None),
    trigger: str | None = Query(default=None, max_length=40),
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=80, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[AdminAlertResponse]:
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.resource_type.in_(["admin_email_alert", "billing_pending_alert"]))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    alerts = [admin_alert_response(log) for log in logs]
    if alert_type:
        normalized_type = alert_type.strip().upper()
        alerts = [alert for alert in alerts if alert.alert_type.upper() == normalized_type]
    if email_sent is not None:
        alerts = [alert for alert in alerts if alert.email_sent is email_sent]
    if trigger:
        normalized_trigger = trigger.strip().lower()
        alerts = [alert for alert in alerts if (alert.trigger or "").lower() == normalized_trigger]
    if q:
        term = q.strip().lower()
        alerts = [
            alert
            for alert in alerts
            if term in (alert.subject or "").lower()
            or term in (alert.provider or "").lower()
            or term in (alert.event_id or "").lower()
            or term in (alert.error or "").lower()
            or term in alert.source.lower()
            or term in alert.alert_type.lower()
        ]
    return alerts


@router.get("/moderated-accounts", response_model=list[SubscriptionAccountResponse])
def moderated_accounts(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    q: str | None = Query(default=None, max_length=120),
    role: UserRole | None = Query(default=None),
    account_status: AccountStatus | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[SubscriptionAccountResponse]:
    allowed_statuses = {AccountStatus.REJECTED, AccountStatus.ARCHIVED}
    query = db.query(User).filter(User.status.in_(allowed_statuses))
    if account_status:
        if account_status not in allowed_statuses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status is not moderated")
        query = query.filter(User.status == account_status)
    if role:
        query = query.filter(User.role == role)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter((User.email.ilike(like)) | (User.full_name.ilike(like)))
    users = query.order_by(User.updated_at.desc(), User.created_at.desc()).all()
    user_ids = [user.id for user in users]
    latest_checkouts = latest_audit_logs_by_user(
        db,
        user_ids=user_ids,
        resource_type="mercado_pago_checkout_preference",
    )
    latest_webhooks = latest_audit_logs_by_user(db, user_ids=user_ids, resource_type="billing_webhook")
    return [
        subscription_account_response(
            user,
            latest_checkout=latest_checkouts.get(user.id),
            latest_webhook=latest_webhooks.get(user.id),
        )
        for user in users
    ]


@router.get("/commercial-plans", response_model=list[CommercialPlanResponse])
def commercial_plans(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
) -> list[CommercialPlanResponse]:
    return [
        CommercialPlanResponse(
            role=plan.role,
            plan=plan.plan,
            title=plan.title,
            description=plan.description,
            admin_price_placeholder=plan.admin_price_placeholder,
            price_brl=plan.price_brl,
            billing_interval_placeholder=plan.billing_interval_placeholder,
            included_features=list(plan.included_features),
            checkout_public_enabled=plan.checkout_public_enabled,
            admin_only_pricing=plan.admin_only_pricing,
        )
        for plan in list_commercial_plans()
    ]


@router.get("/billing-config", response_model=BillingConfigResponse)
def billing_config(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
) -> BillingConfigResponse:
    settings = get_settings()
    return BillingConfigResponse(
        webhooks_enabled=settings.billing_webhooks_enabled,
        webhook_secret_configured=bool(settings.mercado_pago_webhook_secret),
        webhook_path="/billing/mercado-pago/webhook",
        signature_header="x-signature, x-request-id",
        supported_providers=["MERCADO_PAGO"],
        status_mapping={external: internal.value for external, internal in sorted(STATUS_MAP.items())},
        secret_env_name="MERCADO_PAGO_WEBHOOK_SECRET",
        enabled_env_name="BILLING_WEBHOOKS_ENABLED",
        provider_capabilities=[
            {
                "provider": capability.provider,
                "checkout_enabled": capability.provider == "MERCADO_PAGO" and provider_configured(capability.provider),
                "provider_configured": provider_configured(capability.provider),
                "production_enabled": provider_production_enabled(capability.provider),
                "webhook_signature_headers": list(capability.webhook_signature_headers),
                "customer_reference_fields": list(capability.customer_reference_fields),
                "event_reference_fields": list(capability.event_reference_fields),
                "required_env_names": list(capability.required_env_names),
                "activation_checkpoints": list(capability.activation_checkpoints),
            }
            for capability in list_payment_adapter_capabilities()
        ],
    )


@router.get("/billing-webhooks", response_model=list[BillingWebhookMonitorResponse])
def billing_webhooks(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    processing_status: str | None = Query(default=None, max_length=24),
    provider: str | None = Query(default=None, max_length=32),
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=80, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[BillingWebhookMonitorResponse]:
    query = db.query(AuditLog).filter(AuditLog.resource_type == "billing_webhook")
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    target_ids = sorted({log.target_user_id for log in logs if log.target_user_id})
    users_by_id = {user.id: user for user in db.query(User).filter(User.id.in_(target_ids)).all()} if target_ids else {}
    responses = [billing_webhook_monitor_response(log, users_by_id) for log in logs]
    if processing_status:
        normalized_status = processing_status.strip().lower()
        responses = [entry for entry in responses if entry.processing_status.lower() == normalized_status]
    if provider:
        normalized_provider = provider.strip().upper()
        responses = [entry for entry in responses if (entry.provider or "").upper() == normalized_provider]
    if q:
        term = q.strip().lower()
        responses = [
            entry
            for entry in responses
            if term in (entry.event_id or "").lower()
            or term in (entry.external_status or "").lower()
            or term in (entry.subscription_status or "").lower()
            or term in (entry.linked_user_email or "").lower()
            or term in (entry.linked_user_name or "").lower()
            or term in (entry.linked_user_id or "").lower()
            or term in (entry.error or "").lower()
            or term in (entry.provider or "").lower()
        ]
    return responses


@router.get("/email-config", response_model=EmailConfigResponse)
def email_config(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
) -> EmailConfigResponse:
    settings = get_settings()
    return EmailConfigResponse(
        smtp_configured=settings.smtp_configured,
        smtp_host_configured=bool(settings.smtp_host),
        smtp_username_configured=bool(settings.smtp_username),
        smtp_password_configured=bool(settings.smtp_password),
        smtp_from_email_configured=bool(settings.smtp_from_email),
        smtp_use_tls=settings.smtp_use_tls,
        smtp_port=settings.smtp_port,
        admin_alert_recipient_configured=bool(settings.admin_alert_recipient),
        billing_pending_alerts_auto_enabled=settings.billing_pending_alerts_auto_enabled,
        billing_pending_alerts_auto_days=settings.billing_pending_alerts_auto_days,
        billing_pending_alerts_auto_interval_hours=settings.billing_pending_alerts_auto_interval_hours,
        billing_pending_alerts_auto_limit=settings.billing_pending_alerts_auto_limit,
        password_reset_url_configured=bool(settings.password_reset_url),
        required_env_names=[
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_USERNAME",
            "SMTP_PASSWORD",
            "SMTP_FROM_EMAIL",
            "SMTP_USE_TLS",
            "ADMIN_ALERT_EMAIL",
            "BILLING_PENDING_ALERTS_AUTO_ENABLED",
            "BILLING_PENDING_ALERTS_AUTO_DAYS",
            "BILLING_PENDING_ALERTS_AUTO_INTERVAL_HOURS",
            "BILLING_PENDING_ALERTS_AUTO_LIMIT",
            "PASSWORD_RESET_URL",
        ],
    )


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def audit_logs(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    action: AuditAction | None = Query(default=None),
    resource_type: str | None = Query(default=None, max_length=80),
    target_user_id: str | None = Query(default=None, max_length=36),
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[AuditLogResponse]:
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type.strip())
    if target_user_id:
        query = query.filter(AuditLog.target_user_id == target_user_id.strip())
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    responses = [
        AuditLogResponse(
            id=log.id,
            action=log.action.value,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            actor_user_id=log.actor_user_id,
            target_user_id=log.target_user_id,
            metadata=parse_audit_metadata(log.metadata_json),
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]
    if q:
        term = q.strip().lower()
        responses = [
            entry
            for entry in responses
            if term in entry.action.lower()
            or term in entry.resource_type.lower()
            or term in (entry.resource_id or "").lower()
            or term in (entry.actor_user_id or "").lower()
            or term in (entry.target_user_id or "").lower()
            or term in json.dumps(entry.metadata or {}, ensure_ascii=False).lower()
        ]
    return responses


@router.post("/subscription-status")
def update_subscription_status(
    payload: SubscriptionStatusUpdateRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, payload.user_id)
    if not user or user.role not in PAID_ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paid account not found")
    if payload.subscription_status == SubscriptionStatus.FREE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid account cannot use free status")
    if payload.subscription_status == SubscriptionStatus.TRIAL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Commercial trial status is disabled")
    if payload.subscription_status == SubscriptionStatus.ACTIVE:
        if user.status != AccountStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account must be approved first")

    previous_status = user.subscription_status
    user.subscription_status = payload.subscription_status
    write_audit_log(
        db,
        action=AuditAction.SUBSCRIPTION_STATUS_UPDATED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="subscription",
        resource_id=user.id,
        metadata={
            "role": user.role.value,
            "reason": payload.reason,
            "previous_status": previous_status.value,
            "subscription_status": user.subscription_status.value,
            "subscription_plan": user.subscription_plan.value,
        },
    )
    db.commit()
    return {"status": user.subscription_status.value}


@router.post("/billing-reference")
def update_billing_reference(
    payload: BillingReferenceUpdateRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    user = db.get(User, payload.user_id)
    if not user or user.role not in PAID_ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paid account not found")

    provider = None if payload.billing_provider == "NONE" else payload.billing_provider
    customer_id = clean_optional(payload.billing_customer_id)
    subscription_id = clean_optional(payload.billing_subscription_id)
    last_event_id = clean_optional(payload.billing_last_event_id)
    validation_errors = validate_billing_reference(
        provider=provider,
        customer_id=customer_id,
        subscription_id=subscription_id,
        last_event_id=last_event_id,
    )
    if validation_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid billing reference", "errors": validation_errors},
        )

    previous = {
        "billing_provider": user.billing_provider,
        "has_customer_id": bool(user.billing_customer_id),
        "has_subscription_id": bool(user.billing_subscription_id),
        "has_last_event_id": bool(user.billing_last_event_id),
    }
    user.billing_provider = provider
    user.billing_customer_id = customer_id
    user.billing_subscription_id = subscription_id
    user.billing_last_event_id = last_event_id
    write_audit_log(
        db,
        action=AuditAction.SUBSCRIPTION_STATUS_UPDATED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="billing_reference",
        resource_id=user.id,
        metadata={
            "role": user.role.value,
            "reason": payload.reason,
            "previous": previous,
            "billing_provider": user.billing_provider,
            "has_customer_id": bool(user.billing_customer_id),
            "has_subscription_id": bool(user.billing_subscription_id),
            "has_last_event_id": bool(user.billing_last_event_id),
        },
    )
    db.commit()
    return {
        "billing_provider": user.billing_provider,
        "billing_customer_id": user.billing_customer_id,
        "billing_subscription_id": user.billing_subscription_id,
        "billing_last_event_id": user.billing_last_event_id,
    }


@router.post("/mercado-pago/checkout-preference", response_model=MercadoPagoCheckoutResponse)
def create_mercado_pago_checkout(
    payload: MercadoPagoCheckoutRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> MercadoPagoCheckoutResponse:
    user = db.get(User, payload.user_id)
    if not user or user.role not in PAID_ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paid account not found")
    if user.status in {AccountStatus.REJECTED, AccountStatus.ARCHIVED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account cannot receive checkout")
    if user.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account must be approved before checkout")
    plan = commercial_plan_for_role(user.role)
    if not plan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No commercial plan for role")

    try:
        checkout = create_mercado_pago_checkout_preference(
            settings=get_settings(),
            user=user,
        )
    except MercadoPagoIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    user.billing_provider = "MERCADO_PAGO"
    user.billing_customer_id = user.email
    user.billing_subscription_id = checkout["preference_id"]
    write_audit_log(
        db,
        action=AuditAction.SUBSCRIPTION_STATUS_UPDATED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="mercado_pago_checkout_preference",
        resource_id=user.id,
        metadata={
            "reason": payload.reason,
            "role": user.role.value,
            "subscription_plan": user.subscription_plan.value,
            "provider": "MERCADO_PAGO",
            "preference_id": checkout["preference_id"],
            "price_brl": checkout["price_brl"],
            "production": provider_production_enabled("MERCADO_PAGO"),
            "checkout_created": True,
        },
    )
    db.commit()
    return MercadoPagoCheckoutResponse(**checkout)


@router.post("/approve-account")
def approve_account(
    payload: ModerationAccountRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, payload.user_id)
    if not user or user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    user.status = AccountStatus.ACTIVE
    user.subscription_status = approval_subscription_status_for_role(user.role)
    write_audit_log(
        db,
        action=AuditAction.ACCOUNT_APPROVED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={
            "role": user.role.value,
            "reason": payload.reason,
            "subscription_plan": user.subscription_plan.value,
            "subscription_status": user.subscription_status.value,
        },
    )
    db.commit()
    return {"status": "approved"}


@router.post("/reject-account")
def reject_account(
    payload: ModerationAccountRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, payload.user_id)
    if not user or user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    user.status = AccountStatus.REJECTED
    user.subscription_status = SubscriptionStatus.CANCELED
    write_audit_log(
        db,
        action=AuditAction.ACCOUNT_REJECTED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={"role": user.role.value, "reason": payload.reason},
    )
    db.commit()
    return {"status": "rejected"}


@router.post("/archive-account")
def archive_account(
    payload: ModerationAccountRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, payload.user_id)
    if not user or user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    is_qa_account = user.email.startswith("qa-") or user.email.endswith("@example.com")
    if user.status != AccountStatus.REJECTED and not is_qa_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only rejected accounts or QA accounts can be archived",
        )
    previous_status = user.status
    previous_subscription_status = user.subscription_status
    user.status = AccountStatus.ARCHIVED
    user.subscription_status = SubscriptionStatus.CANCELED
    write_audit_log(
        db,
        action=AuditAction.ACCOUNT_ARCHIVED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={
            "role": user.role.value,
            "reason": payload.reason,
            "previous_status": previous_status.value,
            "previous_subscription_status": previous_subscription_status.value,
            "subscription_status": user.subscription_status.value,
            "qa_account": is_qa_account,
        },
    )
    db.commit()
    return {"status": "archived"}
