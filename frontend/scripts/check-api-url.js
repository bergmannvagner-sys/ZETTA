const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/gu, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeApiUrl(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/u, "") : undefined;
}

function isLocalIpHttpUrl(value) {
  return /^http:\/\/(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(:\d+)?$/u.test(
    value
  );
}

const root = path.resolve(__dirname, "..");
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const apiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
const isProduction = process.env.APP_ENV === "production";

if (!apiUrl) {
  console.error("API nao configurada. Defina EXPO_PUBLIC_API_URL no frontend/.env");
  process.exit(1);
}

if (!/^https?:\/\//u.test(apiUrl)) {
  console.error("EXPO_PUBLIC_API_URL deve comecar com http:// ou https://");
  process.exit(1);
}

if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(apiUrl)) {
  console.error("EXPO_PUBLIC_API_URL nao pode usar localhost ou 127.0.0.1 no Expo Go Android.");
  process.exit(1);
}

if (isProduction && !apiUrl.startsWith("https://")) {
  console.error("EXPO_PUBLIC_API_URL deve usar https:// em production.");
  process.exit(1);
}

if (!isProduction && apiUrl.startsWith("http://") && !isLocalIpHttpUrl(apiUrl)) {
  console.error("Em development, http:// deve usar um IP local real, por exemplo http://192.168.0.14:8000");
  process.exit(1);
}

console.log(`API_URL resolvida: ${apiUrl}`);
