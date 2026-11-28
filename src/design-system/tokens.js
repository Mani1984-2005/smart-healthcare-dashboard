// DESIGN SYSTEM TOKENS — PREMIUM CINEMATIC HEALTHCARE OS
// =======================================================
// A unified design system for MediCare Pro with cinematic,
// glassmorphism and premium technology visual identity.
//
// Colors: Dark mode as primary with premium accent palette
// Typography: Sophisticated hierarchy with interrelated scales
// Spacing: Rhythmic 4px base with spatial harmony
// Shadows & Light: Cinematic depth with layered shadows
// Transitions: Purposeful, performance-conscious timing

// ============================================================
// COLOR PALETTE — Dark primary with light mode support
// ============================================================
export const colors = {
  // Primary dark theme — used by default
  dark: {
    background: "#0a0e17",
    surface: "#111827",
    surfaceSubtle: "#1a2235",
    surfaceElevated: "#1e253b",
    card: "#161c2e",
    cardHover: "#1c243a",
    textPrimary: "#e8f0f8",
    textSecondary: "#a8b8d0",
    textMuted: "#6a809b",
    textInverse: "#0a0e17",
    border: "#2a3a52",
    borderLight: "#3a4a6a",
    success: "#00d4aa",
    successLight: "#00d4aa25",
    warning: "#ff6b35",
    warningLight: "#ff6b3525",
    error: "#ff4757",
    errorLight: "#ff475725",
    info: "#38bdf8",
    infoLight: "#38bdf825",
  },
  // Light theme — for accessibility / preference
  light: {
    background: "#f8fafc",
    surface: "#ffffff",
    surfaceSubtle: "#f1f5f9",
    surfaceElevated: "#f8fafc",
    card: "#ffffff",
    cardHover: "#f0f4f8",
    textPrimary: "#0f172a",
    textSecondary: "#1e293b",
    textMuted: "#64748b",
    textInverse: "#f8fafc",
    border: "#e2e8f0",
    borderLight: "#cbd5e1",
    success: "#059669",
    successLight: "#05966920",
    warning: "#d97706",
    warningLight: "#d9770620",
    error: "#dc2626",
    errorLight: "#dc262620",
    info: "#0891b2",
    infoLight: "#0891b220",
  },
  // Accent / premium highlights
  accent: {
    primary: "#00d4aa",     // Emerald - healthcare tech focus
    primaryHover: "#00f5c4",
    primarySubtle: "#00d4aa15",
    secondary: "#38bdf8",   // Sky blue
    secondaryHover: "#67e8f9",
    secondarySubtle: "#38bdf815",
    amber: "#f6ad55",
    amberHover: "#fbbf24",
    purple: "#a78bfa",
    purpleHover: "#c2a8f1",
    pink: "#f472b6",
    pinkHover: "#ec4899",
  },
  // Gradient definitions (CSS-friendly)
  gradients: {
    heroDark: "linear-gradient(135deg, #0a0e17 0%, #111827 50%, #0a0e17 100%)",
    heroLight: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)",
    navbarDark: "linear-gradient(180deg, #0f172a 0%, #1a2235 100%)",
    cardGradient: "linear-gradient(135deg, #161c2e 0%, #0d1117 100%)",
    successGradient: "linear-gradient(135deg, #00d4aa 0%, #059669 100%)",
    warningGradient: "linear-gradient(135deg, #ff6b35 0%, #d97706 100%)",
    errorGradient: "linear-gradient(135deg, #ff4757 0%, #dc2626 100%)",
    infoGradient: "linear-gradient(135deg, #38bdf8 0%, #0891b2 100%)",
    // Premium gradient accents
    accentRadial: "radial-gradient(ellight at 30% 20%, rgba(0, 212, 170, 0.15) 0%, transparent 50%), radial-gradient(ellight at 70% 80%, rgba(56, 189, 248, 0.1) 0%, transparent 50%)",
    cardGlow: "0 0 30px rgba(0, 212, 170, 0.15), 0 0 60px rgba(56, 189, 248, 0.1)",
  },
};

// ============================================================
// RADIUS & SHADOWS — Cinematic depth with glassmorphism
// ============================================================
export const radius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  xxl: "24px",
  full: "9999px",
};

export const shadows = {
  // Soft shadow for general use
  soft: "0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)",
  // Card shadow — elevated glassmorphism
  card: "0 4px 20px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)",
  // Lift shadow for interactive elements
  lift: "0 10px 40px rgba(0, 0, 0, 0.5), 0 5px 15px rgba(0, 0, 0, 0.3)",
  // Modal shadow
  modal: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)",
  // Premium glass shadow
  glass: "0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 5px rgba(0, 0, 0, 0.1)",
  // Glow shadow for accents
  glow: "0 0 20px rgba(0, 212, 170, 0.3), 0 0 40px rgba(56, 189, 248, 0.15)",
  // Focus ring
  focus: "0 0 0 3px rgba(0, 212, 170, 0.4)",
};

// ============================================================
// SPACING & LAYOUT — Rhythmic 4px base scale
// ============================================================
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
};

// ============================================================
// TYPOGRAPHY — Cinematic hierarchy with optical sizing
// ============================================================
export const fontFamilies = {
  // Primary: Sophisticated sans-serif with optical sizes
  display: "'Inter Var', 'DM Display', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
  body: "'Inter Var', 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
  mono: "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace",
};

// Font weight scale
export const fontWeights = {
  thin: 100,
  extraLight: 200,
  light: 300,
  regular: 400,
    medium: 500,
  semibold: 600,
  bold: 700,
  extraBold: 800,
  black: 900,
};

// Font size scale — optical sizes for different contexts
export const fontSizes = {
  // Display / hero sizes
  displayLarge: { size: "64px", lineHeight: "72px", weight: fontWeights.black },
  displayMedium: { size: "48px", lineHeight: "56px", weight: fontWeights.black },
  displaySmall: { size: "40px", lineHeight: "48px", weight: fontWeights.black },

  // Headline hierarchy
  h1: { size: "32px", lineHeight: "40px", weight: fontWeights.black },
  h2: { size: "24px", lineHeight: "32px", weight: fontWeights.bold },
  h3: { size: "20px", lineHeight: "28px", weight: fontWeights.semibold },
  h4: { size: "16px", lineHeight: "22px", weight: fontWeights.semibold },
  h5: { size: "14px", lineHeight: "20px", weight: fontWeights.medium },
  h6: { size: "12px", lineHeight: "16px", weight: fontWeights.medium },

  // Body sizes
  bodyLarge: { size: "16px", lineHeight: "24px", weight: fontWeights.regular },
  body: { size: "15px", lineHeight: "22px", weight: fontWeights.regular },
  bodySmall: { size: "14px", lineHeight: "20px", weight: fontWeights.regular },
  tiny: { size: "12px", lineHeight: "16px", weight: fontWeights.regular },

  // Label / small text
  label: { size: "13px", lineHeight: "18px", weight: fontWeights.medium },
  small: { size: "11px", lineHeight: "14px", weight: fontWeights.medium },
  micro: { size: "10px", lineHeight: "13px", weight: fontWeights.bold },
};

// Line height utilities
export const lineHeights = {
  tight: "1.25",
  normal: "1.5",
  relaxed: "1.625",
  display: "1.5",
};

// Font smoothing
export const fontSmoothing = {
  antialiased: "-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;",
  antialiasedSub: "font-smoothing: antialiased;",
};

// ============================================================
// TRANSITIONS & DURATIONS — Purposeful, reduced-motion aware
// ============================================================
export const transitions = {
  // Base transition string
  base: "transition-property: all; transition-duration: var(--transition-duration, 0.2s); transition-timing-function: var(--transition-easing, var(--e-out));",

  // Easing curves — custom for cinematic feel
  easing: {
    // Standard
    out: "cubic-bezier(0.0, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 0.2, 1)",
    outIn: "cubic-bezier(0.65, 0, 0.35, 1)",

    // Cinematic easing
    easeOutQuart: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeInQuart: "cubic-bezier(0.76, 0, 0.24, 1)",
    easeInOutQuart: "cubic-bezier(0.77, 0, 0.23, 1)",

    // Gentle easing for reduced motion
    gentle: "var(--e-out, cubic-bezier(0.4, 0, 0.2, 1))",
    instant: "0.15s var(--e-out, cubic-bezier(0.4, 0, 0.2, 1))",
  },

  // Duration scale
  duration: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
    slower: "400ms",
    pageTransition: "500ms",
  },

  // Property-specific defaults
  properties: {
    opacity: "opacity 200ms var(--e-out)",
    transform: "transform 200ms var(--e-out)",
    color: "color 200ms var(--e-out)",
    background: "background 200ms var(--e-out)",
    borderColor: "border-color 200ms var(--e-out)",
    shadow: "shadow 200ms var(--e-out)",
  },
};

// ============================================================
// BREAKPOINTS — Mobile-first responsive design
// ============================================================
export const breakpoints = {
  sm: "@media (min-width: 640px)",
  md: "@media (min-width: 768px)",
  lg: "@media (min-width: 1024px)",
  xl: "@media (min-width: 1280px)",
  "2xl": "@media (min-width: 1536px)",
};

// ============================================================
// Z-INDEX — Stacking order for glass layers
// ============================================================
export const zIndex = {
  base: 0,
  header: 10,
  sidebar: 20,
  modal: 100,
  overlay: 50,
  toast: 1000,
  dropdown: 50,
  tooltip: 60,
};

export const tokens = {
  colors,
  radius,
  shadows,
  spacing,
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  transitions,
  breakpoints,
  zIndex,
};

export const domainStatusTone = {
  Available: "success",
  Active: "success",
  Paid: "success",
  Completed: "success",
  Delivered: "success",
  Pending: "warning",
  "In Progress": "warning",
  Scheduled: "warning",
  Overdue: "error",
  Cancelled: "error",
  "Out of Stock": "error",
  Draft: "neutral",
  Unknown: "neutral",
};

// ============================================================
// EXPORT DEFAULT — For convenience imports
// ============================================================
export default {
  colors,
  radius,
  shadows,
  spacing,
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  transitions,
  breakpoints,
  zIndex,
};