// FILE PATH: src/components/ui/Card.jsx
// CREATE this new file.
//
// Reusable card container used across all pages going forward.
// Pure UI component — no business logic.
//
// USAGE:
//   <Card>...</Card>
//   <Card title="Recent Patients" subtitle="Last 7 days" action={<Button size="sm">View All</Button>}>
//     ...content...
//   </Card>
//   <Card padding="none">...for tables that need edge-to-edge content...</Card>

const PADDING_CLASSES = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function Card({
  children,
  title,
  subtitle,
  action,
  padding = "md",
  hoverable = false,
  className = "",
  ...rest
}) {
  const hasHeader = title || subtitle || action;

  return (
    <div
      className={`
        bg-white rounded-lg border border-neutral-200/60 shadow-card
        ${hoverable ? "transition-shadow duration-150 hover:shadow-lift" : ""}
        ${className}
      `}
      {...rest}
    >
      {hasHeader && (
        <div className={`flex items-start justify-between gap-4 ${padding !== "none" ? "px-5 pt-5" : "px-5 pt-5"} ${!children ? "pb-5" : "pb-4"}`}>
          <div className="min-w-0">
            {title && <h2 className="text-h3 text-neutral-800">{title}</h2>}
            {subtitle && <p className="text-small text-neutral-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && (
        <div className={hasHeader ? `${PADDING_CLASSES[padding]} ${padding !== "none" ? "pt-0" : ""}` : PADDING_CLASSES[padding]}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * CardDivider — subtle horizontal rule for separating sections inside a Card,
 * styled to match the card's hairline border treatment.
 */
export function CardDivider({ className = "" }) {
  return <div className={`h-px bg-neutral-200/60 my-4 ${className}`} />;
}