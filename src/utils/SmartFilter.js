// src/components/billing/SmartFilter.js
// MediCare Pro — Billing Module — SmartFilter
// Pure filtering/search utility for invoices, payments, and billing records.
// Framework-agnostic logic, paired with an optional <SmartFilterBar/> UI export.

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} patientId
 * @property {string} patientName
 * @property {number} amount
 * @property {"Paid"|"Pending"|"Overdue"|"Refunded"|"Cancelled"} status
 * @property {string} date          ISO date string
 * @property {string} [dueDate]
 */

// ─── Core filter predicate builders ───────────────────────────────────────────

export function matchesSearch(record, query) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  return (
    record.id?.toLowerCase().includes(q) ||
    record.patientId?.toLowerCase().includes(q) ||
    record.patientName?.toLowerCase().includes(q) ||
    record.invoiceNumber?.toLowerCase().includes(q)
  );
}

export function matchesStatus(record, statuses) {
  if (!statuses || statuses.length === 0 || statuses.includes("All")) return true;
  return statuses.includes(record.status);
}

export function matchesDateRange(record, { from, to } = {}) {
  if (!from && !to) return true;
  const d = new Date(record.date).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime() + 86399999) return false; // inclusive end-of-day
  return true;
}

export function matchesAmountRange(record, { min, max } = {}) {
  const amt = parseFloat(record.amount) || 0;
  if (min !== undefined && min !== "" && amt < parseFloat(min)) return false;
  if (max !== undefined && max !== "" && amt > parseFloat(max)) return false;
  return true;
}

export function matchesPatient(record, patientId) {
  if (!patientId) return true;
  return record.patientId === patientId;
}

// ─── Composite filter ──────────────────────────────────────────────────────────

/**
 * Filters a list of billing records against a SmartFilter criteria object.
 * @param {Invoice[]} records
 * @param {{
 *   search?: string,
 *   statuses?: string[],
 *   dateRange?: { from?: string, to?: string },
 *   amountRange?: { min?: string|number, max?: string|number },
 *   patientId?: string,
 * }} criteria
 */
export function applySmartFilter(records, criteria = {}) {
  const { search = "", statuses = [], dateRange = {}, amountRange = {}, patientId = "" } = criteria;
  return records.filter((r) =>
    matchesSearch(r, search) &&
    matchesStatus(r, statuses) &&
    matchesDateRange(r, dateRange) &&
    matchesAmountRange(r, amountRange) &&
    matchesPatient(r, patientId)
  );
}

// ─── Sorting ────────────────────────────────────────────────────────────────────

export const SORT_OPTIONS = {
  DATE_DESC:   "date_desc",
  DATE_ASC:    "date_asc",
  AMOUNT_DESC: "amount_desc",
  AMOUNT_ASC:  "amount_asc",
  NAME_ASC:    "name_asc",
};

export function applySort(records, sortBy = SORT_OPTIONS.DATE_DESC) {
  const list = [...records];
  switch (sortBy) {
    case SORT_OPTIONS.DATE_ASC:
      return list.sort((a, b) => new Date(a.date) - new Date(b.date));
    case SORT_OPTIONS.AMOUNT_DESC:
      return list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    case SORT_OPTIONS.AMOUNT_ASC:
      return list.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    case SORT_OPTIONS.NAME_ASC:
      return list.sort((a, b) => (a.patientName || "").localeCompare(b.patientName || ""));
    case SORT_OPTIONS.DATE_DESC:
    default:
      return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

// ─── Saved filter presets (optional convenience) ───────────────────────────────

export const FILTER_PRESETS = {
  ALL:      { label: "All Invoices",   statuses: [] },
  PENDING:  { label: "Pending",        statuses: ["Pending"] },
  OVERDUE:  { label: "Overdue",        statuses: ["Overdue"] },
  PAID:     { label: "Paid",           statuses: ["Paid"] },
  REFUNDED: { label: "Refunded",       statuses: ["Refunded"] },
};

export function buildDefaultCriteria() {
  return {
    search: "",
    statuses: [],
    dateRange: { from: "", to: "" },
    amountRange: { min: "", max: "" },
    patientId: "",
    sortBy: SORT_OPTIONS.DATE_DESC,
  };
}

// ─── Helper: debounce for live search inputs ───────────────────────────────────

export function debounce(fn, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}