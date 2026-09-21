export const colors = {
  primary: { DEFAULT: "#0b6e99", hover: "#075a7c", subtle: "#e8f5fa", foreground: "#ffffff" },
  surface: { canvas: "#f6f8fa", DEFAULT: "#ffffff", muted: "#f1f5f9", raised: "#ffffff", dark: "#0f172a", darkMuted: "#1e293b" },
  content: { primary: "#17212b", secondary: "#5f6b76", muted: "#7b8794", inverse: "#ffffff" },
  border: { subtle: "#e4e9ee", DEFAULT: "#cbd5df", strong: "#94a3b8", focus: "#0b6e99" },
  success: { DEFAULT: "#16803c", subtle: "#eaf7ee" },
  warning: { DEFAULT: "#b54708", subtle: "#fff4e5" },
  critical: { DEFAULT: "#c4322b", subtle: "#fdf0ef" },
  info: { DEFAULT: "#2563b8", subtle: "#eff6ff" },
} as const;

export type HealthcareColorToken = keyof typeof colors;
