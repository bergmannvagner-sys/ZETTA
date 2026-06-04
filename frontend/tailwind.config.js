/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#070B18",
        surface: "#11162D",
        muted: "#B8BED6",
        mint: "#6FE7F5",
        azure: "#3349A6",
        violet: "#7C5CFF",
        lilac: "#B9A7FF",
        magenta: "#D7A4FF",
        amber: "#D9C7FF",
        rose: "#E4A7D2"
      }
    }
  }
};
