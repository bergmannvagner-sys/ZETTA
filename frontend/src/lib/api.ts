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

class RetryableAuthError extends ApiError {}

type RefreshOutcome =
  | { kind: "success"; accessToken: string; refreshToken: string }
  | { kind: "invalid" }
  | { kind: "network" };

let refreshSessionPromise: Promise<RefreshOutcome> | null = null;

function normalizeApiUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
}

function isLocalIpHttpUrl(value: string): boolean {
  return /^http:\/\/(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(:\d+)?$/u.test(
    value
  );
}

// Keep module import safe. We validate the configured URL when a request is made.
export const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl);

function resolveApiUrl(): string {
  const apiUrl = API_URL;

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

async function refreshAuthSession(): Promise<RefreshOutcome> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    return { kind: "invalid" };
  }

  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = (async () => {
    const requestedRefreshToken = refreshToken;
    const endpoint = `${resolveApiUrl()}/auth/refresh`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const data = parseResponseBody(await response.text());
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          return { kind: "invalid" };
        }
        return { kind: "network" };
      }

      const accessToken = (data as { access_token?: unknown; accessToken?: unknown }).access_token ??
        (data as { access_token?: unknown; accessToken?: unknown }).accessToken;
      const nextRefreshToken = (data as { refresh_token?: unknown; refreshToken?: unknown }).refresh_token ??
        (data as { refresh_token?: unknown; refreshToken?: unknown }).refreshToken;
      if (typeof accessToken !== "string" || typeof nextRefreshToken !== "string") {
        return { kind: "invalid" };
      }
      if (useAuthStore.getState().refreshToken !== requestedRefreshToken) {
        return { kind: "invalid" };
      }
      await useAuthStore.getState().setTokens(accessToken, nextRefreshToken);
      return { kind: "success", accessToken, refreshToken: nextRefreshToken };
    } catch {
      return { kind: "network" };
    } finally {
      refreshSessionPromise = null;
    }
  })();

  return refreshSessionPromise;
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

async function handleApiResponse<T>(
  response: Response,
  endpoint: string,
  shouldUseAuth: boolean,
  token: string | null
): Promise<T> {
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
        throw new RetryableAuthError(EXPIRED_SESSION_MESSAGE, response.status, validation);
      }
      if (!token || isMissingTokenMessage(data)) {
        throw new ApiError(AUTH_REQUIRED_MESSAGE, response.status, validation);
      }
    }
    if (response.status === 403 && shouldUseAuth) {
      if (token && data && typeof data === "object" && "detail" in data && (data as { detail?: unknown }).detail === "Account archived") {
        await useAuthStore.getState().clearSession();
        throw new ApiError(EXPIRED_SESSION_MESSAGE, response.status, validation);
      }
    }
    if (response.status === 402) {
      throw new ApiError(PAID_PLAN_REQUIRED_MESSAGE, response.status, validation);
    }
    throw new ApiError(getApiErrorMessage(data), response.status, validation);
  }
  return data as T;
}

async function requestWithAutoRefresh<T>(
  endpoint: string,
  options: ApiOptions,
  body: BodyInit | null | undefined,
  contentType: string | null
): Promise<T> {
  const shouldUseAuth = options.auth !== false;
  let token = shouldUseAuth ? useAuthStore.getState().accessToken : null;
  let retriedAfterRefresh = false;

  for (;;) {
    const headers = new Headers(options.headers);
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    if (shouldUseAuth && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (__DEV__) {
      const kind = contentType ? "request" : "upload request";
      console.info("[api]", kind, { apiUrl: resolveApiUrl(), endpoint, method: options.method ?? "GET" });
    }

    try {
      const response = await fetch(endpoint, { ...options, headers, body });
      return await handleApiResponse<T>(response, endpoint, shouldUseAuth, token);
    } catch (error) {
      if (error instanceof RetryableAuthError && shouldUseAuth) {
        if (retriedAfterRefresh) {
          await useAuthStore.getState().clearSession();
          throw error;
        }
        const outcome = await refreshAuthSession();
        if (outcome.kind === "success") {
          token = outcome.accessToken;
          retriedAfterRefresh = true;
          continue;
        }
        if (outcome.kind === "invalid") {
          await useAuthStore.getState().clearSession();
        }
        throw error;
      }
      if (error instanceof ApiError) {
        throw error;
      }
      const isNetworkFailure =
        error instanceof Error && (error.message === "Network request failed" || /failed to fetch/i.test(error.message));
      if (__DEV__ && isNetworkFailure) {
        console.warn("[api] request failed", {
          apiUrl: resolveApiUrl(),
          endpoint,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
      if (error instanceof Error && !isNetworkFailure) {
        throw error;
      }
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
    }
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const baseUrl = resolveApiUrl();
  const endpoint = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  return requestWithAutoRefresh<T>(endpoint, options, options.body ?? null, "application/json");
}

export async function apiUploadRequest<T>(path: string, body: FormData, options: ApiOptions = {}): Promise<T> {
  const baseUrl = resolveApiUrl();
  const endpoint = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  return requestWithAutoRefresh<T>(endpoint, { ...options, method: options.method ?? "POST" }, body, null);
}
