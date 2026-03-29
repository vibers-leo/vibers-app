/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#39FF14",
          light: "#6FFF4F",
          dark: "#2BCC10",
        },
        secondary: "#00D9FF",
        bg: "#050505",
        surface: "#111111",
        card: "#1a1a1a",
        text: {
          DEFAULT: "#f0f0f0",
          muted: "#888888",
        },
        border: "#2a2a2a",
        success: "#39FF14",
        error: "#ff3366",
      },
    },
  },
  plugins: [],
};
