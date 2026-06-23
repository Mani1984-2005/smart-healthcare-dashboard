// FILE PATH: src/components/ui/StatCard.jsx
// CREATE this new file.
//
// Dashboard summary card — replaces the inline "SummaryCard"/"MetricBox"
// components duplicated across PharmacyPage, LaboratoryPage, BillingPage,
// ReportsPage, StockAlertPanel, etc. Same visual job, one shared component.
//
// USAGE:
//   <StatCard icon={<Pill size={20} />} label="Total Medicines" value={42} tone="primary" />
//   <StatCard icon={<AlertTriangle size={20} />} label="Low Stock" value={3} tone="warning" trend="+2 this week" />

const TONE_CLASSES = {
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  error: "bg-error-50 text-error-700",
  info: "bg-info-50 text-info-700",
  neutral: "bg-neutral-100 text-neutral-600",
};

export default function StatCard({
  icon,
  label,
  value,
  tone = "primary",
  trend,
  trendDirection = "neutral", // "up" | "down" | "neutral"
  className = "",
}) {
  const trendColor =
    trendDirection === "up" ? "text-success-700" :
    trendDirection === "down" ? "text-error-700" :
    "text-neutral-400";

  return (
    <div className={`bg-white rounded-lg border border-neutral-200/60 shadow-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        {icon && (
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${TONE_CLASSES[tone]}`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-h1 text-neutral-800 leading-tight">{value}</p>
      <p className="text-small text-neutral-500 mt-0.5">{label}</p>
      {trend && <p className={`text-tiny mt-1.5 ${trendColor}`}>{trend}</p>}
    </div>
  );
}