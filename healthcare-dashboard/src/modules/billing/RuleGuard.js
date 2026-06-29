/**
 * RuleGuard.js
 * MediCare Pro – Enterprise Billing Module
 * Validates invoices, payments, refunds, and business rules.
 * Returns structured ValidationResult objects — never throws.
 */

import {
  INVOICE_STATUS,
  PAYMENT_METHODS,
  DISCOUNT_CONFIG,
  REFUND_CONFIG,
  TAX_CONFIG,
  BILLING_CATEGORIES,
  AUDIT_CONFIG,
} from "./CoreConfig.js";
import { financialRound, _checkRefundSync } from "./LogicEngine.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ValidationResult
 * @property {boolean}  valid
 * @property {string[]} errors    Blocking issues
 * @property {string[]} warnings  Non-blocking advisories
 */

/**
 * @returns {ValidationResult}
 */
function pass(warnings = []) {
  return { valid: true, errors: [], warnings };
}

function fail(errors = [], warnings = []) {
  return { valid: false, errors, warnings };
}

function merge(...results) {
  const errors   = results.flatMap((r) => r.errors);
  const warnings = results.flatMap((r) => r.warnings);
  return { valid: errors.length === 0, errors, warnings };
}

// ─── Line Item Validation ─────────────────────────────────────────────────────

/**
 * Validate a single line item.
 * @param {Object} item
 * @param {number} index
 * @returns {ValidationResult}
 */
export function validateLineItem(item, index) {
  const errors   = [];
  const warnings = [];
  const prefix   = `Item[${index}]`;

  if (!item || typeof item !== "object") {
    return fail([`${prefix}: item is null or not an object.`]);
  }

  if (!Object.values(BILLING_CATEGORIES).includes(item.category)) {
    errors.push(`${prefix}: Invalid category "${item.category}".`);
  }

  if (!item.description || item.description.trim().length < 3) {
    errors.push(`${prefix}: Description must be at least 3 characters.`);
  }

  if (typeof item.quantity !== "number" || item.quantity <= 0) {
    errors.push(`${prefix}: Quantity must be a positive number.`);
  }

  if (typeof item.unitPrice !== "number" || item.unitPrice < 0) {
    errors.push(`${prefix}: Unit price must be a non-negative number.`);
  }

  if (item.unitPrice === 0) {
    warnings.push(`${prefix}: Unit price is ₹0. Confirm this is intentional.`);
  }

  const discPct = item.discountPercent ?? 0;
  if (discPct < 0 || discPct > DISCOUNT_CONFIG.maxPercentage) {
    errors.push(`${prefix}: Discount ${discPct}% exceeds maximum ${DISCOUNT_CONFIG.maxPercentage}%.`);
  }

  if (discPct >= DISCOUNT_CONFIG.requiresApproval) {
    warnings.push(`${prefix}: Discount of ${discPct}% requires supervisor approval.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Invoice Validation ───────────────────────────────────────────────────────

/**
 * Validate a full invoice object before creation or update.
 * @param {Object} invoice
 * @returns {ValidationResult}
 */
export function validateInvoice(invoice) {
  const errors   = [];
  const warnings = [];

  // Patient
  if (!invoice.patientId || typeof invoice.patientId !== "string") {
    errors.push("patientId is required and must be a string.");
  }

  // Doctor
  if (!invoice.doctorId && !invoice.departmentId) {
    warnings.push("Neither doctorId nor departmentId is set. At least one is recommended.");
  }

  // Due date
  if (!invoice.dueDate) {
    errors.push("dueDate is required.");
  } else {
    const due = new Date(invoice.dueDate);
    if (isNaN(due.getTime())) {
      errors.push("dueDate is not a valid date.");
    } else if (due < new Date(Date.now() - 86400000)) {
      // Allow backdating by 1 day for timezone tolerance
      warnings.push("dueDate is in the past.");
    }
  }

  // Items
  if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
    errors.push("Invoice must have at least one line item.");
  } else {
    const itemResults = invoice.items.map((item, i) => validateLineItem(item, i));
    itemResults.forEach((r) => {
      errors.push(...r.errors);
      warnings.push(...r.warnings);
    });
  }

  // Invoice-level discount
  const invDisc = invoice.discountPercent ?? 0;
  if (invDisc < 0 || invDisc > DISCOUNT_CONFIG.maxPercentage) {
    errors.push(`Invoice-level discount ${invDisc}% exceeds maximum ${DISCOUNT_CONFIG.maxPercentage}%.`);
  }
  if (invDisc >= DISCOUNT_CONFIG.requiresApproval) {
    warnings.push(`Invoice-level discount of ${invDisc}% requires supervisor approval.`);
  }

  // Grand total sanity
  if (typeof invoice.grandTotal === "number") {
    if (invoice.grandTotal < 0) {
      errors.push("Grand total cannot be negative.");
    }
    if (invoice.grandTotal > AUDIT_CONFIG.suspiciousThresholds.highValueInvoice) {
      warnings.push(`Grand total ₹${invoice.grandTotal} exceeds high-value threshold. Review required.`);
    }
  }

  // Insurance
  if (invoice.insuranceClaim) {
    const ins = invoice.insuranceClaim;
    if (!ins.providerId) errors.push("insuranceClaim.providerId is required.");
    if (!ins.policyNumber) errors.push("insuranceClaim.policyNumber is required.");
    if (typeof ins.coverageAmount !== "number" || ins.coverageAmount <= 0) {
      errors.push("insuranceClaim.coverageAmount must be a positive number.");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Payment Validation ───────────────────────────────────────────────────────

/**
 * Validate a payment record before posting.
 * @param {Object}  payment
 * @param {Object}  invoice   The invoice being paid
 * @returns {ValidationResult}
 */
export function validatePayment(payment, invoice) {
  const errors   = [];
  const warnings = [];

  if (!payment.invoiceId) {
    errors.push("payment.invoiceId is required.");
  }

  if (!Object.values(PAYMENT_METHODS).includes(payment.method)) {
    errors.push(`Invalid payment method "${payment.method}".`);
  }

  if (typeof payment.amount !== "number" || payment.amount <= 0) {
    errors.push("Payment amount must be a positive number.");
  }

  // Block payment on terminal statuses
  const terminalStatuses = [
    INVOICE_STATUS.CANCELLED,
    INVOICE_STATUS.WRITTEN_OFF,
    INVOICE_STATUS.REFUNDED,
  ];
  if (terminalStatuses.includes(invoice?.status)) {
    errors.push(`Cannot accept payment on an invoice with status "${invoice.status}".`);
  }

  // Overpayment check
  if (typeof payment.amount === "number" && typeof invoice?.balanceDue === "number") {
    if (payment.amount > invoice.balanceDue) {
      const excess = financialRound(payment.amount - invoice.balanceDue);
      warnings.push(`Payment of ₹${payment.amount} exceeds balance due ₹${invoice.balanceDue}. ₹${excess} will be credit/refunded.`);
    }
  }

  // Cheque / DD additional fields
  if (payment.method === PAYMENT_METHODS.CHEQUE || payment.method === PAYMENT_METHODS.DD) {
    if (!payment.referenceNumber) {
      errors.push(`referenceNumber is required for ${payment.method} payments.`);
    }
    if (!payment.bankName) {
      errors.push(`bankName is required for ${payment.method} payments.`);
    }
  }

  // Insurance payment
  if (payment.method === PAYMENT_METHODS.INSURANCE) {
    if (!payment.claimId) {
      errors.push("claimId is required for INSURANCE payments.");
    }
    if (!payment.tpaName) {
      warnings.push("tpaName is missing for INSURANCE payment. Recommended for audit.");
    }
  }

  // UPI
  if (payment.method === PAYMENT_METHODS.UPI && !payment.upiTransactionId) {
    errors.push("upiTransactionId is required for UPI payments.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Refund Validation ────────────────────────────────────────────────────────

/**
 * Validate a refund request.
 * @param {Object} refundRequest
 * @param {Object} invoice
 * @returns {ValidationResult}
 */
export function validateRefund(refundRequest, invoice) {
  const errors   = [];
  const warnings = [];

  if (!refundRequest.invoiceId) {
    errors.push("refundRequest.invoiceId is required.");
  }

  if (!refundRequest.reason || refundRequest.reason.trim().length < 10) {
    errors.push("A reason of at least 10 characters is required for refunds.");
  }

  if (typeof refundRequest.amount !== "number" || refundRequest.amount <= 0) {
    errors.push("Refund amount must be a positive number.");
  }

  if (!refundRequest.requestedBy) {
    errors.push("refundRequest.requestedBy (staff ID) is required.");
  }

  // Use LogicEngine eligibility check
  const eligibility = _checkRefundSync(invoice, refundRequest.amount, REFUND_CONFIG);
  if (!eligibility.eligible) {
    errors.push(`Refund not eligible: ${eligibility.reason}`);
  }

  if (refundRequest.amount > 50000) {
    warnings.push("Refund amount exceeds ₹50,000. Finance head approval required.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Discount Approval Rule ───────────────────────────────────────────────────

/**
 * Validate a discount approval token.
 * @param {number}  discountPercent
 * @param {string}  approverRole
 * @returns {ValidationResult}
 */
export function validateDiscountApproval(discountPercent, approverRole) {
  const ALLOWED_APPROVERS = ["Admin", "Doctor", "Hospital"];

  if (discountPercent >= DISCOUNT_CONFIG.requiresApproval) {
    if (!approverRole || !ALLOWED_APPROVERS.includes(approverRole)) {
      return fail([
        `Discount of ${discountPercent}% requires approval from: ${ALLOWED_APPROVERS.join(", ")}.`,
      ]);
    }
  }
  return pass();
}

// ─── Status Transition Guard ──────────────────────────────────────────────────

const ALLOWED_TRANSITIONS = {
  [INVOICE_STATUS.DRAFT]:          [INVOICE_STATUS.PENDING, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.PENDING]:        [INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED, INVOICE_STATUS.OVERDUE],
  [INVOICE_STATUS.PARTIALLY_PAID]: [INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED, INVOICE_STATUS.OVERDUE],
  [INVOICE_STATUS.OVERDUE]:        [INVOICE_STATUS.PAID, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.WRITTEN_OFF, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.PAID]:           [INVOICE_STATUS.REFUNDED, INVOICE_STATUS.DISPUTED],
  [INVOICE_STATUS.DISPUTED]:       [INVOICE_STATUS.PAID, INVOICE_STATUS.REFUNDED, INVOICE_STATUS.WRITTEN_OFF],
  [INVOICE_STATUS.CANCELLED]:      [],
  [INVOICE_STATUS.REFUNDED]:       [],
  [INVOICE_STATUS.WRITTEN_OFF]:    [],
};

/**
 * Guard status transitions to prevent invalid state changes.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {ValidationResult}
 */
export function validateStatusTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) {
    return fail([`Unknown source status "${fromStatus}".`]);
  }
  if (!allowed.includes(toStatus)) {
    return fail([
      `Transition from "${fromStatus}" → "${toStatus}" is not permitted. Allowed: [${allowed.join(", ")}]`,
    ]);
  }
  return pass();
}

// ─── Bulk Validation ──────────────────────────────────────────────────────────

/**
 * Run all relevant guards for a new invoice submission.
 * @param {Object} invoice
 * @param {string} approverRole
 * @returns {ValidationResult}
 */
export function validateNewInvoiceSubmission(invoice, approverRole) {
  const invoiceResult  = validateInvoice(invoice);
  const discountResult = validateDiscountApproval(
    invoice.discountPercent ?? 0,
    approverRole
  );
  return merge(invoiceResult, discountResult);
}