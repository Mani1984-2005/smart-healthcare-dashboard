// src/components/billing/PulseLedger.jsx
// MediCare Pro — Billing Module — PulseLedger
// Live billing activity: recent invoices, payments, refunds.

import { useMemo, useState } from "react";

const TYPE_META = {
  invoice: { icon: "🧾", color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  payment: { icon: "✓",  color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  refund:  { icon: "↩",  color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
};

const STATUS_BADGE = {
  Paid:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Overdue:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Refunded:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function currency(n) {
  return `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/**
 * @param {Object[]} activity - { id, type: 'invoice'|'payment'|'refund', patientName, patientId, amount, status, date, note }
 */
export default function PulseLedger({ darkMode, activity = [], limit = 15, onSelect, loading = false }) {
  const [filter, setFilter] = useState("all");

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const sub  = darkMode ? "text-slate-400" : "text-slate-500";

  const items = useMemo(() => {
    const sorted = [...activity].sort((a, b) => new Date(b.date) - new Date(a.date));
    const filtered = filter === "all" ? sorted : sorted.filter((a) => a.type === filter);
    return filtered.slice(0, limit);
  }, [activity, filter, limit]);

  const chip = (active) =>
    `text-xs px-3 py-1 rounded-full font-medium border transition-colors ${
      active
        ? "bg-cyan-500 border-cyan-500 text-white"
        : darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"
    }`;

  return (
    <div className={`rounded-2xl border p-5 ${card}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Live Ledger</h3>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <div className="flex gap-1.5">
          {["all", "invoice", "payment", "refund"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={chip(filter === f)}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className={`text-center py-10 text-sm ${sub}`}>
          <p className="text-2xl mb-1">📭</p>
          No recent activity.
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {items.map((item) => {
            const meta = TYPE_META[item.type] || TYPE_META.invoice;
            return (
              <button
                key={item.id}
                onClick={() => onSelect?.(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800`}
              >
                <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm ${meta.bg} ${meta.color}`}>
                  {meta.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.patientName || "Unknown patient"}
                    <span className={`ml-1.5 text-xs font-normal ${sub}`}>{item.patientId}</span>
                  </p>
                  <p className={`text-xs truncate ${sub}`}>
                    {item.type === "invoice" ? "Invoice created" : item.type === "payment" ? "Payment received" : "Refund issued"}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${meta.color}`}>{currency(item.amount)}</p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    {item.status && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.status] || ""}`}>
                        {item.status}
                      </span>
                    )}
                    <span className={`text-[10px] ${sub}`}>{timeAgo(item.date)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}