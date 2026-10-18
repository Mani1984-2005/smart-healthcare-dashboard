// src/components/billing/Chronicle.jsx
// MediCare Pro — Billing Module — Chronicle
// Timeline of billing history: invoice updates, status changes.

const EVENT_META = {
  created:    { icon: "✦", color: "bg-cyan-500" },
  paid:       { icon: "✓", color: "bg-emerald-500" },
  pending:    { icon: "⏳", color: "bg-amber-500" },
  overdue:    { icon: "⚠", color: "bg-red-500" },
  refunded:   { icon: "↩", color: "bg-blue-500" },
  cancelled:  { icon: "✕", color: "bg-slate-400" },
  edited:     { icon: "✎", color: "bg-violet-500" },
  reminder:   { icon: "🔔", color: "bg-orange-500" },
};

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * @param {Object[]} events - { id, type, title, details, date, amount, actor }
 * @param {string} [invoiceId] - optional filter context shown in header
 */
export default function Chronicle({ darkMode, events = [], invoiceId, emptyLabel = "No history yet." }) {
  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const sub  = darkMode ? "text-slate-400" : "text-slate-500";
  const line = darkMode ? "border-slate-700" : "border-slate-200";

  const sorted = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className={`rounded-2xl border p-5 ${card}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Billing History</h3>
        {invoiceId && <span className={`text-xs ${sub}`}>Invoice #{invoiceId}</span>}
      </div>

      {sorted.length === 0 ? (
        <div className={`text-center py-10 text-sm ${sub}`}>
          <p className="text-2xl mb-1">🕓</p>
          {emptyLabel}
        </div>
      ) : (
        <ol className="relative ml-3">
          {sorted.map((ev, idx) => {
            const meta = EVENT_META[ev.type] || EVENT_META.created;
            const isLast = idx === sorted.length - 1;
            return (
              <li key={ev.id ?? idx} className="relative pb-6 last:pb-0">
                {!isLast && (
                  <span className={`absolute left-[11px] top-6 bottom-0 w-px border-l ${line}`} />
                )}
                <div className="flex gap-3">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${meta.color} z-10`}>
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{ev.title}</p>
                      {ev.amount !== undefined && (
                        <span className="text-sm font-semibold text-cyan-500">
                          ₹{(parseFloat(ev.amount) || 0).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    {ev.details && <p className={`text-xs mt-0.5 ${sub}`}>{ev.details}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] ${sub}`}>{formatDateTime(ev.date)}</span>
                      {ev.actor && <span className={`text-[11px] ${sub}`}>· {ev.actor}</span>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}