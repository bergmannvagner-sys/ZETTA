import { Platform } from "react-native";

export function getApiUrl(): string | null {
  return process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/u, "") || null;
}

export function getApiRequestBaseUrl(): string | null {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return null;
  }

  return Platform.OS === "web" ? "/api/render" : apiUrl;
}
