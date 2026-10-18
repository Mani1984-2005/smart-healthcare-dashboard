/**
 * AuditManager.js
 * MediCare Pro – Enterprise Billing Module
 * Logs every billing action with full context for compliance and forensics.
 * Writes to both local in-memory store (for UI) and backend API.
 */

import { AUDIT_CONFIG, API_ENDPOINTS } from "./CoreConfig.js";

// ─── Audit Event Types ────────────────────────────────────────────────────────

export const AUDIT_EVENTS = Object.freeze({
  // Invoice lifecycle
  INVOICE_CREATED:        "INVOICE_CREATED",
  INVOICE_UPDATED:        "INVOICE_UPDATED",
  INVOICE_CANCELLED:      "INVOICE_CANCELLED",
  INVOICE_STATUS_CHANGED: "INVOICE_STATUS_CHANGED",
  INVOICE_PRINTED:        "INVOICE_PRINTED",
  INVOICE_EMAILED:        "INVOICE_EMAILED",

  // Payment
  PAYMENT_POSTED:         "PAYMENT_POSTED",
  PAYMENT_REVERSED:       "PAYMENT_REVERSED",
  PAYMENT_FAILED:         "PAYMENT_FAILED",

  // Refund
  REFUND_REQUESTED:       "REFUND_REQUESTED",
  REFUND_APPROVED:        "REFUND_APPROVED",
  REFUND_REJECTED:        "REFUND_REJECTED",
  REFUND_PROCESSED:       "REFUND_PROCESSED",

  // Discount
  DISCOUNT_APPLIED:       "DISCOUNT_APPLIED",
  DISCOUNT_APPROVED:      "DISCOUNT_APPROVED",
  DISCOUNT_REJECTED:      "DISCOUNT_REJECTED",

  // Insurance
  CLAIM_SUBMITTED:        "CLAIM_SUBMITTED",
  CLAIM_APPROVED:         "CLAIM_APPROVED",
  CLAIM_REJECTED:         "CLAIM_REJECTED",
  CLAIM_SETTLED:          "CLAIM_SETTLED",

  // Sentinel
  SENTINEL_ALERT:         "SENTINEL_ALERT",
  SENTINEL_CLEARED:       "SENTINEL_CLEARED",
});

export const AUDIT_SEVERITY = Object.freeze({
  INFO:     "INFO",
  WARNING:  "WARNING",
  CRITICAL: "CRITICAL",
});

// ─── In-Memory Queue (flushed periodically to backend) ───────────────────────

const _pendingLogs  = [];
const _logHistory   = [];   // Session-level in-memory log (bounded)
const MAX_HISTORY   = 500;
let   _flushTimeout = null;

// ─── Core Log Builder ─────────────────────────────────────────────────────────

/**
 * Build a structured audit log entry.
 * @param {string}  eventType    AUDIT_EVENTS value
 * @param {Object}  context      Payload-level data
 * @param {string}  actorId      Staff/user ID performing the action
 * @param {string}  actorRole    User's role
 * @param {string}  [severity]   AUDIT_SEVERITY value
 * @returns {AuditEntry}
 */
function buildEntry(eventType, context, actorId, actorRole, severity = AUDIT_SEVERITY.INFO) {
  return {
    id:         crypto.randomUUID(),
    eventType,
    severity,
    actorId,
    actorRole,
    timestamp:  new Date().toISOString(),
    sessionId:  sessionStorage.getItem("sessionId") ?? "unknown",
    context:    sanitizeContext(context),
    meta: {
      userAgent:  navigator?.userAgent ?? "server",
      platform:   "MediCare Pro EMR",
      module:     "BillingModule",
      version:    "1.0.0",
    },
  };
}

/**
 * Remove PII-adjacent data from audit context while keeping billing-relevant fields.
 * Redacts only raw payment card numbers if present.
 * @param {Object} context
 * @returns {Object}
 */
function sanitizeContext(context) {
  if (!context || typeof context !== "object") return context;

  const clone = structuredClone(context);

  // Redact card numbers (basic PAN masking)
  if (clone.cardNumber) {
    clone.cardNumber = `****-****-****-${String(clone.cardNumber).slice(-4)}`;
  }

  // Redact full bank account numbers
  if (clone.accountNumber) {
    clone.accountNumber = `****${String(clone.accountNumber).slice(-4)}`;
  }

  return clone;
}

// ─── Flush Strategy ───────────────────────────────────────────────────────────

/**
 * Flush pending audit logs to the backend.
 * Uses sendBeacon for reliability on page unload; fetch otherwise.
 * @param {boolean} [beacon]  Use sendBeacon (page unload scenario)
 */
async function flush(beacon = false) {
  if (_pendingLogs.length === 0) return;

  const batch = _pendingLogs.splice(0, _pendingLogs.length);
  const url   = `${API_ENDPOINTS.BASE}${API_ENDPOINTS.AUDIT}/batch`;
  const body  = JSON.stringify({ entries: batch });

  if (beacon && navigator?.sendBeacon) {
    navigator.sendBeacon(url, body);
    return;
  }

  try {
    await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (err) {
    // Re-queue on transient failure (network blip)
    _pendingLogs.unshift(...batch);
    console.warn("[AuditManager] Flush failed; logs re-queued.", err.message);
  }
}

/**
 * Schedule a deferred flush (debounced, 3s window).
 */
function scheduleFlush() {
  if (_flushTimeout) clearTimeout(_flushTimeout);
  _flushTimeout = setTimeout(() => flush(false), 3000);
}

// Register beacon flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("beforeunload", () => flush(true));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Log a billing audit event.
 * @param {string} eventType   AUDIT_EVENTS value
 * @param {Object} context     Event payload
 * @param {Object} actor       { id: string, role: string }
 * @param {string} [severity]  AUDIT_SEVERITY value
 * @returns {AuditEntry}       The created log entry
 */
export function logEvent(eventType, context, actor, severity = AUDIT_SEVERITY.INFO) {
  const entry = buildEntry(
    eventType,
    context,
    actor?.id ?? "system",
    actor?.role ?? "SYSTEM",
    severity
  );

  // Add to in-memory history (bounded ring buffer)
  _logHistory.push(entry);
  if (_logHistory.length > MAX_HISTORY) _logHistory.shift();

  // Queue for backend flush
  _pendingLogs.push(entry);
  scheduleFlush();

  // Surface critical events to console for operational visibility
  if (severity === AUDIT_SEVERITY.CRITICAL) {
    console.error(`[AuditManager CRITICAL] ${eventType}`, entry);
  } else if (severity === AUDIT_SEVERITY.WARNING) {
    console.warn(`[AuditManager WARNING] ${eventType}`, entry);
  }

  return entry;
}

// ─── Convenience Wrappers ─────────────────────────────────────────────────────

export function logInvoiceCreated(invoice, actor) {
  return logEvent(AUDIT_EVENTS.INVOICE_CREATED, {
    invoiceId:   invoice.id,
    invoiceNo:   invoice.invoiceNumber,
    patientId:   invoice.patientId,
    grandTotal:  invoice.grandTotal,
    itemCount:   invoice.items?.length,
  }, actor);
}

export function logInvoiceUpdated(invoiceId, changeset, actor) {
  return logEvent(AUDIT_EVENTS.INVOICE_UPDATED, {
    invoiceId,
    changedFields: Object.keys(changeset),
    changeset,
  }, actor, AUDIT_SEVERITY.WARNING);
}

export function logStatusChange(invoiceId, fromStatus, toStatus, actor) {
  return logEvent(AUDIT_EVENTS.INVOICE_STATUS_CHANGED, {
    invoiceId,
    fromStatus,
    toStatus,
  }, actor);
}

export function logPaymentPosted(payment, actor) {
  return logEvent(AUDIT_EVENTS.PAYMENT_POSTED, {
    invoiceId:  payment.invoiceId,
    paymentId:  payment.id,
    amount:     payment.amount,
    method:     payment.method,
    referenceNumber: payment.referenceNumber,
  }, actor);
}

export function logRefundRequested(refund, actor) {
  return logEvent(AUDIT_EVENTS.REFUND_REQUESTED, {
    invoiceId: refund.invoiceId,
    amount:    refund.amount,
    reason:    refund.reason,
  }, actor, AUDIT_SEVERITY.WARNING);
}

export function logDiscountApplied(invoiceId, discountPercent, discountAmount, actor) {
  const severity = discountPercent >= 25 ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO;
  return logEvent(AUDIT_EVENTS.DISCOUNT_APPLIED, {
    invoiceId,
    discountPercent,
    discountAmount,
  }, actor, severity);
}

export function logSentinelAlert(alertType, details, actor) {
  return logEvent(AUDIT_EVENTS.SENTINEL_ALERT, {
    alertType,
    ...details,
  }, actor, AUDIT_SEVERITY.CRITICAL);
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Retrieve in-session audit history (bounded to last 500 entries).
 * @param {Object} [filters]
 * @param {string} [filters.eventType]
 * @param {string} [filters.invoiceId]
 * @param {string} [filters.actorId]
 * @param {string} [filters.severity]
 * @returns {AuditEntry[]}
 */
export function getSessionAuditHistory(filters = {}) {
  let results = [..._logHistory];

  if (filters.eventType) {
    results = results.filter((e) => e.eventType === filters.eventType);
  }
  if (filters.invoiceId) {
    results = results.filter((e) => e.context?.invoiceId === filters.invoiceId);
  }
  if (filters.actorId) {
    results = results.filter((e) => e.actorId === filters.actorId);
  }
  if (filters.severity) {
    results = results.filter((e) => e.severity === filters.severity);
  }

  return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Fetch historical audit logs from backend.
 * @param {Object} params   { invoiceId?, fromDate?, toDate?, page?, pageSize? }
 * @returns {Promise<{ entries: AuditEntry[], total: number }>}
 */
export async function fetchAuditLogs(params = {}) {
  const query = new URLSearchParams({
    page:     params.page     ?? 1,
    pageSize: params.pageSize ?? 50,
    ...(params.invoiceId && { invoiceId: params.invoiceId }),
    ...(params.fromDate  && { fromDate:  params.fromDate }),
    ...(params.toDate    && { toDate:    params.toDate }),
  });

  const res = await fetch(
    `${API_ENDPOINTS.BASE}${API_ENDPOINTS.AUDIT}?${query}`,
    { headers: { "Content-Type": "application/json" } }
  );

  if (!res.ok) {
    throw new Error(`AuditManager: Failed to fetch logs (${res.status})`);
  }

  return res.json();
}

// ─── Export default for convenient import ────────────────────────────────────

export default {
  logEvent,
  logInvoiceCreated,
  logInvoiceUpdated,
  logStatusChange,
  logPaymentPosted,
  logRefundRequested,
  logDiscountApplied,
  logSentinelAlert,
  getSessionAuditHistory,
  fetchAuditLogs,
  AUDIT_EVENTS,
  AUDIT_SEVERITY,
};