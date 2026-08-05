// FILE PATH: tailwind.config.js
// REPLACE your existing tailwind.config.js with this file.
//
// This extends Tailwind's default theme with the MediCare Pro design system:
// brand colors, custom shadows, radius scale, and font family.
// It does NOT remove any Tailwind defaults — your existing utility classes
// (text-gray-500, bg-white, etc.) will continue to work exactly as before.

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — Teal-Indigo (calm, clinical, not generic "medical blue")
        primary: {
          50:  "#EFF7F6",
          100: "#D8ECEA",
          200: "#B0D9D5",
          300: "#7FC0B9",
          400: "#4A9F97",
          500: "#2A7D75",
          600: "#1F6660",
          700: "#18504C",
          800: "#123C39",
          900: "#0B2826",
        },
        // Accent — Coral-Amber (warmth, used sparingly for CTAs/highlights)
        accent: {
          50:  "#FFF4ED",
          100: "#FFE4D1",
          200: "#FFCBA8",
          300: "#FFB68A",
          400: "#F89A5C",
          500: "#F2823D",
          600: "#D9651F",
          700: "#B34F18",
        },
        // Neutral — warm-tinted gray (not pure gray, feels designed)
        neutral: {
          50:  "#F7FAFA",
          100: "#EEF3F2",
          200: "#DEE6E5",
          300: "#C2CECC",
          400: "#94A6A3",
          500: "#66807C",
          600: "#4D6360",
          700: "#394A48",
          800: "#25302F",
          900: "#131A19",
        },
        // Semantic colors — tonal usage (pair with -50 bg + -700 text)
        success: {
          50:  "#E8F7F0",
          500: "#1F9D72",
          700: "#157A58",
        },
        warning: {
          50:  "#FDF3E1",
          500: "#D9941F",
          700: "#A8730E",
        },
        error: {
          50:  "#FCEAE7",
          500: "#D9462F",
          700: "#A8341F",
        },
        info: {
          50:  "#E9F4F8",
          500: "#2A7D9C",
          700: "#1F5E76",
        },
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },

      fontSize: {
        // [fontSize, { lineHeight, fontWeight }]
        display: ["32px", { lineHeight: "40px", fontWeight: "700" }],
        h1:      ["24px", { lineHeight: "32px", fontWeight: "700" }],
        h2:      ["18px", { lineHeight: "26px", fontWeight: "600" }],
        h3:      ["15px", { lineHeight: "22px", fontWeight: "600" }],
        body:    ["14px", { lineHeight: "21px", fontWeight: "400" }],
        small:   ["13px", { lineHeight: "18px", fontWeight: "400" }],
        tiny:    ["11px", { lineHeight: "16px", fontWeight: "500" }],
      },

      borderRadius: {
        sm:  "8px",   // inputs, badges
        md:  "12px",  // buttons
        lg:  "16px",  // cards
        xl:  "20px",  // modals
      },

      boxShadow: {
        soft:  "0 1px 2px rgba(19,26,25,0.04), 0 1px 3px rgba(19,26,25,0.06)",
        card:  "0 2px 8px rgba(19,26,25,0.06), 0 1px 2px rgba(19,26,25,0.04)",
        lift:  "0 8px 24px rgba(19,26,25,0.10), 0 2px 6px rgba(19,26,25,0.06)",
        modal: "0 20px 50px rgba(19,26,25,0.18)",
      },

      spacing: {
        // Supplementing Tailwind's default spacing scale (already 4px-based)
        // with a couple of extra steps used in the design system.
        18: "4.5rem", // 72px
        22: "5.5rem", // 88px
      },

      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "pulse-soft": "pulseSoft 1.8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};