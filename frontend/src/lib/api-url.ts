export function getApiUrl(): string | null {
  return process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/u, "") || null;
}
