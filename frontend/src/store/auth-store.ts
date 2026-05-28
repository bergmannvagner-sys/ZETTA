import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { AuthUser } from "@/types/auth";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const ACCESS_KEY = "bergmann_access_token";
const REFRESH_KEY = "bergmann_refresh_token";
const USER_KEY = "bergmann_user";

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setSession: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ accessToken, refreshToken, user });
  },
  clearSession: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hydrate: async () => {
    try {
      const [accessToken, refreshToken, rawUser] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
        SecureStore.getItemAsync(USER_KEY)
      ]);
      set({
        accessToken,
        refreshToken,
        user: rawUser ? (JSON.parse(rawUser) as AuthUser) : null,
        hydrated: true
      });
    } catch {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
    }
  }
}));
