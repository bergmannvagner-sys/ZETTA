import * as SecureStore from "expo-secure-store";

import type { SupportChatMessage } from "./support";

const HISTORY_PREFIX = "bergmann_support_history";
const MAX_STORED_MESSAGES = 40;

function historyKey(userId: string): string {
  return `${HISTORY_PREFIX}:${userId}`;
}

export async function loadSupportHistory(userId: string): Promise<SupportChatMessage[]> {
  const raw = await SecureStore.getItemAsync(historyKey(userId));
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
    await SecureStore.deleteItemAsync(historyKey(userId));
    return [];
  }
}

export async function saveSupportHistory(userId: string, messages: SupportChatMessage[]): Promise<void> {
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  await SecureStore.setItemAsync(historyKey(userId), JSON.stringify(trimmed));
}

export async function clearSupportHistory(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(historyKey(userId));
}
