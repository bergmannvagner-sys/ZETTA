/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#0A0F1F",
        surface: "#101832",
        muted: "#B8BED6",
        mint: "#00E5FF",
        azure: "#0D47FF",
        violet: "#8A28E2",
        lilac: "#B89BFF",
        magenta: "#FF4DFF",
        amber: "#D9C7FF",
        rose: "#B89BFF"
      }
    }
  }
};
