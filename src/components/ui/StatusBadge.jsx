const variants = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20",
  Admitted: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20",
  Discharged: "bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/20",
  Pending: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20",
  Confirmed: "bg-cyan-50 text-cyan-700 border-cyan-200 ring-cyan-500/20",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20",
  Cancelled: "bg-red-50 text-red-700 border-red-200 ring-red-500/20",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20",
  Unpaid: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20",
  Overdue: "bg-red-50 text-red-700 border-red-200 ring-red-500/20",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20",
  Available: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20",
  Unavailable: "bg-red-50 text-red-700 border-red-200 ring-red-500/20",
  "Low Stock": "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20",
  "Out of Stock": "bg-red-50 text-red-700 border-red-200 ring-red-500/20",
  Expired: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20",
  "Expiring Soon": "bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20",
};

const icons = {
  Active: "●", Admitted: "●", Discharged: "●",
  Paid: "✓", Unpaid: "○", Overdue: "!",
  Pending: "○", Confirmed: "●", Completed: "✓", Cancelled: "✕",
  Available: "●", Unavailable: "●",
};

export default function StatusBadge({ status, size = "sm" }) {
  const cls = variants[status] || "bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/20";
  const icon = icons[status] || "●";
  const sizeCls = size === "lg" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ring-1 ring-inset ${cls} ${sizeCls}`}>
      <span className="opacity-70">{icon}</span>
      {status}
    </span>
  );
}
