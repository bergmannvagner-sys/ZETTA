export type UserRole =
  | "USER"
  | "PSYCHOLOGIST"
  | "COMPANY"
  | "NGO"
  | "HOSPITAL"
  | "CLINIC"
  | "SPONSOR"
  | "PUBLIC_INSTITUTION"
  | "SUPER_ADMIN";

export type AccountStatus = "ACTIVE" | "PENDING_VERIFICATION" | "REJECTED" | "ARCHIVED";
export type SubscriptionPlan =
  | "FREE_USER"
  | "PSYCHOLOGIST_PRO"
  | "COMPANY_NR1"
  | "CLINIC"
  | "INSTITUTIONAL"
  | "SPONSOR"
  | "INTERNAL";
export type SubscriptionStatus = "FREE" | "PENDING" | "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: AccountStatus;
  document_type?: "CPF" | "CNPJ" | "CRP" | string | null;
  document_last4?: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type PendingAccount = AuthUser & {
  created_at: string;
  verification_score: number;
  verification_recommendation: "REVIEW_APPROVE" | "REVIEW_REQUIRED" | "HIGH_RISK_REVIEW" | string;
  verification_signals: string[];
  verification_warnings: string[];
};

export type SubscriptionAccount = AuthUser & {
  billing_provider?: string | null;
  billing_customer_id?: string | null;
  billing_subscription_id?: string | null;
  billing_last_event_id?: string | null;
  billing_last_event_at?: string | null;
  billing_last_checkout_preference_id?: string | null;
  billing_last_checkout_at?: string | null;
  billing_last_webhook_event_id?: string | null;
  billing_last_webhook_status?: string | null;
  billing_last_webhook_at?: string | null;
  billing_last_payment_event_id?: string | null;
  billing_last_payment_received_at?: string | null;
  billing_activation_source: "WEBHOOK_PAYMENT" | "ADMIN_OR_MANUAL" | "NOT_ACTIVE" | string;
  billing_activation_blocker?: string | null;
  billing_financial_pending_reason?: string | null;
  created_at: string;
};

export type BillingPendingAlert = {
  checked_accounts: number;
  pending_accounts: number;
  alerted_accounts: number;
  days_threshold: number;
  email_sent: boolean;
  admin_recipient_configured: boolean;
  accounts: SubscriptionAccount[];
};

export type BillingPendingAlertStatus = {
  auto_enabled: boolean;
  days_threshold: number;
  interval_hours: number;
  limit: number;
  admin_recipient_configured: boolean;
  last_scheduled_alert_at?: string | null;
  last_scheduled_email_sent?: boolean | null;
  last_scheduled_checked_accounts?: number | null;
  last_scheduled_pending_accounts?: number | null;
  last_scheduled_alerted_accounts?: number | null;
  recent_scheduled_alert_exists: boolean;
  next_allowed_alert_at?: string | null;
};

export type CommercialPlan = {
  role: UserRole;
  plan: SubscriptionPlan;
  title: string;
  description: string;
  admin_price_placeholder: string;
  price_brl: number;
  billing_interval_placeholder: string;
  included_features: string[];
  checkout_public_enabled: boolean;
  admin_only_pricing: boolean;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  actor_user_id?: string | null;
  target_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type AdminAlertEntry = {
  id: string;
  alert_type: "WEBHOOK_FAILURE" | "PENDING_FINANCIAL" | string;
  source: string;
  email_sent: boolean;
  admin_recipient_configured: boolean;
  subject?: string | null;
  trigger?: string | null;
  days_threshold?: number | null;
  checked_accounts?: number | null;
  pending_accounts?: number | null;
  provider?: string | null;
  event_id?: string | null;
  error?: string | null;
  alerted_accounts?: number | null;
  created_at: string;
};

export type BillingConfig = {
  webhooks_enabled: boolean;
  webhook_secret_configured: boolean;
  webhook_path: string;
  signature_header: string;
  supported_providers: string[];
  status_mapping: Record<string, string>;
  secret_env_name: string;
  enabled_env_name: string;
  provider_capabilities: PaymentAdapterCapability[];
};

export type BillingWebhookMonitorEntry = {
  id: string;
  provider?: string | null;
  processing_status: "processed" | "duplicate" | "error" | string;
  event_id?: string | null;
  external_status?: string | null;
  subscription_status?: string | null;
  linked_user_id?: string | null;
  linked_user_email?: string | null;
  linked_user_name?: string | null;
  duplicate: boolean;
  error?: string | null;
  received_at: string;
};

export type EmailConfig = {
  smtp_configured: boolean;
  smtp_host_configured: boolean;
  smtp_username_configured: boolean;
  smtp_password_configured: boolean;
  smtp_from_email_configured: boolean;
  smtp_use_tls: boolean;
  smtp_port: number;
  admin_alert_recipient_configured: boolean;
  billing_pending_alerts_auto_enabled: boolean;
  billing_pending_alerts_auto_days: number;
  billing_pending_alerts_auto_interval_hours: number;
  billing_pending_alerts_auto_limit: number;
  password_reset_url_configured: boolean;
  required_env_names: string[];
};

export type PaymentAdapterCapability = {
  provider: string;
  checkout_enabled: boolean;
  provider_configured: boolean;
  production_enabled: boolean;
  webhook_signature_headers: string[];
  customer_reference_fields: string[];
  event_reference_fields: string[];
  required_env_names: string[];
  activation_checkpoints: string[];
};

export type MercadoPagoCheckout = {
  provider: "MERCADO_PAGO";
  preference_id: string;
  checkout_url: string;
  client_reference_id: string;
  price_brl: number;
};
