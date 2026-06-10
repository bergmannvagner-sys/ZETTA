/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#1A1030",
        surface: "#24153E",
        surfaceSoft: "#2B1849",
        surfaceStrong: "#37215D",
        primary: "#A855F7",
        primaryDark: "#DDD6FE",
        primaryLight: "#C4B5FD",
        textPrimary: "#F5EEFF",
        textSecondary: "#D9C8F0",
        textMuted: "#B7A3D8",
        ink: "#F5EEFF",
        muted: "#D9C8F0",
        mint: "#8B5CF6",
        azure: "#3B82F6",
        violet: "#7C3AED",
        lilac: "#C4B5FD",
        magenta: "#A78BFA",
        amber: "#F59E0B",
        rose: "#EF4444",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6"
      }
    }
  }
};
