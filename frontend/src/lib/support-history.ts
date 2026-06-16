import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { SupportChatMessage } from "./support";
import { getApiRequestBaseUrl } from "./api-url";
import { withRequestTimeout } from "./request-timeout";
import { getWebStorage } from "./web-storage";

const HISTORY_PREFIX = "bergmann_support_history";
const MAX_STORED_MESSAGES = 40;
const REMOTE_HISTORY_TIMEOUT_MS = 2000;

export type SupportHistorySnapshot = {
  messages: SupportChatMessage[];
  session_id: string | null;
};

function historyKey(userId: string): string {
  return `${HISTORY_PREFIX}:${userId}`;
}

function normalizeMessages(messages: unknown): SupportChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.filter(
    (item): item is SupportChatMessage =>
      Boolean(item) && typeof item === "object" && "sender" in item && "content" in item &&
      (item as SupportChatMessage).sender !== undefined &&
      ((item as SupportChatMessage).sender === "USER" || (item as SupportChatMessage).sender === "BERGMANN") &&
      typeof (item as SupportChatMessage).content === "string"
  );
}

async function readLocalSupportHistory(userId: string): Promise<SupportHistorySnapshot | null> {
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  const raw = webStorage ? webStorage.getItem(historyKey(userId)) : await SecureStore.getItemAsync(historyKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return {
      messages: normalizeMessages(Array.isArray(parsed) ? parsed : (parsed as { messages?: unknown }).messages),
      session_id: null
    };
  } catch {
    if (webStorage) {
      webStorage.removeItem(historyKey(userId));
    } else {
      await SecureStore.deleteItemAsync(historyKey(userId));
    }
    return null;
  }
}

async function readRemoteSupportHistory(accessToken: string): Promise<SupportHistorySnapshot | null> {
  const apiUrl = getApiRequestBaseUrl();
  if (!apiUrl) {
    return null;
  }

  const response = await withRequestTimeout(
    (signal) =>
      fetch(`${apiUrl}/support/history`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        signal
      }),
    REMOTE_HISTORY_TIMEOUT_MS,
    "Tempo esgotado ao carregar o historico do Render."
  );

  if (!response.ok) {
    return null;
  }

  const raw = (await response.json().catch(() => null)) as
    | {
        messages?: unknown;
        session_id?: unknown;
      }
    | null;

  return {
    messages: normalizeMessages(raw?.messages),
    session_id: typeof raw?.session_id === "string" ? raw.session_id : null
  };
}

export async function saveSupportHistory(userId: string, messages: SupportChatMessage[]): Promise<void> {
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  if (webStorage) {
    webStorage.setItem(historyKey(userId), JSON.stringify(trimmed));
    return;
  }

  await SecureStore.setItemAsync(historyKey(userId), JSON.stringify(trimmed));
}

export async function loadSupportHistory(
  userId: string,
  accessToken?: string | null
): Promise<SupportHistorySnapshot> {
  if (accessToken) {
    try {
      const remoteHistory = await readRemoteSupportHistory(accessToken);
      if (remoteHistory) {
        if (remoteHistory.messages.length > 0) {
          await saveSupportHistory(userId, remoteHistory.messages);
        } else {
          await clearSupportHistory(userId);
        }
        return remoteHistory;
      }
    } catch {
      // Fallback local when the Render endpoint is unavailable.
    }
  }

  const localHistory = await readLocalSupportHistory(userId);
  return localHistory ?? { messages: [], session_id: null };
}

export async function clearSupportHistory(userId: string): Promise<void> {
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  if (webStorage) {
    webStorage.removeItem(historyKey(userId));
    return;
  }

  await SecureStore.deleteItemAsync(historyKey(userId));
}
