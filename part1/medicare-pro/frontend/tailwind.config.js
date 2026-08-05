/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F6F8F9',
          dark: '#0A1420',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#101B2C',
        },
        clinical: {
          50: '#EAF7F3',
          100: '#CBEBE1',
          200: '#9AD9C6',
          300: '#63C2A7',
          400: '#33A886',
          500: '#0E7C66',
          600: '#0B6353',
          700: '#094F43',
          800: '#073C34',
          900: '#052A25',
        },
        trust: {
          50: '#EAF1FA',
          100: '#C9DBF0',
          200: '#9FC0E4',
          300: '#6C9FD5',
          400: '#3F7EC4',
          500: '#1D4E89',
          600: '#173F6E',
          700: '#123153',
          800: '#0D233C',
          900: '#081627',
        },
        ink: {
          DEFAULT: '#10182B',
          light: '#5B6478',
          faint: '#8A93A6',
        },
        border: {
          DEFAULT: '#E2E8ED',
          dark: '#1E2C3F',
        },
        danger: '#B3261E',
        warning: '#B7791F',
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 43, 0.04), 0 4px 16px rgba(16, 24, 43, 0.06)',
        cardHover: '0 2px 4px rgba(16, 24, 43, 0.06), 0 12px 28px rgba(16, 24, 43, 0.10)',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-4%)' },
          '50%': { transform: 'translateY(104%)' },
          '100%': { transform: 'translateY(-4%)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        scan: 'scan 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        pulseRing: 'pulseRing 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
