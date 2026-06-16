import { getApiRequestBaseUrl } from "./api-url";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  document_type?: string | null;
  document_last4?: string | null;
  subscription_plan?: string;
  subscription_status?: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterRole = "USER" | "COMPANY";

export type RegisterPayload = {
  email: string;
  full_name: string;
  password: string;
  role: RegisterRole;
  document: string;
  lgpdConsent: boolean;
};

type ApiError = {
  detail?: unknown;
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return postAuth<AuthResponse>("/auth/login", payload, "Nao foi possivel autenticar.");
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return postAuth<AuthResponse>("/auth/register", payload, "Nao foi possivel criar a conta.");
}

async function postAuth<T>(path: string, payload: unknown, fallbackMessage: string): Promise<T> {
  const apiUrl = getApiRequestBaseUrl();
  if (!apiUrl) {
    throw new Error("Defina EXPO_PUBLIC_API_URL para conectar ao Render.");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const data = await readJsonResponse<T & ApiError>(response);
  if (!response.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : fallbackMessage);
  }

  if (!data) {
    throw new Error("Resposta invalida do backend.");
  }

  return data;
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}
