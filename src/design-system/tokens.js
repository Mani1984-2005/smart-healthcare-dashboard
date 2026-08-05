// FILE PATH: src/design-system/tokens.js
// CREATE this new file.
//
// JS-side mirror of the design tokens defined in tailwind.config.js.
// Use this when you need a color/value in actual JavaScript logic —
// e.g. passing a hex color to a chart library, or computing a badge
// variant dynamically — where a Tailwind className string won't work.
//
// For everything else (99% of UI), just use Tailwind classes directly
// in JSX (e.g. className="bg-primary-500 text-white rounded-lg").
// This file exists to avoid hardcoding hex values in two places.

export const colors = {
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
  success: { 50: "#E8F7F0", 500: "#1F9D72", 700: "#157A58" },
  warning: { 50: "#FDF3E1", 500: "#D9941F", 700: "#A8730E" },
  error:   { 50: "#FCEAE7", 500: "#D9462F", 700: "#A8341F" },
  info:    { 50: "#E9F4F8", 500: "#2A7D9C", 700: "#1F5E76" },
};

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
};

export const shadows = {
  soft:  "0 1px 2px rgba(19,26,25,0.04), 0 1px 3px rgba(19,26,25,0.06)",
  card:  "0 2px 8px rgba(19,26,25,0.06), 0 1px 2px rgba(19,26,25,0.04)",
  lift:  "0 8px 24px rgba(19,26,25,0.10), 0 2px 6px rgba(19,26,25,0.06)",
  modal: "0 20px 50px rgba(19,26,25,0.18)",
};

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
};

export const fontSizes = {
  display: { size: "32px", lineHeight: "40px", weight: 700 },
  h1:      { size: "24px", lineHeight: "32px", weight: 700 },
  h2:      { size: "18px", lineHeight: "26px", weight: 600 },
  h3:      { size: "15px", lineHeight: "22px", weight: 600 },
  body:    { size: "14px", lineHeight: "21px", weight: 400 },
  small:   { size: "13px", lineHeight: "18px", weight: 400 },
  tiny:    { size: "11px", lineHeight: "16px", weight: 500 },
};

/**
 * Status → semantic color mapping.
 * Use this to keep status colors consistent across StatCards, Badges,
 * table rows, and alerts — e.g. statusColor("success") -> the success palette.
 */
export const statusColorMap = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  neutral: colors.neutral,
};

/**
 * Maps common domain statuses (used across Pharmacy, Lab, Billing, etc.)
 * to a semantic tone. Centralizing this avoids every page re-inventing
 * "what color is 'Pending'" logic.
 */
export const domainStatusTone = {
  // Generic
  Active: "success",
  Available: "success",
  Completed: "success",
  Paid: "success",
  Confirmed: "success",

  Pending: "warning",
  "In Progress": "info",
  Partial: "warning",
  "Low Stock": "warning",
  "Expiring Soon": "warning",
  Tentative: "warning",

  "Out of Stock": "error",
  Expired: "error",
  Unpaid: "error",
  Cancelled: "neutral",
  Discontinued: "neutral",
  Inactive: "neutral",

  Urgent: "warning",
  Emergency: "error",
  Routine: "neutral",
};

export default {
  colors,
  radius,
  shadows,
  spacing,
  fontSizes,
  statusColorMap,
  domainStatusTone,
};