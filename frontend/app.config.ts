import { ExpoConfig } from "expo/config";

const isProduction = process.env.APP_ENV === "production";
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

function normalizeApiUrl(value: string | undefined): string | undefined {
  return value?.replace(/\/+$/, "");
}

function isLocalIpHttpUrl(value: string): boolean {
  return /^http:\/\/(10|172\.(1[6-9]|2\d|3[0-1])|192\.168)\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/u.test(value);
}

const apiUrl = normalizeApiUrl(rawApiUrl);

if (isProduction && !apiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required in production builds");
} else if (!apiUrl) {
  console.warn("EXPO_PUBLIC_API_URL is not set. API calls will fail until frontend/.env is configured.");
} else if (!/^https?:\/\//u.test(apiUrl)) {
  if (isProduction) {
    throw new Error("EXPO_PUBLIC_API_URL must start with http:// or https://");
  }
  console.warn("EXPO_PUBLIC_API_URL must start with http:// or https://");
} else if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(apiUrl)) {
  if (isProduction) {
    throw new Error("EXPO_PUBLIC_API_URL cannot use localhost or 127.0.0.1.");
  }
  console.warn("EXPO_PUBLIC_API_URL cannot use localhost or 127.0.0.1 for Expo Go on Android.");
} else if (isProduction && !apiUrl.startsWith("https://")) {
  throw new Error("EXPO_PUBLIC_API_URL must use https:// in production builds");
} else if (!isProduction && apiUrl.startsWith("http://") && !isLocalIpHttpUrl(apiUrl)) {
  console.warn("Development http:// API URLs must use a real local network IP, such as http://192.168.0.14:8000");
}

const config: ExpoConfig = {
  name: "Bergmann",
  slug: "zetta-bergmann",
  scheme: "bergmann",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  splash: {
    backgroundColor: "#0A0F1F"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.zetta.bergmann"
  },
  android: {
    package: "com.zetta.bergmann",
    adaptiveIcon: {
      backgroundColor: "#0A0F1F"
    },
    config: googleMapsApiKey
      ? {
          googleMaps: {
            apiKey: googleMapsApiKey
          }
        }
      : undefined,
    permissions: []
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-audio",
    "expo-asset",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Bergmann usa sua localizacao apenas para mostrar apoio proximo em situacoes de cuidado e SOS."
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    apiUrl
  }
};

export default config;
