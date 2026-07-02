import Widget from "./Widget";

const services = [
  { name: "API Server", status: "operational", latency: "12ms", icon: "⚡" },
  { name: "Database", status: "operational", latency: "4ms", icon: "🗄️" },
  { name: "Authentication", status: "operational", latency: "—", icon: "🔐" },
  { name: "Storage", status: "operational", latency: "—", icon: "💾" },
];

export default function SystemHealthPanel() {
  return (
    <Widget title="System Health" icon="🖥️">
      <div className="space-y-3">
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2.5">
              <span className="text-base">{s.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-700">{s.name}</p>
                <p className="text-[10px] text-slate-400">{s.latency !== "\u2014" ? `${s.latency} response` : "Status: OK"}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </Widget>
  );
}
