import * as SecureStore from "expo-secure-store";

import type { AuthUser } from "./auth";

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export const SESSION_STORAGE_KEY = "bergmann_minimal_session";

export async function loadSession(): Promise<SessionState | null> {
  const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
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
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function saveSession(session: SessionState): Promise<void> {
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
