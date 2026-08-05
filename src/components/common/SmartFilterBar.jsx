// src/components/billing/SmartFilterBar.jsx
// MediCare Pro — Billing Module — SmartFilterBar
// Visual filter bar UI that drives SmartFilter.js criteria.

import { useState, useEffect } from "react";
import { buildDefaultCriteria, SORT_OPTIONS, debounce } from "./SmartFilter";

const STATUS_OPTIONS = ["Paid", "Pending", "Overdue", "Refunded", "Cancelled"];

export default function SmartFilterBar({ darkMode, onChange, patients = [] }) {
  const [criteria, setCriteria] = useState(buildDefaultCriteria());
  const [searchInput, setSearchInput] = useState("");
  const [expanded, setExpanded] = useState(false);

  const input = `border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400 ${
    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
  }`;
  const chip = (active) =>
    `text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
      active
        ? "bg-cyan-500 border-cyan-500 text-white"
        : darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"
    }`;

  // Debounced search propagation
  useEffect(() => {
    const handler = debounce((val) => setCriteria((c) => ({ ...c, search: val })), 250);
    handler(searchInput);
  }, [searchInput]);

  useEffect(() => { onChange?.(criteria); }, [criteria]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStatus = (status) => {
    setCriteria((c) => {
      const has = c.statuses.includes(status);
      return { ...c, statuses: has ? c.statuses.filter((s) => s !== status) : [...c.statuses, status] };
    });
  };

  const reset = () => {
    setCriteria(buildDefaultCriteria());
    setSearchInput("");
  };

  const activeCount =
    (criteria.statuses.length > 0 ? 1 : 0) +
    (criteria.dateRange.from || criteria.dateRange.to ? 1 : 0) +
    (criteria.amountRange.min || criteria.amountRange.max ? 1 : 0) +
    (criteria.patientId ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className={`${input} flex-1 min-w-48`}
          placeholder="Search invoice ID, patient name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className={input}
          value={criteria.sortBy}
          onChange={(e) => setCriteria((c) => ({ ...c, sortBy: e.target.value }))}
        >
          <option value={SORT_OPTIONS.DATE_DESC}>Newest First</option>
          <option value={SORT_OPTIONS.DATE_ASC}>Oldest First</option>
          <option value={SORT_OPTIONS.AMOUNT_DESC}>Amount: High → Low</option>
          <option value={SORT_OPTIONS.AMOUNT_ASC}>Amount: Low → High</option>
          <option value={SORT_OPTIONS.NAME_ASC}>Patient Name A–Z</option>
        </select>
        <button onClick={() => setExpanded((e) => !e)} className={chip(expanded)}>
          Filters {activeCount > 0 && `(${activeCount})`}
        </button>
        {(activeCount > 0 || searchInput) && (
          <button onClick={reset} className="text-xs text-red-400 hover:text-red-500">
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div className={`rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          {/* Status filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => toggleStatus(s)} className={chip(criteria.statuses.includes(s))}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                className={`${input} w-full`}
                value={criteria.dateRange.from}
                onChange={(e) => setCriteria((c) => ({ ...c, dateRange: { ...c.dateRange, from: e.target.value } }))}
              />
              <input
                type="date"
                className={`${input} w-full`}
                value={criteria.dateRange.to}
                onChange={(e) => setCriteria((c) => ({ ...c, dateRange: { ...c.dateRange, to: e.target.value } }))}
              />
            </div>
          </div>

          {/* Amount range */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">Amount (₹)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                className={`${input} w-full`}
                value={criteria.amountRange.min}
                onChange={(e) => setCriteria((c) => ({ ...c, amountRange: { ...c.amountRange, min: e.target.value } }))}
              />
              <input
                type="number"
                placeholder="Max"
                className={`${input} w-full`}
                value={criteria.amountRange.max}
                onChange={(e) => setCriteria((c) => ({ ...c, amountRange: { ...c.amountRange, max: e.target.value } }))}
              />
            </div>
          </div>

          {/* Patient filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">Patient</label>
            <select
              className={`${input} w-full`}
              value={criteria.patientId}
              onChange={(e) => setCriteria((c) => ({ ...c, patientId: e.target.value }))}
            >
              <option value="">All Patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.id}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}