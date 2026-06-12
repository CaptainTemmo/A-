/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A1628",
          light: "#111D2E",
          card: "#1A2744",
        },
        secondary: "#1E3A5F",
        accent: {
          DEFAULT: "#00D4FF",
          glow: "rgba(0, 212, 255, 0.3)",
        },
        up: "#FF4757",
        down: "#2ED573",
        gold: "#FFD700",
        text: {
          primary: "#FFFFFF",
          secondary: "#8B9DC3",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.1)",
          glow: "rgba(0, 212, 255, 0.5)",
        },
      },
      fontFamily: {
        sans: ["Noto Sans SC", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
