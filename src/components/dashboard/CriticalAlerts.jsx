import Widget from "./Widget";

export default function CriticalAlerts({ patients = [], appointments = [] }) {
  const emergencyPatients = patients.filter((p) => p.priority === "Emergency");
  const expiredTokens = appointments.filter((a) => {
    if (!a.date || a.status === "Completed" || a.status === "Confirmed") return false;
    try { return new Date(`${a.date}T${a.time || "00:00"}`) < new Date(); } catch { return false; }
  });
  const highPriority = patients.filter((p) => p.priority === "High");

  const alerts = [
    ...emergencyPatients.map((p) => ({
      id: `emergency-${p.id}`, type: "emergency", title: "Emergency Patient",
      message: `${p.name} — ${p.disease || "Immediate attention required"}`,
    })),
    ...expiredTokens.slice(0, 3).map((a) => ({
      id: `expired-${a.id}`, type: "warning", title: "Missed Appointment",
      message: `${a.patient} with ${a.doctor} on ${a.date}`,
    })),
    { id: "bed-status", type: "info", title: "Bed Capacity", message: "General: 42/120 | ICU: 8/20" },
    ...(highPriority.length > 3 ? [{
      id: "high-census", type: "warning", title: "High Priority Census",
      message: `${highPriority.length} patients flagged as High priority`,
    }] : []),
  ];

  if (alerts.length === 0) {
    alerts.push({ id: "all-clear", type: "success", title: "All Clear", message: "No critical alerts at this time." });
  }

  const typeStyles = {
    emergency: "bg-rose-50 border-rose-200 text-rose-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-sky-50 border-sky-200 text-sky-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  const iconMap = { emergency: "🚨", warning: "⚠️", info: "ℹ️", success: "✅" };

  return (
    <Widget title="Critical Alerts" icon="🔔" actions={
      <span className="text-[10px] font-semibold text-slate-400">{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</span>
    }>
      <div className="space-y-2.5">
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border ${typeStyles[alert.type] || typeStyles.info}`}>
            <span className="text-base shrink-0 mt-0.5">{iconMap[alert.type] || "ℹ️"}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">{alert.title}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}
