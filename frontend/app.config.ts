import { ExpoConfig } from "expo/config";

const isProduction = process.env.APP_ENV === "production";
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

function normalizeApiUrl(value: string | undefined): string | undefined {
  return value?.replace(/\/+$/u, "");
}

function isLocalIpHttpUrl(value: string): boolean {
  return /^http:\/\/(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(:\d+)?$/u.test(
    value
  );
}

const apiUrl = normalizeApiUrl(rawApiUrl);

if (isProduction && !apiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required in production builds");
} else if (!apiUrl) {
  // Runtime API calls and scripts/check-api-url.js show the actionable local setup error.
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
  name: "ZETTA",
  slug: "zetta-bergmann",
  scheme: "meuapp",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: false,
  splash: {
    backgroundColor: "#020204",
    image: "./assets/splash-icon.png",
    resizeMode: "contain"
  },
  ios: {
    icon: "./assets/icon.png",
    supportsTablet: true,
    bundleIdentifier: "com.zetta.bergmann",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        "Bergmann usa a camera apenas durante teleatendimentos autorizados dentro do app.",
      NSMicrophoneUsageDescription:
        "Bergmann usa o microfone apenas durante teleatendimentos autorizados dentro do app."
    }
  },
  android: {
    package: "com.zetta.bergmann",
    permissions: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
    adaptiveIcon: {
      backgroundColor: "#020204",
      foregroundImage: "./assets/adaptive-icon.png"
    },
    config: googleMapsApiKey
      ? {
          googleMaps: {
            apiKey: googleMapsApiKey
          }
        }
      : undefined
  },
  plugins: ["expo-router", "expo-secure-store", "expo-font", "expo-audio", "expo-asset", "expo-localization"],
  web: {
    favicon: "./assets/favicon.png"
  },
  experiments: {
    typedRoutes: true
  },
  extra: {
    apiUrl,
    eas: {
      projectId: "d44d4733-bbf0-487b-980e-a948ea541a27"
    }
  }
};

export default config;
