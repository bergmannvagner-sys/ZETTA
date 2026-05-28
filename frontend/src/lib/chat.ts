import { apiRequest } from "@/lib/api";

export type ChatResponse = {
  session_id: string | null;
  answer: string;
  risk_level: string;
  fallback: boolean;
};

type ChatMessageResponse = {
  session_id: string;
  answer: string;
  risk_level: string;
  fallback: boolean;
};

export async function sendChatMessage(message: string, sessionId: string | null): Promise<ChatResponse> {
  const data = await apiRequest<ChatMessageResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId })
  });

  return {
    session_id: data.session_id,
    answer: data.answer,
    risk_level: data.risk_level,
    fallback: data.fallback
  };
}
