/**
 * BillingConnector.js
 * MediCare Pro – Enterprise Billing Module
 * Manages all communication between the billing UI and backend API.
 * Handles auth headers, error normalization, retries, and cancellation.
 */

import { API_ENDPOINTS, PAGINATION } from "./CoreConfig.js";
import AuditManager from "./AuditManager.js";

// ─── HTTP Client ──────────────────────────────────────────────────────────────

/**
 * Normalized API error class.
 */
export class BillingAPIError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string} code
   * @param {Object} [details]
   */
  constructor(message, status, code, details = null) {
    super(message);
    this.name    = "BillingAPIError";
    this.status  = status;
    this.code    = code;
    this.details = details;
  }
}

/**
 * Retrieve the current auth token.
 * Replace this with your auth provider (e.g. context, localStorage, cookie).
 * @returns {string | null}
 */
function getAuthToken() {
  return sessionStorage.getItem("authToken") ?? localStorage.getItem("authToken");
}

/**
 * Build standard request headers.
 * @returns {HeadersInit}
 */
function buildHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    "X-Module":     "BillingModule",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Parse and normalize API response.
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseResponse(response) {
  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson      = contentType.includes("application/json");

  if (!response.ok) {
    let errorPayload = null;
    if (isJson) {
      try { errorPayload = await response.json(); } catch { /* ignore */ }
    }

    throw new BillingAPIError(
      errorPayload?.message ?? `HTTP ${response.status}`,
      response.status,
      errorPayload?.code ?? "UNKNOWN_ERROR",
      errorPayload?.details ?? null
    );
  }

  if (response.status === 204) return null;
  return isJson ? response.json() : response.text();
}

/**
 * Core HTTP request with abort-signal support and retry logic.
 * @param {string}  method
 * @param {string}  url
 * @param {Object}  [body]
 * @param {AbortSignal} [signal]
 * @param {number}  [retries]   Number of retry attempts (429/5xx only)
 * @returns {Promise<any>}
 */
async function request(method, url, body = null, signal = null, retries = 2) {
  const init = {
    method,
    headers: buildHeaders(),
    ...(signal ? { signal } : {}),
    ...(body   ? { body: JSON.stringify(body) } : {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init);

      // Retry on rate-limit or transient server error
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const backoff = Math.pow(2, attempt) * 500;  // 500ms, 1s
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      return await parseResponse(response);
    } catch (err) {
      if (err.name === "AbortError") throw err;   // Don't retry cancellations
      if (attempt === retries)       throw err;   // Exhausted retries
    }
  }
}

// ─── URL Helpers ──────────────────────────────────────────────────────────────

const BASE = API_ENDPOINTS.BASE;

const url = {
  invoices:      ()           => `${BASE}${API_ENDPOINTS.INVOICES}`,
  invoice:       (id)         => `${BASE}${API_ENDPOINTS.INVOICES}/${id}`,
  invoiceStatus: (id)         => `${BASE}${API_ENDPOINTS.INVOICES}/${id}/status`,
  invoicePayments: (id)       => `${BASE}${API_ENDPOINTS.INVOICES}/${id}/payments`,
  payments:      ()           => `${BASE}${API_ENDPOINTS.PAYMENTS}`,
  payment:       (id)         => `${BASE}${API_ENDPOINTS.PAYMENTS}/${id}`,
  refunds:       ()           => `${BASE}${API_ENDPOINTS.REFUNDS}`,
  refund:        (id)         => `${BASE}${API_ENDPOINTS.REFUNDS}/${id}`,
  claims:        ()           => `${BASE}${API_ENDPOINTS.INSURANCE}`,
  claim:         (id)         => `${BASE}${API_ENDPOINTS.INSURANCE}/${id}`,
  reports:       (type)       => `${BASE}${API_ENDPOINTS.REPORTS}/${type}`,
};

// ─── Invoice API ──────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of invoices with optional filters.
 * @param {Object}      [params]
 * @param {string}      [params.patientId]
 * @param {string}      [params.status]
 * @param {string}      [params.fromDate]   ISO 8601
 * @param {string}      [params.toDate]     ISO 8601
 * @param {number}      [params.page]
 * @param {number}      [params.pageSize]
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ invoices: Object[], total: number, page: number }>}
 */
export async function fetchInvoices(params = {}, signal = null) {
  const query = new URLSearchParams({
    page:     params.page     ?? 1,
    pageSize: params.pageSize ?? PAGINATION.defaultPageSize,
    sortBy:   params.sortBy   ?? PAGINATION.defaultSortField,
    order:    params.order    ?? PAGINATION.defaultSortOrder,
    ...(params.patientId && { patientId: params.patientId }),
    ...(params.status    && { status:    params.status }),
    ...(params.fromDate  && { fromDate:  params.fromDate }),
    ...(params.toDate    && { toDate:    params.toDate }),
    ...(params.search    && { search:    params.search }),
  });

  return request("GET", `${url.invoices()}?${query}`, null, signal);
}

/**
 * Fetch a single invoice by ID.
 * @param {string}      invoiceId
 * @param {AbortSignal} [signal]
 */
export async function fetchInvoiceById(invoiceId, signal = null) {
  return request("GET", url.invoice(invoiceId), null, signal);
}

/**
 * Create a new invoice.
 * @param {Object} invoiceData   Validated invoice payload
 * @param {Object} actor         { id, role }
 * @param {AbortSignal} [signal]
 */
export async function createInvoice(invoiceData, actor, signal = null) {
  const result = await request("POST", url.invoices(), invoiceData, signal);
  AuditManager.logInvoiceCreated(result, actor);
  return result;
}

/**
 * Update an invoice (partial update via PATCH).
 * @param {string} invoiceId
 * @param {Object} changeset    Fields to update
 * @param {Object} actor
 * @param {AbortSignal} [signal]
 */
export async function updateInvoice(invoiceId, changeset, actor, signal = null) {
  const result = await request("PATCH", url.invoice(invoiceId), changeset, signal);
  AuditManager.logInvoiceUpdated(invoiceId, changeset, actor);
  return result;
}

/**
 * Change invoice status.
 * @param {string} invoiceId
 * @param {string} toStatus      INVOICE_STATUS value
 * @param {Object} actor
 * @param {string} [reason]
 * @param {AbortSignal} [signal]
 */
export async function changeInvoiceStatus(invoiceId, fromStatus, toStatus, actor, reason = "", signal = null) {
  const result = await request(
    "PATCH",
    url.invoiceStatus(invoiceId),
    { status: toStatus, reason },
    signal
  );
  AuditManager.logStatusChange(invoiceId, fromStatus, toStatus, actor);
  return result;
}

/**
 * Soft-delete (cancel) an invoice.
 * @param {string} invoiceId
 * @param {string} reason
 * @param {Object} actor
 */
export async function cancelInvoice(invoiceId, reason, actor) {
  return changeInvoiceStatus(invoiceId, "PENDING", "CANCELLED", actor, reason);
}

// ─── Payment API ──────────────────────────────────────────────────────────────

/**
 * Post a payment against an invoice.
 * @param {Object} paymentData   Validated payment payload
 * @param {Object} actor
 * @param {AbortSignal} [signal]
 */
export async function postPayment(paymentData, actor, signal = null) {
  const result = await request("POST", url.payments(), paymentData, signal);
  AuditManager.logPaymentPosted(result, actor);
  return result;
}

/**
 * Reverse (void) a posted payment.
 * @param {string} paymentId
 * @param {string} reason
 * @param {Object} actor
 */
export async function reversePayment(paymentId, reason, actor) {
  const result = await request("DELETE", url.payment(paymentId), { reason });
  AuditManager.logEvent(
    AuditManager.AUDIT_EVENTS.PAYMENT_REVERSED,
    { paymentId, reason },
    actor,
    AuditManager.AUDIT_SEVERITY.WARNING
  );
  return result;
}

/**
 * Fetch all payments for a specific invoice.
 * @param {string} invoiceId
 * @param {AbortSignal} [signal]
 */
export async function fetchPaymentsForInvoice(invoiceId, signal = null) {
  return request("GET", url.invoicePayments(invoiceId), null, signal);
}

// ─── Refund API ───────────────────────────────────────────────────────────────

/**
 * Request a refund for a paid invoice.
 * @param {Object} refundData    Validated refund payload
 * @param {Object} actor
 * @param {AbortSignal} [signal]
 */
export async function requestRefund(refundData, actor, signal = null) {
  const result = await request("POST", url.refunds(), refundData, signal);
  AuditManager.logRefundRequested(result, actor);
  return result;
}

/**
 * Approve a pending refund.
 * @param {string} refundId
 * @param {Object} actor
 */
export async function approveRefund(refundId, actor) {
  const result = await request("PATCH", url.refund(refundId), { action: "APPROVE" });
  AuditManager.logEvent(
    AuditManager.AUDIT_EVENTS.REFUND_APPROVED,
    { refundId },
    actor,
    AuditManager.AUDIT_SEVERITY.WARNING
  );
  return result;
}

/**
 * Reject a pending refund.
 * @param {string} refundId
 * @param {string} reason
 * @param {Object} actor
 */
export async function rejectRefund(refundId, reason, actor) {
  const result = await request("PATCH", url.refund(refundId), { action: "REJECT", reason });
  AuditManager.logEvent(
    AuditManager.AUDIT_EVENTS.REFUND_REJECTED,
    { refundId, reason },
    actor,
    AuditManager.AUDIT_SEVERITY.WARNING
  );
  return result;
}

// ─── Insurance Claims API ────────────────────────────────────────────────────

/**
 * Submit an insurance claim.
 * @param {Object} claimData
 * @param {Object} actor
 * @param {AbortSignal} [signal]
 */
export async function submitInsuranceClaim(claimData, actor, signal = null) {
  const result = await request("POST", url.claims(), claimData, signal);
  AuditManager.logEvent(
    AuditManager.AUDIT_EVENTS.CLAIM_SUBMITTED,
    { claimId: result.id, invoiceId: claimData.invoiceId, providerId: claimData.providerId },
    actor
  );
  return result;
}

/**
 * Fetch the status of an insurance claim.
 * @param {string}      claimId
 * @param {AbortSignal} [signal]
 */
export async function fetchClaimStatus(claimId, signal = null) {
  return request("GET", url.claim(claimId), null, signal);
}

// ─── Reports API ──────────────────────────────────────────────────────────────

/**
 * Fetch a billing report.
 * @param {"daily"|"weekly"|"monthly"|"custom"} reportType
 * @param {Object} params   { fromDate, toDate, groupBy? }
 * @param {AbortSignal} [signal]
 */
export async function fetchBillingReport(reportType, params = {}, signal = null) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null)
  );
  return request("GET", `${url.reports(reportType)}?${query}`, null, signal);
}

// ─── AbortController Factory ──────────────────────────────────────────────────

/**
 * Create an AbortController that auto-cancels after a timeout.
 * @param {number} [timeoutMs]  Default 15 seconds
 * @returns {{ controller: AbortController, signal: AbortSignal }}
 */
export function createRequestHandle(timeoutMs = 15000) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener("abort", () => clearTimeout(timer));
  return { controller, signal: controller.signal };
}

export default {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  updateInvoice,
  changeInvoiceStatus,
  cancelInvoice,
  postPayment,
  reversePayment,
  fetchPaymentsForInvoice,
  requestRefund,
  approveRefund,
  rejectRefund,
  submitInsuranceClaim,
  fetchClaimStatus,
  fetchBillingReport,
  createRequestHandle,
};