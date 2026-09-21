import api from "./api.js";

// Every mutating call that creates a PaymentOrder needs an Idempotency-Key so
// a double-click / accidental re-submit of "Pay Now" can never create two
// orders for the same intent — see backend/modules/payments/idempotency.js.
function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function fetchInvoices(params = {}) {
  return api.get("/billing/invoices", { params }).then((res) => res.data.data);
}

export async function fetchInvoiceById(invoiceId) {
  return api.get(`/billing/invoices/${invoiceId}`).then((res) => res.data.data);
}

export async function fetchBillingSummary() {
  return api.get("/billing/summary").then((res) => res.data.data);
}

// Creates (or, if retried with the same key, re-fetches) a PaymentOrder for
// an invoice's outstanding balance.
export async function createPaymentOrder(invoiceId, { idempotencyKey } = {}) {
  return api
    .post(
      "/payments/orders",
      { invoiceId },
      { headers: { "Idempotency-Key": idempotencyKey || newIdempotencyKey() } }
    )
    .then((res) => res.data.data);
}

export async function recordPaymentAttempt(paymentOrderId, method) {
  return api.post("/payments/attempts", { paymentOrderId, method }).then((res) => res.data.data);
}

// Called after the Razorpay checkout callback fires. The backend
// independently re-verifies the signature — this call reporting "success" is
// not itself what marks the invoice paid.
export async function confirmPayment(payload) {
  return api.post("/payments/confirm", payload).then((res) => res.data.data);
}

export async function fetchPaymentHistory(params = {}) {
  return api.get("/payments/history", { params }).then((res) => res.data.data);
}

export async function initiateRefund(paymentId, { amount, reason } = {}) {
  return api.post("/payments/refunds", { paymentId, amount, reason }).then((res) => res.data.data);
}

export async function fetchDashboardSummary() {
  return api.get("/payments/dashboard/summary").then((res) => res.data.data);
}

export async function fetchTransactions(params = {}) {
  return api.get("/payments/dashboard/transactions", { params }).then((res) => res.data.data);
}

export { newIdempotencyKey };
