export default function MetricCard({ label, value, sub, icon, color, alert }) {
  const colorMap = {
    teal:    { grad: "from-teal-500 to-teal-600", ring: "ring-teal-200" },
    emerald: { grad: "from-emerald-500 to-emerald-600", ring: "ring-emerald-200" },
    amber:   { grad: "from-amber-500 to-amber-600", ring: "ring-amber-200" },
    red:     { grad: "from-red-500 to-red-600", ring: "ring-red-200" },
    orange:  { grad: "from-orange-500 to-orange-600", ring: "ring-orange-200" },
    violet:  { grad: "from-violet-500 to-violet-600", ring: "ring-violet-200" },
    slate:   { grad: "from-slate-500 to-slate-600", ring: "ring-slate-200" },
    blue:    { grad: "from-blue-500 to-blue-600", ring: "ring-blue-200" },
  };
  const c = colorMap[color] || colorMap.teal;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow ${c.ring} ring-1`}>
      <div className={`bg-gradient-to-br ${c.grad} w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm mb-3`}>
        {icon || "📊"}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value ?? "—"}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {alert && <div className="mt-1.5 flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/></span><span className="text-xs font-medium text-red-600">{alert}</span></div>}
    </div>
  );
}
