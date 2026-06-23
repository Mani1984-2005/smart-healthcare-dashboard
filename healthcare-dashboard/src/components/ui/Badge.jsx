// FILE PATH: src/components/ui/Badge.jsx
// CREATE this new file.
//
// Tonal status badge — soft background + matching text color, not loud
// solid-fill pills. Used for statuses across Pharmacy, Lab, Billing,
// Patients, Appointments, etc.
//
// USAGE:
//   <Badge tone="success">Available</Badge>
//   <Badge tone="error">Out of Stock</Badge>
//
//   // Or let it auto-map a known domain status to a tone:
//   <Badge status="Pending" />        -> renders with warning tone automatically
//   <Badge status="Completed" />      -> renders with success tone automatically
//
//   // Override the label while keeping auto-tone:
//   <Badge status="Out of Stock" label="0 in stock" />

import { domainStatusTone } from "../../design-system/tokens";

const TONE_CLASSES = {
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  error: "bg-error-50 text-error-700",
  info: "bg-info-50 text-info-700",
  neutral: "bg-neutral-100 text-neutral-600",
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-700",
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-tiny",
  md: "px-2.5 py-1 text-tiny",
};

export default function Badge({
  children,
  status,
  label,
  tone,
  size = "md",
  dot = false,
  className = "",
}) {
  // Resolve tone: explicit `tone` prop wins, otherwise look up from
  // the known domain status map, otherwise fall back to neutral.
  const resolvedTone = tone || domainStatusTone[status] || "neutral";
  const displayText = label || children || status;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full font-medium whitespace-nowrap
        ${TONE_CLASSES[resolvedTone]}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${TONE_CLASSES[resolvedTone].split(" ")[1]} bg-current`}
        />
      )}
      {displayText}
    </span>
  );
}