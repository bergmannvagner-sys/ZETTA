import { Platform } from "react-native";

import { apiRequest, apiUploadRequest } from "@/lib/api";

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

export type VoiceChatResponse = ChatResponse & {
  transcript: string;
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

type VoiceChatApiResponse = ChatMessageResponse & {
  transcript: string;
};

const AUDIO_MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mpeg: "audio/mpeg",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  aac: "audio/aac",
  caf: "audio/x-caf",
  "3gp": "audio/3gpp"
};

function inferAudioFileDetails(uri: string): { name: string; type: string } {
  const fileMatch = uri.match(/\.([a-z0-9]+)(?:[?#].*)?$/iu);
  const extension = fileMatch?.[1]?.toLowerCase() ?? (Platform.OS === "web" ? "webm" : "m4a");
  const type = AUDIO_MIME_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
  return {
    name: `bergmann-voice-${Date.now()}.${extension}`,
    type
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

export async function sendVoiceChatAudio(
  audioUri: string,
  sessionId: string | null,
  language?: string
): Promise<VoiceChatResponse> {
  const formData = new FormData();
  const { name, type } = inferAudioFileDetails(audioUri);

  if (Platform.OS === "web") {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    formData.append("audio", blob, name);
  } else {
    formData.append("audio", { uri: audioUri, name, type } as any);
  }

  if (sessionId) {
    formData.append("session_id", sessionId);
  }
  if (language) {
    formData.append("language", language);
  }

  const data = await apiUploadRequest<VoiceChatApiResponse>("/chat/voice", formData);
  return {
    ...normalizeChatResponse(data),
    transcript: data.transcript
  };
}
