/**
 * SentinelAudit.js
 * MediCare Pro – Enterprise Billing Module
 * Detects suspicious billing activities using configurable rules and
 * temporal pattern analysis. Integrates with AuditManager for CRITICAL logging.
 */

import { AUDIT_CONFIG } from "./CoreConfig.js";
import { logSentinelAlert, getSessionAuditHistory, AUDIT_EVENTS } from "./AuditManager.js";

// ─── Alert Types ──────────────────────────────────────────────────────────────

export const SENTINEL_ALERT_TYPES = Object.freeze({
  HIGH_VALUE_INVOICE:        "HIGH_VALUE_INVOICE",
  RAPID_EDITS:               "RAPID_EDITS",
  UNUSUAL_DISCOUNT:          "UNUSUAL_DISCOUNT",
  DUPLICATE_CHARGE:          "DUPLICATE_CHARGE",
  PHANTOM_PAYMENT:           "PHANTOM_PAYMENT",
  AFTER_HOURS_BILLING:       "AFTER_HOURS_BILLING",
  ROUND_FIGURE_ANOMALY:      "ROUND_FIGURE_ANOMALY",
  INSURANCE_UPCODING:        "INSURANCE_UPCODING",
  SPLIT_BILLING:             "SPLIT_BILLING",
  EXCESSIVE_REFUNDS:         "EXCESSIVE_REFUNDS",
});

// ─── Internal State (session-scoped) ──────────────────────────────────────────

/** Map<invoiceId, { editTimestamps: Date[], lastAmount: number }> */
const _invoiceEditMap     = new Map();

/** Map<`${payerId}-${amount}`, Date[]> */
const _paymentFingerprints = new Map();

/** Map<actorId, { refundTimestamps: Date[] }> */
const _refundActivityMap  = new Map();

const _raisedAlerts       = [];

// ─── Alert Builder ────────────────────────────────────────────────────────────

/**
 * @param {string} alertType   SENTINEL_ALERT_TYPES value
 * @param {string} invoiceId
 * @param {Object} evidence    Machine-readable supporting data
 * @param {Object} actor       { id, role }
 * @returns {SentinelAlert}
 */
function raiseAlert(alertType, invoiceId, evidence, actor) {
  const alert = {
    id:         crypto.randomUUID(),
    alertType,
    invoiceId,
    evidence,
    actor,
    raisedAt:   new Date().toISOString(),
    resolved:   false,
    resolvedBy: null,
    resolvedAt: null,
    notes:      null,
  };

  _raisedAlerts.push(alert);

  // Emit to AuditManager for persistent logging
  logSentinelAlert(alertType, { invoiceId, ...evidence }, actor);

  // Post to backend asynchronously (non-blocking)
  _postAlertToBackend(alert).catch((err) =>
    console.error("[SentinelAudit] Backend post failed:", err.message)
  );

  return alert;
}

async function _postAlertToBackend(alert) {
  const { API_ENDPOINTS } = await import("./CoreConfig.js");
  await fetch(`${API_ENDPOINTS.BASE}${API_ENDPOINTS.SENTINEL}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(alert),
  });
}

// ─── Detection Rules ──────────────────────────────────────────────────────────

const { suspiciousThresholds: T } = AUDIT_CONFIG;

/**
 * RULE 1: High-value invoice
 */
function checkHighValue(invoice, actor) {
  if (invoice.grandTotal > T.highValueInvoice) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.HIGH_VALUE_INVOICE,
      invoice.id,
      { grandTotal: invoice.grandTotal, threshold: T.highValueInvoice },
      actor
    );
  }
  return null;
}

/**
 * RULE 2: Rapid edits to the same invoice
 */
function checkRapidEdits(invoiceId, actor) {
  const now   = Date.now();
  const entry = _invoiceEditMap.get(invoiceId) ?? { editTimestamps: [] };

  entry.editTimestamps.push(now);
  _invoiceEditMap.set(invoiceId, entry);

  // Prune edits outside the window
  const window = T.rapidEditWindowMs;
  const recent = entry.editTimestamps.filter((t) => now - t < window);
  entry.editTimestamps = recent;

  if (recent.length >= T.rapidEdits) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.RAPID_EDITS,
      invoiceId,
      {
        editCount:       recent.length,
        windowMs:        window,
        threshold:       T.rapidEdits,
        firstEditAt:     new Date(recent[0]).toISOString(),
      },
      actor
    );
  }
  return null;
}

/**
 * RULE 3: Unusual discount
 */
function checkUnusualDiscount(invoiceId, discountPercent, actor) {
  if (discountPercent > T.unusualDiscount) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.UNUSUAL_DISCOUNT,
      invoiceId,
      { discountPercent, threshold: T.unusualDiscount },
      actor
    );
  }
  return null;
}

/**
 * RULE 4: Duplicate charge detection
 * Fires when same payer + same amount appears within the window.
 */
function checkDuplicateCharge(payment, actor) {
  const key = `${payment.payerId}-${payment.amount}`;
  const now  = Date.now();

  const timestamps = _paymentFingerprints.get(key) ?? [];
  timestamps.push(now);
  _paymentFingerprints.set(key, timestamps);

  const recent = timestamps.filter((t) => now - t < T.samePayerDuplicateMs);
  _paymentFingerprints.set(key, recent);

  if (recent.length > 1) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.DUPLICATE_CHARGE,
      payment.invoiceId,
      {
        payerId:      payment.payerId,
        amount:       payment.amount,
        occurrences:  recent.length,
        windowMs:     T.samePayerDuplicateMs,
      },
      actor
    );
  }
  return null;
}

/**
 * RULE 5: After-hours billing
 * Flags invoices created outside 06:00–22:00 local time.
 */
function checkAfterHours(invoiceId, actor) {
  const hour = new Date().getHours();
  if (hour < 6 || hour >= 22) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.AFTER_HOURS_BILLING,
      invoiceId,
      { localHour: hour, allowedWindow: "06:00–22:00" },
      actor
    );
  }
  return null;
}

/**
 * RULE 6: Suspiciously round figures
 * Flags invoices where grand total is an exact multiple of ₹10,000.
 */
function checkRoundFigureAnomaly(invoiceId, grandTotal, actor) {
  if (grandTotal >= 10000 && grandTotal % 10000 === 0) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.ROUND_FIGURE_ANOMALY,
      invoiceId,
      { grandTotal },
      actor
    );
  }
  return null;
}

/**
 * RULE 7: Insurance upcoding
 * Fires when insured amount is > 90% of grand total for high-value invoices.
 */
function checkInsuranceUpcoding(invoice, actor) {
  if (!invoice.insuranceClaim) return null;
  const ratio = invoice.insuranceClaim.coverageAmount / invoice.grandTotal;
  if (invoice.grandTotal > 50000 && ratio > 0.9) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.INSURANCE_UPCODING,
      invoice.id,
      {
        grandTotal:      invoice.grandTotal,
        coverageAmount:  invoice.insuranceClaim.coverageAmount,
        coverageRatio:   Math.round(ratio * 100) + "%",
      },
      actor
    );
  }
  return null;
}

/**
 * RULE 8: Split billing
 * Detects multiple invoices for same patient within 24 hours that together
 * exceed the high-value threshold — a pattern used to avoid scrutiny.
 */
function checkSplitBilling(newInvoice, recentInvoices, actor) {
  const last24h    = Date.now() - 86400000;
  const samePatient = recentInvoices.filter(
    (inv) =>
      inv.patientId === newInvoice.patientId &&
      new Date(inv.createdAt).getTime() > last24h &&
      inv.id !== newInvoice.id
  );

  const cumulativeTotal =
    samePatient.reduce((sum, inv) => sum + (inv.grandTotal ?? 0), 0) +
    (newInvoice.grandTotal ?? 0);

  if (samePatient.length >= 2 && cumulativeTotal > T.highValueInvoice) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.SPLIT_BILLING,
      newInvoice.id,
      {
        patientId:       newInvoice.patientId,
        invoiceCount:    samePatient.length + 1,
        cumulativeTotal,
        threshold:       T.highValueInvoice,
        relatedInvoices: samePatient.map((i) => i.id),
      },
      actor
    );
  }
  return null;
}

/**
 * RULE 9: Excessive refunds by the same actor within a session.
 * Fires if an actor processes > 3 refunds in a single session.
 */
function checkExcessiveRefunds(actorId, actor) {
  const refundEvents = getSessionAuditHistory({
    eventType: AUDIT_EVENTS.REFUND_PROCESSED,
    actorId,
  });

  if (refundEvents.length >= 3) {
    return raiseAlert(
      SENTINEL_ALERT_TYPES.EXCESSIVE_REFUNDS,
      "N/A",
      {
        actorId,
        refundCount: refundEvents.length,
        sessionOnly: true,
      },
      actor
    );
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run all applicable sentinel checks when an invoice is created or updated.
 * @param {Object}   invoice
 * @param {Object[]} recentInvoices  Recent invoices for split-billing check
 * @param {Object}   actor           { id, role }
 * @returns {SentinelAlert[]}  Any alerts raised
 */
export function inspectInvoice(invoice, recentInvoices = [], actor) {
  const alerts = [];

  [
    checkHighValue(invoice, actor),
    checkRapidEdits(invoice.id, actor),
    checkUnusualDiscount(invoice.id, invoice.discountPercent ?? 0, actor),
    checkAfterHours(invoice.id, actor),
    checkRoundFigureAnomaly(invoice.id, invoice.grandTotal, actor),
    checkInsuranceUpcoding(invoice, actor),
    checkSplitBilling(invoice, recentInvoices, actor),
  ].forEach((a) => a && alerts.push(a));

  return alerts;
}

/**
 * Run all sentinel checks relevant to a payment.
 * @param {Object} payment
 * @param {Object} actor
 * @returns {SentinelAlert[]}
 */
export function inspectPayment(payment, actor) {
  const alerts = [];

  [
    checkDuplicateCharge(payment, actor),
    checkRoundFigureAnomaly(payment.invoiceId, payment.amount, actor),
  ].forEach((a) => a && alerts.push(a));

  return alerts;
}

/**
 * Run sentinel checks on a refund action.
 * @param {Object} refund
 * @param {Object} actor
 * @returns {SentinelAlert[]}
 */
export function inspectRefund(refund, actor) {
  const alerts = [];
  [checkExcessiveRefunds(actor?.id, actor)].forEach((a) => a && alerts.push(a));
  return alerts;
}

/**
 * Get all alerts raised in this session.
 * @param {Object} [filters]  { resolved?: boolean, alertType?: string }
 * @returns {SentinelAlert[]}
 */
export function getSessionAlerts(filters = {}) {
  let results = [..._raisedAlerts];

  if (typeof filters.resolved === "boolean") {
    results = results.filter((a) => a.resolved === filters.resolved);
  }
  if (filters.alertType) {
    results = results.filter((a) => a.alertType === filters.alertType);
  }

  return results.sort((a, b) => new Date(b.raisedAt) - new Date(a.raisedAt));
}

/**
 * Mark an alert as resolved.
 * @param {string} alertId
 * @param {Object} resolver   { id, role }
 * @param {string} notes
 * @returns {SentinelAlert | null}
 */
export function resolveAlert(alertId, resolver, notes = "") {
  const alert = _raisedAlerts.find((a) => a.id === alertId);
  if (!alert) return null;

  alert.resolved   = true;
  alert.resolvedBy = resolver?.id;
  alert.resolvedAt = new Date().toISOString();
  alert.notes      = notes;

  logSentinelAlert("SENTINEL_CLEARED", {
    alertId,
    alertType: alert.alertType,
    resolvedBy: resolver?.id,
    notes,
  }, resolver);

  return alert;
}

export default {
  inspectInvoice,
  inspectPayment,
  inspectRefund,
  getSessionAlerts,
  resolveAlert,
  SENTINEL_ALERT_TYPES,
};