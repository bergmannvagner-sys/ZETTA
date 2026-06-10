import Constants from "expo-constants";
import { Platform } from "react-native";

import { useAuthStore } from "@/store/auth-store";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

const NETWORK_ERROR_MESSAGE = "error.network";
const MISSING_API_URL_MESSAGE = "API não configurada. Defina EXPO_PUBLIC_API_URL no frontend/.env";
const AUTH_REQUIRED_MESSAGE = "error.authRequired";
const EXPIRED_SESSION_MESSAGE = "error.sessionExpired";
const PAID_PLAN_REQUIRED_MESSAGE = "error.paidPlanRequired";

export class ApiError extends Error {
  status: number;
  validation: ValidationIssue[];

  constructor(message: string, status: number, validation: ValidationIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.validation = validation;
  }
}

function normalizeApiUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
}

function isLocalIpHttpUrl(value: string): boolean {
  return /^http:\/\/(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(:\d+)?$/u.test(
    value
  );
}

function resolveApiUrl(): string {
  const apiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl);

  if (!apiUrl) {
    throw new Error(MISSING_API_URL_MESSAGE);
  }
  if (!/^https?:\/\//u.test(apiUrl)) {
    throw new Error("API mal configurada. EXPO_PUBLIC_API_URL deve começar com http:// ou https://.");
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(apiUrl) && Platform.OS !== "web") {
    throw new Error("API mal configurada. No Android físico, use o IP do PC ou a URL do Render.");
  }
  if (!__DEV__ && !apiUrl.startsWith("https://")) {
    throw new Error("API mal configurada. Em produção, EXPO_PUBLIC_API_URL deve usar https://.");
  }
  if (__DEV__ && apiUrl.startsWith("http://") && !isLocalIpHttpUrl(apiUrl)) {
    throw new Error("API mal configurada. Em desenvolvimento, http:// deve usar um IP local real.");
  }

  return apiUrl;
}

export const API_URL = resolveApiUrl();

export function getWebSocketUrl(path: string): string {
  const baseUrl = resolveApiUrl();
  const wsBaseUrl = baseUrl.replace(/^http/u, "ws");
  return `${wsBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

type ApiOptions = RequestInit & {
  auth?: boolean;
};

type ValidationIssue = {
  field: string;
  message: string;
  type: string;
};

function parseResponseBody(text: string): unknown {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { detail: "Resposta inválida do servidor." };
  }
}

function formatLocation(loc: unknown): string {
  if (!Array.isArray(loc)) {
    return "request";
  }
  return loc.filter((part) => part !== "body").join(".") || "request";
}

function getValidationIssues(data: unknown): ValidationIssue[] {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return [];
  }
  const detail = (data as { detail?: unknown }).detail;
  if (!Array.isArray(detail)) {
    return [];
  }
  return detail.map((issue) => {
    if (!issue || typeof issue !== "object") {
      return { field: "request", message: "Dado inválido.", type: "validation_error" };
    }
    const typedIssue = issue as { loc?: unknown; msg?: unknown; type?: unknown };
    return {
      field: formatLocation(typedIssue.loc),
      message: typeof typedIssue.msg === "string" ? typedIssue.msg : "Dado inválido.",
      type: typeof typedIssue.type === "string" ? typedIssue.type : "validation_error"
    };
  });
}

function getFriendlyFieldName(field: string): string {
  const names: Record<string, string> = {
    name: "Nome completo",
    full_name: "Nome completo",
    email: "E-mail",
    password: "Senha",
    role: "Tipo de conta",
    accountType: "Tipo de conta",
    lgpdConsent: "Consentimento LGPD"
  };
  return names[field] ?? field;
}

function getApiErrorMessage(data: unknown): string {
  const validationIssues = getValidationIssues(data);
  if (validationIssues.length > 0) {
    return validationIssues
      .map((issue) => `${getFriendlyFieldName(issue.field)}: ${issue.message}`)
      .join("\n");
  }
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object") {
      const structured = detail as { message?: unknown; errors?: unknown };
      const message =
        typeof structured.message === "string" ? structured.message : "Não foi possível concluir a ação.";
      if (Array.isArray(structured.errors)) {
        const errors = structured.errors.filter((error): error is string => typeof error === "string");
        return errors.length > 0 ? `${message}\n${errors.join("\n")}` : message;
      }
      return message;
    }
  }
  return "Não foi possível concluir a ação.";
}

function isInvalidTokenMessage(data: unknown): boolean {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return false;
  }
  return (data as { detail?: unknown }).detail === "Invalid token";
}

function isMissingTokenMessage(data: unknown): boolean {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return false;
  }
  const detail = (data as { detail?: unknown }).detail;
  return detail === "Missing token" || detail === "Not authenticated";
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const baseUrl = resolveApiUrl();
  const endpoint = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const shouldUseAuth = options.auth !== false;
  const token = useAuthStore.getState().accessToken;
  if (shouldUseAuth) {
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (__DEV__) {
    console.info("[api] request", { apiUrl: baseUrl, endpoint, method: options.method ?? "GET" });
  }

  try {
    const response = await fetch(endpoint, { ...options, headers });
    const text = await response.text();
    const data = parseResponseBody(text);
    if (!response.ok) {
      const validation = getValidationIssues(data);
      if (__DEV__) {
        console.warn("[api] response error", {
          endpoint,
          status: response.status,
          validation
        });
      }
      if (response.status === 401 && shouldUseAuth) {
        if (token && isInvalidTokenMessage(data)) {
          await useAuthStore.getState().clearSession();
          throw new ApiError(EXPIRED_SESSION_MESSAGE, response.status, validation);
        }
        if (!token || isMissingTokenMessage(data)) {
          throw new ApiError(AUTH_REQUIRED_MESSAGE, response.status, validation);
        }
      }
      if (response.status === 402) {
        throw new ApiError(PAID_PLAN_REQUIRED_MESSAGE, response.status, validation);
      }
      throw new ApiError(getApiErrorMessage(data), response.status, validation);
    }
    return data as T;
  } catch (error) {
    if (__DEV__) {
      console.warn("[api] request failed", {
        apiUrl: baseUrl,
        endpoint,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
    const isNetworkFailure =
      error instanceof Error && (error.message === "Network request failed" || /failed to fetch/i.test(error.message));
    if (error instanceof Error && !isNetworkFailure) {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }
}
