/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#FAFAFC",
        surface: "#FFFFFF",
        surfaceSoft: "#F5F3FF",
        primary: "#8B5CF6",
        primaryDark: "#7C3AED",
        primaryLight: "#C4B5FD",
        textPrimary: "#1F2937",
        textSecondary: "#6B7280",
        textMuted: "#9CA3AF",
        ink: "#1F2937",
        muted: "#6B7280",
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
