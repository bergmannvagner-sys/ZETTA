import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import AccountStatus, SubscriptionStatus, User, UserRole
from app.models.privacy import AuditAction, AuditLog
from app.schemas.user import (
    AuditLogResponse,
    BillingConfigResponse,
    BillingReferenceUpdateRequest,
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


def provider_configured(provider: str) -> bool:
    settings = get_settings()
    if provider == "MERCADO_PAGO":
        return settings.mercado_pago_configured
    return False


def provider_production_enabled(provider: str) -> bool:
    if provider == "MERCADO_PAGO":
        return provider_configured(provider)
    return False


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
    return [
        SubscriptionAccountResponse(
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
            created_at=user.created_at.isoformat(),
        )
        for user in users
    ]


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
    return [
        SubscriptionAccountResponse(
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
            created_at=user.created_at.isoformat(),
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
        webhook_secret_configured=bool(settings.billing_webhook_secret),
        webhook_path="/billing/webhook",
        signature_header="X-Bergmann-Billing-Signature",
        supported_providers=["MERCADO_PAGO"],
        status_mapping={external: internal.value for external, internal in sorted(STATUS_MAP.items())},
        secret_env_name="BILLING_WEBHOOK_SECRET",
        enabled_env_name="BILLING_WEBHOOKS_ENABLED",
        provider_capabilities=[
            {
                "provider": capability.provider,
                "checkout_enabled": capability.checkout_enabled,
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
        password_reset_url_configured=bool(settings.password_reset_url),
        required_env_names=[
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_USERNAME",
            "SMTP_PASSWORD",
            "SMTP_FROM_EMAIL",
            "SMTP_USE_TLS",
            "PASSWORD_RESET_URL",
        ],
    )


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def audit_logs(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    action: AuditAction | None = Query(default=None),
    resource_type: str | None = Query(default=None, max_length=80),
    target_user_id: str | None = Query(default=None, max_length=36),
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
    return [
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
