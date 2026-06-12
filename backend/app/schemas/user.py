from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user import AccountStatus, SubscriptionPlan, SubscriptionStatus, UserRole


class UserMeResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    document_type: str | None = None
    document_last4: str | None = None
    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus


class PendingAccountResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    document_type: str | None = None
    document_last4: str | None = None
    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus
    verification_score: int
    verification_recommendation: str
    verification_signals: list[str]
    verification_warnings: list[str]
    created_at: str


class SubscriptionAccountResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: AccountStatus
    document_type: str | None = None
    document_last4: str | None = None
    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus
    billing_provider: str | None = None
    billing_customer_id: str | None = None
    billing_subscription_id: str | None = None
    billing_last_event_id: str | None = None
    billing_last_event_at: str | None = None
    billing_last_checkout_preference_id: str | None = None
    billing_last_checkout_at: str | None = None
    billing_last_webhook_event_id: str | None = None
    billing_last_webhook_status: str | None = None
    billing_last_webhook_at: str | None = None
    billing_last_payment_event_id: str | None = None
    billing_last_payment_received_at: str | None = None
    billing_activation_source: str
    billing_activation_blocker: str | None = None
    billing_financial_pending_reason: str | None = None
    created_at: str


class BillingPendingAlertResponse(BaseModel):
    checked_accounts: int
    pending_accounts: int
    alerted_accounts: int
    days_threshold: int
    email_sent: bool
    admin_recipient_configured: bool
    accounts: list[SubscriptionAccountResponse]


class BillingPendingAlertStatusResponse(BaseModel):
    auto_enabled: bool
    days_threshold: int
    interval_hours: int
    limit: int
    admin_recipient_configured: bool
    last_scheduled_alert_at: str | None = None
    last_scheduled_email_sent: bool | None = None
    last_scheduled_checked_accounts: int | None = None
    last_scheduled_pending_accounts: int | None = None
    last_scheduled_alerted_accounts: int | None = None
    recent_scheduled_alert_exists: bool
    next_allowed_alert_at: str | None = None


class CommercialPlanResponse(BaseModel):
    role: UserRole
    plan: SubscriptionPlan
    title: str
    description: str
    admin_price_placeholder: str
    price_brl: float
    billing_interval_placeholder: str
    included_features: list[str]
    checkout_public_enabled: bool
    admin_only_pricing: bool
    is_overridden: bool = False


class CommercialPlanUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    admin_price_placeholder: str | None = Field(default=None, min_length=1, max_length=200)
    price_brl: float | None = Field(default=None, ge=0)
    billing_interval_placeholder: str | None = Field(default=None, min_length=1, max_length=200)
    included_features: list[str] | None = None
    checkout_public_enabled: bool | None = None
    admin_only_pricing: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        normalized = dict(data)
        for key in ("title", "description", "admin_price_placeholder", "billing_interval_placeholder"):
            if key in normalized and isinstance(normalized[key], str):
                value = normalized[key].strip()
                normalized[key] = value or None
        if "included_features" in normalized and isinstance(normalized["included_features"], list):
            normalized["included_features"] = [
                str(item).strip() for item in normalized["included_features"] if str(item).strip()
            ]
        return normalized


class AuditLogResponse(BaseModel):
    id: str
    action: str
    resource_type: str
    resource_id: str | None = None
    actor_user_id: str | None = None
    target_user_id: str | None = None
    metadata: dict[str, object] | None = None
    created_at: str


class AdminAlertResponse(BaseModel):
    id: str
    alert_type: str
    source: str
    email_sent: bool
    admin_recipient_configured: bool
    subject: str | None = None
    trigger: str | None = None
    days_threshold: int | None = None
    checked_accounts: int | None = None
    pending_accounts: int | None = None
    provider: str | None = None
    event_id: str | None = None
    error: str | None = None
    alerted_accounts: int | None = None
    created_at: str


class PaymentAdapterCapabilityResponse(BaseModel):
    provider: str
    checkout_enabled: bool
    provider_configured: bool
    production_enabled: bool
    webhook_signature_headers: list[str]
    customer_reference_fields: list[str]
    event_reference_fields: list[str]
    required_env_names: list[str]
    activation_checkpoints: list[str]


class BillingConfigResponse(BaseModel):
    webhooks_enabled: bool
    webhook_secret_configured: bool
    webhook_path: str
    signature_header: str
    supported_providers: list[str]
    status_mapping: dict[str, str]
    secret_env_name: str
    enabled_env_name: str
    provider_capabilities: list[PaymentAdapterCapabilityResponse]
    billing_webhook_secret_configured: bool
    mercado_pago_access_token_configured: bool
    mercado_pago_public_key_configured: bool
    mercado_pago_webhook_secret_configured: bool
    mercado_pago_success_url: str | None = None
    mercado_pago_pending_url: str | None = None
    mercado_pago_failure_url: str | None = None


class BillingConfigUpdateRequest(BaseModel):
    billing_webhooks_enabled: bool | None = None
    billing_webhook_secret: str | None = Field(default=None, max_length=256)
    mercado_pago_access_token: str | None = Field(default=None, max_length=512)
    mercado_pago_public_key: str | None = Field(default=None, max_length=512)
    mercado_pago_webhook_secret: str | None = Field(default=None, max_length=256)
    mercado_pago_success_url: str | None = Field(default=None, max_length=500)
    mercado_pago_pending_url: str | None = Field(default=None, max_length=500)
    mercado_pago_failure_url: str | None = Field(default=None, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        normalized = dict(data)
        for key in (
            "billing_webhook_secret",
            "mercado_pago_access_token",
            "mercado_pago_public_key",
            "mercado_pago_webhook_secret",
            "mercado_pago_success_url",
            "mercado_pago_pending_url",
            "mercado_pago_failure_url",
        ):
            if key in normalized and isinstance(normalized[key], str):
                value = normalized[key].strip()
                normalized[key] = value or None
        return normalized


class BillingWebhookMonitorResponse(BaseModel):
    id: str
    provider: str | None = None
    processing_status: str
    event_id: str | None = None
    external_status: str | None = None
    subscription_status: str | None = None
    linked_user_id: str | None = None
    linked_user_email: EmailStr | None = None
    linked_user_name: str | None = None
    duplicate: bool
    error: str | None = None
    received_at: str


class EmailConfigResponse(BaseModel):
    smtp_configured: bool
    smtp_host_configured: bool
    smtp_username_configured: bool
    smtp_password_configured: bool
    smtp_from_email_configured: bool
    smtp_use_tls: bool
    smtp_port: int
    admin_alert_recipient_configured: bool
    smtp_host: str | None = None
    smtp_username: str | None = None
    smtp_from_email: str | None = None
    admin_alert_email: str | None = None
    password_reset_url: str | None = None
    billing_pending_alerts_auto_enabled: bool
    billing_pending_alerts_auto_days: int
    billing_pending_alerts_auto_interval_hours: int
    billing_pending_alerts_auto_limit: int
    password_reset_url_configured: bool
    required_env_names: list[str]


class EmailConfigUpdateRequest(BaseModel):
    smtp_host: str | None = Field(default=None, max_length=255)
    smtp_port: int | None = Field(default=None, ge=1, le=65535)
    smtp_username: str | None = Field(default=None, max_length=255)
    smtp_password: str | None = Field(default=None, max_length=256)
    smtp_from_email: str | None = Field(default=None, max_length=255)
    smtp_use_tls: bool | None = None
    admin_alert_email: str | None = Field(default=None, max_length=255)
    password_reset_url: str | None = Field(default=None, max_length=500)
    billing_pending_alerts_auto_enabled: bool | None = None
    billing_pending_alerts_auto_days: int | None = Field(default=None, ge=0, le=365)
    billing_pending_alerts_auto_interval_hours: int | None = Field(default=None, ge=1, le=168)
    billing_pending_alerts_auto_limit: int | None = Field(default=None, ge=1, le=500)

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        normalized = dict(data)
        for key in (
            "smtp_host",
            "smtp_username",
            "smtp_password",
            "smtp_from_email",
            "admin_alert_email",
            "password_reset_url",
        ):
            if key in normalized and isinstance(normalized[key], str):
                value = normalized[key].strip()
                normalized[key] = value or None
        return normalized


class AdminOperationsSummaryResponse(BaseModel):
    pending_financial_accounts: int
    recent_webhook_events: int
    webhook_error_events: int
    duplicate_webhook_events: int
    recent_alerts: int
    unsent_alerts: int
    last_webhook_error: str | None = None
    last_webhook_error_at: str | None = None
    last_alert_error: str | None = None
    last_alert_error_at: str | None = None
    billing_alert_auto_enabled: bool
    billing_last_scheduled_alert_at: str | None = None
    mercado_pago_ready: bool
    billing_webhooks_enabled: bool
    smtp_configured: bool
    admin_alert_recipient_configured: bool


class ModerationAccountRequest(BaseModel):
    user_id: str
    reason: str | None = None


class SubscriptionStatusUpdateRequest(BaseModel):
    user_id: str
    subscription_status: SubscriptionStatus
    reason: str | None = None


class BillingReferenceUpdateRequest(BaseModel):
    user_id: str
    billing_provider: Literal["NONE", "MERCADO_PAGO"]
    billing_customer_id: str | None = Field(default=None, max_length=120)
    billing_subscription_id: str | None = Field(default=None, max_length=120)
    billing_last_event_id: str | None = Field(default=None, max_length=160)
    reason: str | None = Field(default=None, max_length=240)


class MercadoPagoCheckoutRequest(BaseModel):
    user_id: str
    reason: str | None = Field(default=None, max_length=240)


class MercadoPagoCheckoutResponse(BaseModel):
    provider: Literal["MERCADO_PAGO"]
    preference_id: str
    checkout_url: str
    client_reference_id: str
    price_brl: float
