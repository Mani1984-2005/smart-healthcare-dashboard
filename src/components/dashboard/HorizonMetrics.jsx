// src/components/billing/HorizonMetrics.jsx
// MediCare Pro — Billing Module — HorizonMetrics
// Revenue cards, invoice KPIs, growth metrics, collection rate, average invoice value.

import { useMemo } from "react";

function currency(n) {
  return `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function pct(n) {
  const v = parseFloat(n) || 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

/**
 * @param {Object[]} invoices - billing records: { id, amount, status, date }
 * @param {Object[]} [prevInvoices] - prior period invoices, for growth comparison
 */
export default function HorizonMetrics({ darkMode, invoices = [], prevInvoices = [] }) {
  const metrics = useMemo(() => {
    const totalRevenue = invoices
      .filter((i) => i.status === "Paid")
      .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    const pendingAmount = invoices
      .filter((i) => i.status === "Pending" || i.status === "Overdue")
      .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    const overdueCount = invoices.filter((i) => i.status === "Overdue").length;

    const totalInvoiced = invoices.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

    const avgInvoiceValue = invoices.length > 0 ? totalInvoiced / invoices.length : 0;

    const prevRevenue = prevInvoices
      .filter((i) => i.status === "Paid")
      .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const prevCount = prevInvoices.length;
    const invoiceGrowth = prevCount > 0 ? ((invoices.length - prevCount) / prevCount) * 100 : 0;

    return {
      totalRevenue, pendingAmount, overdueCount, collectionRate,
      avgInvoiceValue, revenueGrowth, invoiceGrowth,
      totalInvoices: invoices.length,
    };
  }, [invoices, prevInvoices]);

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const sub  = darkMode ? "text-slate-400" : "text-slate-500";

  const cards = [
    {
      label: "Total Revenue",
      value: currency(metrics.totalRevenue),
      delta: metrics.revenueGrowth,
      accent: "text-emerald-500",
      icon: "💰",
    },
    {
      label: "Pending Payments",
      value: currency(metrics.pendingAmount),
      sub: `${metrics.overdueCount} overdue`,
      accent: "text-amber-500",
      icon: "⏳",
    },
    {
      label: "Collection Rate",
      value: `${metrics.collectionRate.toFixed(1)}%`,
      accent: metrics.collectionRate >= 80 ? "text-emerald-500" : metrics.collectionRate >= 50 ? "text-amber-500" : "text-red-500",
      icon: "📊",
      progress: metrics.collectionRate,
    },
    {
      label: "Avg. Invoice Value",
      value: currency(metrics.avgInvoiceValue),
      sub: `${metrics.totalInvoices} invoices`,
      delta: metrics.invoiceGrowth,
      accent: "text-cyan-500",
      icon: "🧾",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-start justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>{c.label}</span>
            <span className="text-lg">{c.icon}</span>
          </div>
          <p className={`text-2xl font-bold ${c.accent}`}>{c.value}</p>

          {c.progress !== undefined && (
            <div className={`h-1.5 rounded-full mt-3 overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <div
                className={`h-full rounded-full transition-all ${
                  c.progress >= 80 ? "bg-emerald-500" : c.progress >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(c.progress, 100)}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            {c.delta !== undefined && (
              <span className={`text-xs font-medium ${c.delta >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {c.delta >= 0 ? "▲" : "▼"} {pct(Math.abs(c.delta))}
              </span>
            )}
            {c.sub && <span className={`text-xs ${sub}`}>{c.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}