import { useState, useEffect } from "react";

export default function StatCard({ label, value, sub, icon, trend, color = "indigo", onClick }) {
  const [animVal, setAnimVal] = useState(0);
  const numVal = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;

  useEffect(() => {
    let frame;
    const duration = 800;
    const start = performance.now();
    const animate = (now) => {
      const pct = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setAnimVal(Math.round(numVal * eased));
      if (pct < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [numVal]);

  const colorMap = {
    indigo: { from: "from-indigo-500", to: "to-indigo-600", bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-500/10" },
    emerald: { from: "from-emerald-500", to: "to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-500/10" },
    amber: { from: "from-amber-500", to: "to-amber-600", bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-500/10" },
    rose: { from: "from-rose-500", to: "to-rose-600", bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-500/10" },
    cyan: { from: "from-cyan-500", to: "to-cyan-600", bg: "bg-cyan-50", text: "text-cyan-600", ring: "ring-cyan-500/10" },
    violet: { from: "from-violet-500", to: "to-violet-600", bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-500/10" },
    slate: { from: "from-slate-500", to: "to-slate-600", bg: "bg-slate-50", text: "text-slate-600", ring: "ring-slate-500/10" },
    blue: { from: "from-blue-500", to: "to-blue-600", bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-500/10" },
  };
  const c = colorMap[color] || colorMap.indigo;

  const formatted = typeof value === "number"
    ? animVal.toLocaleString("en-IN")
    : String(value).replace(/[0-9,.]+/, (m) => {
        const n = Number(m.replace(/,/g, ""));
        return n ? Math.round(n * (animVal / numVal || 1)).toLocaleString("en-IN") : m;
      });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative bg-white rounded-2xl border border-slate-200/70 p-5 text-left w-full
        shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300
        ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-lg ring-1 ${c.ring}`}>
          {icon || "📊"}
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full
            ${trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            <span>{trend > 0 ? "↑" : "↓"}</span>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold text-slate-900 tabular-nums`}>{formatted}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r ${c.from} ${c.to} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </button>
  );
}
