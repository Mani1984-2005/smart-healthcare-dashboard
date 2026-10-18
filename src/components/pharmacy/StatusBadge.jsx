const STATUS_STYLES = {
  Available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Low Stock": "bg-amber-50 text-amber-700 border border-amber-200",
  "Out of Stock": "bg-red-50 text-red-700 border border-red-200",
  Expired: "bg-rose-100 text-rose-700 border border-rose-300",
  "Expiring Soon": "bg-orange-50 text-orange-700 border border-orange-200",
  Discontinued: "bg-slate-100 text-slate-600 border border-slate-200",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
      {status}
    </span>
  );
}
