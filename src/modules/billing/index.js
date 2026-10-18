/**
 * index.js
 * MediCare Pro – Enterprise Billing Module
 * Barrel export for all Phase 1 billing foundation modules.
 * Import from this file only — never import directly from internals
 * to maintain clean dependency boundaries.
 *
 * Usage:
 *   import { useNexusCore, NexusCoreProvider, computeInvoiceTotals } from "@/billing";
 */

// ─── Configuration ────────────────────────────────────────────────────────────
export {
  TAX_CONFIG,
  PAYMENT_METHODS,
  INVOICE_STATUS,
  BILLING_CATEGORIES,
  DISCOUNT_CONFIG,
  OVERDUE_CONFIG,
  REFUND_CONFIG,
  INSURANCE_CONFIG,
  PAGINATION,
  AUDIT_CONFIG,
  CURRENCY_CONFIG,
  API_ENDPOINTS,
  FEATURE_FLAGS,
} from "./CoreConfig.js";

// ─── Logic Engine (pure functions) ───────────────────────────────────────────
export {
  formatCurrency,
  financialRound,
  computeLineTotal,
  isTaxExempt,
  computeGST,
  clampDiscount,
  computeDiscount,
  applySeniorDiscount,
  computeInvoiceTotals,
  computeBalance,
  computeLateFee,
  computeInsuranceSplit,
  generateInvoiceNumber,
  deriveInvoiceStatus,
} from "./LogicEngine.js";

// ─── Rule Guard (validation) ──────────────────────────────────────────────────
export {
  validateLineItem,
  validateInvoice,
  validatePayment,
  validateRefund,
  validateDiscountApproval,
  validateStatusTransition,
  validateNewInvoiceSubmission,
} from "./RuleGuard.js";

// ─── Audit Manager ────────────────────────────────────────────────────────────
export {
  AUDIT_EVENTS,
  AUDIT_SEVERITY,
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
} from "./AuditManager.js";

export { default as AuditManager } from "./AuditManager.js";

// ─── Sentinel Audit ───────────────────────────────────────────────────────────
export {
  SENTINEL_ALERT_TYPES,
  inspectInvoice,
  inspectPayment,
  inspectRefund,
  getSessionAlerts,
  resolveAlert,
} from "./SentinelAudit.js";

export { default as SentinelAudit } from "./SentinelAudit.js";

// ─── Billing Connector (HTTP) ─────────────────────────────────────────────────
export {
  BillingAPIError,
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
} from "./BillingConnector.js";

export { default as BillingConnector } from "./BillingConnector.js";

// ─── NexusCore (React state) ──────────────────────────────────────────────────
export {
  NEXUS_ACTIONS,
  NexusCoreProvider,
  useNexusCore,
  useInvoiceList,
  useActiveInvoice,
  useBillingActions,
  useSentinelAlerts,
} from "./NexusCore.jsx";

// ─── Module Metadata ──────────────────────────────────────────────────────────
export const BILLING_MODULE_META = {
  name:    "MediCare Pro Billing Module",
  version: "1.0.0",
  phase:   1,
  modules: [
    "CoreConfig",
    "LogicEngine",
    "RuleGuard",
    "AuditManager",
    "SentinelAudit",
    "BillingConnector",
    "NexusCore",
  ],
};