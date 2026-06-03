from typing import Literal

from pydantic import BaseModel, EmailStr, Field

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
    password_reset_url_configured: bool
    required_env_names: list[str]


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
