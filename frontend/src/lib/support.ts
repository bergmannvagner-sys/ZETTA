import { getApiUrl } from "./api-url";

export type SupportChatMessage = {
  sender: "USER" | "BERGMANN";
  content: string;
};

export type SupportChatResponse = {
  answer: string;
  risk_level: string;
  fallback: boolean;
  in_scope: boolean;
};

export type SupportMessagePayload = {
  message: string;
  language?: "pt-BR" | "en" | "es";
  contextMessages?: SupportChatMessage[];
};

type ApiError = {
  detail?: unknown;
};

export async function sendSupportMessage(payload: SupportMessagePayload): Promise<SupportChatResponse> {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error("Defina EXPO_PUBLIC_API_URL para conectar ao Render.");
  }

  const response = await fetch(`${apiUrl}/support/message`, {
    body: JSON.stringify({
      message: payload.message,
      language: payload.language,
      context_messages: payload.contextMessages
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

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
