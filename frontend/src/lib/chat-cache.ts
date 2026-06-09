import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { ChatHistoryMessage } from "@/lib/chat";
import { getWebStorage } from "@/lib/web-storage";

export type CachedChatMessage = Partial<Pick<ChatHistoryMessage, "id" | "created_at" | "risk_level">> & {
  content: string;
  failed?: boolean;
  pending?: boolean;
  sender: "USER" | "BERGMANN";
};

export type ChatCache = {
  messages: CachedChatMessage[];
  session_id: string | null;
  updated_at: string;
  version: 1;
};

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 1200;
const localStorageLike = getWebStorage("local");

function storageKey(scope: string, language: string): string {
  const safeScope = scope.replace(/[^a-zA-Z0-9_-]/gu, "_");
  const safeLanguage = language.replace(/[^a-zA-Z0-9_-]/gu, "_");
  return `bergmann_chat_${safeScope}_${safeLanguage}`;
}

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorageLike.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorageLike.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

function normalizeMessages(messages: CachedChatMessage[]): CachedChatMessage[] {
  return messages.slice(-MAX_MESSAGES).map((message) => ({
    content: message.content.slice(0, MAX_CONTENT_LENGTH),
    created_at: message.created_at,
    failed: message.failed,
    id: message.id,
    pending: false,
    risk_level: message.risk_level,
    sender: message.sender
  }));
}

export async function getCachedChat(scope: string, language: string): Promise<ChatCache | null> {
  const raw = await getStoredItem(storageKey(scope, language));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ChatCache;
    if (parsed.version !== 1 || !Array.isArray(parsed.messages)) {
      return null;
    }
    return { ...parsed, messages: normalizeMessages(parsed.messages) };
  } catch {
    return null;
  }
}

export async function saveChatCache(
  scope: string,
  language: string,
  cache: Pick<ChatCache, "messages" | "session_id">
): Promise<void> {
  const payload: ChatCache = {
    messages: normalizeMessages(cache.messages),
    session_id: cache.session_id,
    updated_at: new Date().toISOString(),
    version: 1
  };

  await setStoredItem(storageKey(scope, language), JSON.stringify(payload));
}
