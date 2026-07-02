export default function KPICard({ label, value, icon, trend, trendLabel, color = "indigo", sub, format }) {
  const colorMap = {
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    cyan: "from-cyan-500 to-cyan-600",
    rose: "from-rose-500 to-rose-600",
    violet: "from-violet-500 to-violet-600",
    blue: "from-blue-500 to-blue-600",
    slate: "from-slate-500 to-slate-600",
  };
  const badgeColorMap = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    cyan: "bg-cyan-100 text-cyan-700",
    rose: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
  };
  const displayed = format ? format(value) : (value ?? "\u2014");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${trend >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            <svg className={`w-3 h-3 ${trend >= 0 ? "" : "rotate-180"}`} viewBox="0 0 12 12" fill="currentColor"><path d="M6 2l4 6H2z" /></svg>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-1">{displayed}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
      {trendLabel && <p className="text-[10px] text-slate-400 mt-0.5">{trendLabel}</p>}
      <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${colorMap[color] || colorMap.indigo} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    </div>
  );
}
