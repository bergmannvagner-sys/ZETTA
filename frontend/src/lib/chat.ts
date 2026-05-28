import { ApiError, apiRequest } from "@/lib/api";

export type ChatResponse = {
  session_id: string | null;
  answer: string;
  risk_level: string;
  fallback: boolean;
};

type LocalChatResponse = {
  session_id: string;
  answer: string;
  risk_level: string;
  fallback: boolean;
};

type DeployedChatResponse = {
  message: string;
  riskLevel: string;
  conversationId?: string | null;
  scopeStatus?: string;
  actions?: string[];
  aiProvider?: string;
};

export async function sendChatMessage(message: string, sessionId: string | null): Promise<ChatResponse> {
  try {
    const data = await apiRequest<LocalChatResponse>("/chat/message", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId })
    });
    return {
      session_id: data.session_id,
      answer: data.answer,
      risk_level: data.risk_level,
      fallback: data.fallback
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
  }

  const deployed = await apiRequest<DeployedChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, socketId: sessionId })
  });

  return {
    session_id: deployed.conversationId ?? sessionId,
    answer: deployed.message,
    risk_level: deployed.riskLevel,
    fallback: false
  };
}
