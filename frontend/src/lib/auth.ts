import { apiRequest } from "@/lib/api";
import { AccountStatus, AuthResponse, AuthUser, UserRole } from "@/types/auth";

type RegisterInput = {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  document: string;
  lgpdConsent: boolean;
};

type LoginInput = {
  email: string;
  password: string;
};

type RawAuthUser = Partial<AuthUser> & {
  name?: string;
  accountStatus?: AccountStatus;
};

type RawAuthResponse = Partial<AuthResponse> & {
  accessToken?: string;
  refreshToken?: string;
  user: RawAuthUser;
};

type PasswordResetRequestResponse = {
  message: string;
  reset_token?: string | null;
};

const organizationRoles = new Set<UserRole>([
  "COMPANY",
  "NGO",
  "HOSPITAL",
  "CLINIC",
  "SPONSOR",
  "PUBLIC_INSTITUTION"
]);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, " ");
}

export function getDocumentRequirement(role: UserRole): {
  type: "CPF" | "CNPJ" | "CRP";
  label: string;
  helper: string;
} {
  if (organizationRoles.has(role)) {
    return {
      type: "CNPJ",
      label: "CNPJ",
      helper: "Usado para reduzir contas falsas e liberar a conta apos validacao."
    };
  }
  if (role === "PSYCHOLOGIST") {
    return {
      type: "CRP",
      label: "CRP",
      helper: "O registro profissional sera validado antes de liberar recursos clinicos."
    };
  }
  return {
    type: "CPF",
    label: "CPF",
    helper: "Usado apenas para validacao da conta e prevencao de duplicidade."
  };
}

function normalizeDocumentForValidation(role: UserRole, document: string): string {
  const requirement = getDocumentRequirement(role);
  if (requirement.type === "CRP") {
    return document.trim().replace(/\s+/gu, "").toUpperCase();
  }
  return document.replace(/\D/gu, "");
}

export function validateRegisterInput(input: RegisterInput): string | null {
  const fullName = normalizeName(input.full_name);
  const email = normalizeEmail(input.email);

  if (fullName.length < 2) {
    return "Informe seu nome completo.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return "Informe um email valido.";
  }
  if (input.password.length < 8) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  if (input.password.length > 128) {
    return "A senha deve ter no maximo 128 caracteres.";
  }
  if (input.role === "SUPER_ADMIN") {
    return "Administrador interno nao pode ser criado pelo cadastro publico.";
  }
  const requirement = getDocumentRequirement(input.role);
  const document = normalizeDocumentForValidation(input.role, input.document);
  if (requirement.type === "CPF" && document.length !== 11) {
    return "Informe um CPF valido para validacao da conta.";
  }
  if (requirement.type === "CNPJ" && document.length !== 14) {
    return "Informe um CNPJ valido para validacao da conta.";
  }
  if (requirement.type === "CRP" && !/^[A-Z0-9/-]{4,32}$/u.test(document)) {
    return "Informe um CRP valido para validacao profissional.";
  }
  if (!input.lgpdConsent) {
    return "Aceite o consentimento LGPD para criar sua conta.";
  }
  return null;
}

function normalizeAuthResponse(data: RawAuthResponse): AuthResponse {
  const accessToken = data.access_token ?? data.accessToken;
  const refreshToken = data.refresh_token ?? data.refreshToken;
  const rawUser = data.user;

  if (!accessToken || !refreshToken || !rawUser?.id || !rawUser.email) {
    if (__DEV__) {
      console.warn("[auth] invalid auth response shape", {
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(refreshToken),
        hasUserId: Boolean(rawUser?.id),
        hasUserEmail: Boolean(rawUser?.email)
      });
    }
    throw new Error("Resposta de autenticacao invalida.");
  }

  const user: AuthUser = {
    id: rawUser.id,
    email: rawUser.email,
    full_name: rawUser.full_name ?? rawUser.name ?? rawUser.email,
    role: rawUser.role ?? "USER",
    status: rawUser.status ?? rawUser.accountStatus ?? "ACTIVE",
    document_type: rawUser.document_type,
    document_last4: rawUser.document_last4
  };

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: data.token_type ?? "bearer",
    user
  };
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const validationError = validateRegisterInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const fullName = normalizeName(input.full_name);
  const email = normalizeEmail(input.email);
  const body = {
    email,
    password: input.password,
    full_name: fullName,
    name: fullName,
    role: input.role,
    accountType: input.role,
    document: input.document.trim(),
    lgpdConsent: input.lgpdConsent
  };

  if (__DEV__) {
    console.info("[auth] register payload", {
      email,
      fullNameLength: fullName.length,
      role: input.role,
      sentFields: Object.keys(body).filter((key) => key !== "password")
    });
  }

  const data = await apiRequest<RawAuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    auth: false
  });
  return normalizeAuthResponse(data);
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error("Informe um email valido.");
  }
  if (!input.password) {
    throw new Error("Informe sua senha.");
  }

  const data = await apiRequest<RawAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: input.password }),
    auth: false
  });
  return normalizeAuthResponse(data);
}

export function getMe() {
  return apiRequest<AuthUser>("/users/me");
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResponse> {
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedEmail)) {
    throw new Error("Informe um email valido.");
  }
  return apiRequest<PasswordResetRequestResponse>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail }),
    auth: false
  });
}

export async function confirmPasswordReset(input: {
  token: string;
  newPassword: string;
}): Promise<{ message: string }> {
  if (input.token.trim().length < 32) {
    throw new Error("Informe o codigo de recuperacao.");
  }
  if (input.newPassword.length < 8) {
    throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
  }
  return apiRequest<{ message: string }>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token: input.token.trim(), new_password: input.newPassword }),
    auth: false
  });
}
