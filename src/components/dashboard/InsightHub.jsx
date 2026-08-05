// src/components/billing/InsightHub.jsx
// MediCare Pro — Billing Module — InsightHub
// Rule-based "AI-style" billing insights: revenue analysis, pending payment
// analysis, anomaly detection. No external AI APIs — deterministic heuristics.

import { useMemo } from "react";

function currency(n) {
  return `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// ─── Insight generation engine ────────────────────────────────────────────────
function generateInsights(invoices) {
  const insights = [];
  if (!invoices.length) return insights;

  const paid     = invoices.filter((i) => i.status === "Paid");
  const pending  = invoices.filter((i) => i.status === "Pending");
  const overdue  = invoices.filter((i) => i.status === "Overdue");
  const refunded = invoices.filter((i) => i.status === "Refunded");

  const totalRevenue   = paid.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const pendingAmount  = [...pending, ...overdue].reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const amounts        = invoices.map((i) => parseFloat(i.amount) || 0).filter((a) => a > 0);
  const avg            = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  const stdDev          = amounts.length
    ? Math.sqrt(amounts.reduce((s, a) => s + (a - avg) ** 2, 0) / amounts.length)
    : 0;

  // ── Revenue analysis ──
  insights.push({
    type: "revenue",
    severity: "info",
    title: "Revenue Summary",
    message: `Total collected revenue is ${currency(totalRevenue)} across ${paid.length} paid invoices.`,
  });

  // ── Pending payment analysis ──
  if (pendingAmount > 0) {
    const pendingRatio = pendingAmount / (totalRevenue + pendingAmount || 1);
    insights.push({
      type: "pending",
      severity: pendingRatio > 0.3 ? "warning" : "info",
      title: "Pending Payments",
      message: `${currency(pendingAmount)} is outstanding across ${pending.length + overdue.length} invoices` +
        (overdue.length ? `, including ${overdue.length} overdue.` : "."),
    });
  }

  if (overdue.length > 0) {
    const overdueAmount = overdue.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    insights.push({
      type: "overdue",
      severity: "critical",
      title: "Overdue Invoices Need Attention",
      message: `${overdue.length} invoice${overdue.length > 1 ? "s are" : " is"} overdue, totaling ${currency(overdueAmount)}. Consider sending reminders.`,
    });
  }

  // ── Anomaly detection: amounts beyond 2 standard deviations ──
  if (amounts.length >= 5 && stdDev > 0) {
    const anomalies = invoices.filter((i) => {
      const a = parseFloat(i.amount) || 0;
      return a > 0 && Math.abs(a - avg) > 2 * stdDev;
    });
    if (anomalies.length > 0) {
      insights.push({
        type: "anomaly",
        severity: "warning",
        title: "Unusual Invoice Amounts Detected",
        message: `${anomalies.length} invoice${anomalies.length > 1 ? "s deviate" : " deviates"} significantly from the average (${currency(avg)}). Review for billing errors.`,
        records: anomalies.slice(0, 5).map((i) => i.id),
      });
    }
  }

  // ── Anomaly: duplicate invoices for same patient/amount on same day ──
  const byKey = {};
  invoices.forEach((i) => {
    const key = `${i.patientId}|${i.amount}|${(i.date || "").slice(0, 10)}`;
    byKey[key] = (byKey[key] || 0) + 1;
  });
  const duplicateKeys = Object.entries(byKey).filter(([, count]) => count > 1);
  if (duplicateKeys.length > 0) {
    insights.push({
      type: "anomaly",
      severity: "critical",
      title: "Possible Duplicate Invoices",
      message: `${duplicateKeys.length} potential duplicate invoice group${duplicateKeys.length > 1 ? "s" : ""} found with matching patient, amount, and date.`,
    });
  }

  // ── Refund rate ──
  if (refunded.length > 0) {
    const refundRate = (refunded.length / invoices.length) * 100;
    insights.push({
      type: "refund",
      severity: refundRate > 10 ? "warning" : "info",
      title: "Refund Rate",
      message: `${refundRate.toFixed(1)}% of invoices were refunded (${refunded.length} of ${invoices.length}).`,
    });
  }

  // ── Collection trend ──
  const collectionRate = (totalRevenue / (totalRevenue + pendingAmount || 1)) * 100;
  insights.push({
    type: "collection",
    severity: collectionRate >= 80 ? "positive" : collectionRate >= 50 ? "info" : "warning",
    title: "Collection Performance",
    message: `Current collection rate is ${collectionRate.toFixed(1)}%` +
      (collectionRate >= 80 ? " — healthy cash flow." : collectionRate < 50 ? " — below target, consider follow-ups." : "."),
  });

  return insights;
}

const SEVERITY_STYLE = {
  positive: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", icon: "✓" },
  info:     { bg: "bg-cyan-50 dark:bg-cyan-950/30",       text: "text-cyan-700 dark:text-cyan-300",       icon: "ℹ" },
  warning:  { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-300",     icon: "⚠" },
  critical: { bg: "bg-red-50 dark:bg-red-950/30",         text: "text-red-700 dark:text-red-300",         icon: "✕" },
};

/**
 * @param {Object[]} invoices - billing records: { id, patientId, amount, status, date }
 */
export default function InsightHub({ darkMode, invoices = [] }) {
  const insights = useMemo(() => generateInsights(invoices), [invoices]);

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const sub  = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`rounded-2xl border p-5 ${card}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white text-sm">✦</span>
        <div>
          <h3 className="font-semibold text-sm">Insight Hub</h3>
          <p className={`text-xs ${sub}`}>Automated billing analysis</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className={`text-center py-10 text-sm ${sub}`}>
          <p className="text-2xl mb-1">📊</p>
          Not enough billing data yet for insights.
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((ins, idx) => {
            const style = SEVERITY_STYLE[ins.severity] || SEVERITY_STYLE.info;
            return (
              <div key={idx} className={`rounded-xl px-4 py-3 ${style.bg}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`shrink-0 text-sm font-bold ${style.text}`}>{style.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${style.text}`}>{ins.title}</p>
                    <p className={`text-xs mt-0.5 leading-snug ${style.text} opacity-90`}>{ins.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { generateInsights };