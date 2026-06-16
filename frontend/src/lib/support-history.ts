import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { SupportChatMessage } from "./support";
import { getWebStorage } from "./web-storage";

const HISTORY_PREFIX = "bergmann_support_history";
const MAX_STORED_MESSAGES = 40;

function historyKey(userId: string): string {
  return `${HISTORY_PREFIX}:${userId}`;
}

export async function loadSupportHistory(userId: string): Promise<SupportChatMessage[]> {
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  const raw = webStorage ? webStorage.getItem(historyKey(userId)) : await SecureStore.getItemAsync(historyKey(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SupportChatMessage[] | null;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is SupportChatMessage =>
        Boolean(item) && (item.sender === "USER" || item.sender === "BERGMANN") && typeof item.content === "string"
    );
  } catch {
    if (webStorage) {
      webStorage.removeItem(historyKey(userId));
    } else {
      await SecureStore.deleteItemAsync(historyKey(userId));
    }
    return [];
  }
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

export async function clearSupportHistory(userId: string): Promise<void> {
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  if (webStorage) {
    webStorage.removeItem(historyKey(userId));
    return;
  }

  await SecureStore.deleteItemAsync(historyKey(userId));
}
