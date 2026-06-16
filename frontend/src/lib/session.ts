import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthUser } from "./auth";
import { getWebStorage } from "./web-storage";

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export const SESSION_STORAGE_KEY = "bergmann_minimal_session";

export async function loadSession(): Promise<SessionState | null> {
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  const raw = webStorage ? webStorage.getItem(SESSION_STORAGE_KEY) : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionState> | null;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed.user?.id || !parsed.user?.email) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user
    };
  } catch {
    if (webStorage) {
      webStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    }
    return null;
  }
}

export async function saveSession(session: SessionState): Promise<void> {
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  if (webStorage) {
    webStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  const webStorage = Platform.OS === "web" ? getWebStorage() : null;
  if (webStorage) {
    webStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
