// src/components/patient/PriorityBadge.jsx
// Renders a professional enterprise priority badge.
// Supports: Normal | Moderate | High | Critical

import { getPriorityConfig } from "../../utils/patientHelpers";

const ICON_MAP = {
  Normal:   "🟢",
  Moderate: "🟡",
  High:     "🟠",
  Critical: "🔴",
};

/**
 * Props:
 *  priority  – string value
 *  size      – "sm" | "md" | "lg"  (default "md")
 *  pulse     – boolean: animate critical badge (default true)
 */
export default function PriorityBadge({ priority = "Normal", size = "md", pulse = true }) {
  const cfg  = getPriorityConfig(priority);
  const icon = ICON_MAP[priority] || "🟢";

  const sizeClass = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  }[size] || "px-2.5 py-1 text-xs gap-1.5";

  const pulseClass = pulse && priority === "Critical" ? "animate-pulse" : "";

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ring-2 ${cfg.ring} ${cfg.bg} ${cfg.text} ${sizeClass} ${pulseClass} shadow-sm`}
    >
      <span>{icon}</span>
      <span>{priority}</span>
    </span>
  );
}