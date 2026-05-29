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
  created_at: string;
};

export type CommercialPlan = {
  role: UserRole;
  plan: SubscriptionPlan;
  title: string;
  description: string;
  admin_price_placeholder: string;
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

export type EmailConfig = {
  smtp_configured: boolean;
  smtp_host_configured: boolean;
  smtp_username_configured: boolean;
  smtp_password_configured: boolean;
  smtp_from_email_configured: boolean;
  smtp_use_tls: boolean;
  smtp_port: number;
  password_reset_url_configured: boolean;
  required_env_names: string[];
};

export type PaymentAdapterCapability = {
  provider: string;
  checkout_enabled: boolean;
  webhook_signature_headers: string[];
  customer_reference_fields: string[];
  event_reference_fields: string[];
  activation_checkpoints: string[];
};
