export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 25px 50px -12px rgba(15, 23, 42, 0.12)",
        soft: "0 14px 45px rgba(15, 23, 42, 0.08)",
        raised: "0 8px 24px rgba(15, 23, 42, 0.10)",
        overlay: "0 20px 45px rgba(15, 23, 42, 0.18)",
      },
      borderRadius: {
        xl: "1.5rem",
        "2xl": "2rem",
      },
      colors: {
        healthcare: {
          primary: "#0b6e99",
          surface: "#ffffff",
          background: "#f6f8fa",
          content: "#17212b",
          border: "#cbd5df",
          success: "#16803c",
          warning: "#b54708",
          critical: "#c4322b",
          info: "#2563b8",
        },
        medicare: {
          50: "#eff9ff",
          100: "#d8f3ff",
          200: "#b1e7ff",
          300: "#7fd3ff",
          400: "#48b7f5",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#074564",
          900: "#0c4a6e",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
