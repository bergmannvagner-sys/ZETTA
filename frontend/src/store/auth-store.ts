import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { AuthUser } from "@/types/auth";
import { getWebStorage } from "@/lib/web-storage";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const ACCESS_KEY = "bergmann_access_token";
const REFRESH_KEY = "bergmann_refresh_token";
const USER_KEY = "bergmann_user";

const sessionStorageLike = getWebStorage("session");

async function setStoredItem(key: string, value: string): Promise<void> {
  if (typeof window !== "undefined") {
    sessionStorageLike.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getStoredItem(key: string): Promise<string | null> {
  if (typeof window !== "undefined") {
    return sessionStorageLike.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStoredItem(key: string): Promise<void> {
  if (typeof window !== "undefined") {
    sessionStorageLike.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setSession: async (accessToken, refreshToken, user) => {
    await setStoredItem(ACCESS_KEY, accessToken);
    await setStoredItem(REFRESH_KEY, refreshToken);
    await setStoredItem(USER_KEY, JSON.stringify(user));
    set({ accessToken, refreshToken, user });
  },
  updateUser: async (user) => {
    await setStoredItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
  clearSession: async () => {
    await deleteStoredItem(ACCESS_KEY);
    await deleteStoredItem(REFRESH_KEY);
    await deleteStoredItem(USER_KEY);
    set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
  },
  hydrate: async () => {
    try {
      const [accessToken, refreshToken, rawUser] = await Promise.all([
        getStoredItem(ACCESS_KEY),
        getStoredItem(REFRESH_KEY),
        getStoredItem(USER_KEY)
      ]);
      set({
        accessToken,
        refreshToken,
        user: rawUser ? (JSON.parse(rawUser) as AuthUser) : null,
        hydrated: true
      });
    } catch {
      await deleteStoredItem(ACCESS_KEY);
      await deleteStoredItem(REFRESH_KEY);
      await deleteStoredItem(USER_KEY);
      set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
    }
  }
}));
