import { getApiRequestBaseUrl } from "./api-url";
import { withRequestTimeout } from "./request-timeout";

export type SupportChatMessage = {
  sender: "USER" | "BERGMANN";
  content: string;
};

export type SupportChatResponse = {
  session_id: string | null;
  answer: string;
  risk_level: string;
  fallback: boolean;
  in_scope: boolean;
};

export type SupportMessagePayload = {
  message: string;
  language?: "pt-BR" | "en" | "es";
  contextMessages?: SupportChatMessage[];
  sessionId?: string | null;
  accessToken?: string | null;
};

type ApiError = {
  detail?: unknown;
};

const SUPPORT_MESSAGE_TIMEOUT_MS = 10000;

export async function sendSupportMessage(payload: SupportMessagePayload): Promise<SupportChatResponse> {
  const apiUrl = getApiRequestBaseUrl();
  if (!apiUrl) {
    throw new Error("Defina EXPO_PUBLIC_API_URL para conectar ao Render.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (payload.accessToken) {
    headers.Authorization = `Bearer ${payload.accessToken}`;
  }

  const response = await withRequestTimeout(
    (signal) =>
      fetch(`${apiUrl}/support/message`, {
        body: JSON.stringify({
          message: payload.message,
          language: payload.language,
          context_messages: payload.contextMessages,
          session_id: payload.sessionId
        }),
        headers,
        method: "POST",
        signal
      }),
    SUPPORT_MESSAGE_TIMEOUT_MS,
    "Tempo esgotado ao conectar ao Render."
  );

  const data = await readJsonResponse<SupportChatResponse & ApiError>(response);
  if (!response.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : "Nao foi possivel abrir o suporte com IA.");
  }
  if (!data) {
    throw new Error("Resposta invalida do suporte.");
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
