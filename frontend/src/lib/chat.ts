import { apiRequest } from "@/lib/api";

export type ChatResponse = {
  session_id: string;
  user_message_id: string | null;
  assistant_message_id: string | null;
  answer: string;
  risk_level: string;
  fallback: boolean;
  in_scope: boolean;
};

export type ChatHistoryMessage = {
  id: string;
  sender: "USER" | "BERGMANN";
  content: string;
  risk_level: string;
  created_at: string;
};

export type ChatHistoryResponse = {
  session_id: string | null;
  messages: ChatHistoryMessage[];
};

type ChatMessageResponse = {
  session_id: string;
  user_message_id?: string | null;
  assistant_message_id?: string | null;
  answer: string;
  risk_level: string;
  fallback: boolean;
  in_scope?: boolean;
};

function normalizeChatResponse(data: ChatMessageResponse): ChatResponse {
  return {
    session_id: data.session_id,
    user_message_id: data.user_message_id ?? null,
    assistant_message_id: data.assistant_message_id ?? null,
    answer: data.answer,
    risk_level: data.risk_level,
    fallback: data.fallback,
    in_scope: data.in_scope ?? true
  };
}

export async function getChatHistory(): Promise<ChatHistoryResponse> {
  return apiRequest<ChatHistoryResponse>("/chat/history");
}

export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  language?: string
): Promise<ChatResponse> {
  const data = await apiRequest<ChatMessageResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId, language })
  });

  return normalizeChatResponse(data);
}

export async function editChatMessage(
  messageId: string,
  message: string,
  language?: string
): Promise<ChatResponse> {
  const data = await apiRequest<ChatMessageResponse>(`/chat/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ message, language })
  });

  return normalizeChatResponse(data);
}
