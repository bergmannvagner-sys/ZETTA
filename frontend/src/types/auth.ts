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

export type AccountStatus = "ACTIVE" | "PENDING_VERIFICATION" | "REJECTED";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: AccountStatus;
  document_type?: "CPF" | "CNPJ" | "CRP" | string | null;
  document_last4?: string | null;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type PendingAccount = AuthUser & {
  created_at: string;
};
