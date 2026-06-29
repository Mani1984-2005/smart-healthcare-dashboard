/**
 * LogicEngine.js
 * MediCare Pro – Enterprise Billing Module
 * Pure, side-effect-free billing calculation functions.
 * All functions are deterministic and unit-testable.
 */

import {
  TAX_CONFIG,
  DISCOUNT_CONFIG,
  OVERDUE_CONFIG,
  CURRENCY_CONFIG,
  BILLING_CATEGORIES,
} from "./CoreConfig.js";

// ─── Currency Formatting ──────────────────────────────────────────────────────

/**
 * Format a numeric value as localized currency string.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style:    "currency",
    currency: CURRENCY_CONFIG.code,
    minimumFractionDigits: CURRENCY_CONFIG.decimals,
    maximumFractionDigits: CURRENCY_CONFIG.decimals,
  }).format(amount);
}

/**
 * Round to 2 decimal places (financial rounding).
 * @param {number} value
 * @returns {number}
 */
export function financialRound(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ─── Item-level Calculations ──────────────────────────────────────────────────

/**
 * Calculate the subtotal for a single line item.
 * @param {{ quantity: number, unitPrice: number }} item
 * @returns {number}
 */
export function computeLineTotal(item) {
  const { quantity, unitPrice } = item;
  if (quantity <= 0 || unitPrice < 0) return 0;
  return financialRound(quantity * unitPrice);
}

/**
 * Determine whether a billing category is GST-exempt.
 * @param {string} category
 * @returns {boolean}
 */
export function isTaxExempt(category) {
  return TAX_CONFIG.GST.exemptCategories.includes(category);
}

/**
 * Compute GST breakdown for a given amount and category.
 * @param {number} amount        Pre-tax amount
 * @param {string} category      BILLING_CATEGORIES key
 * @param {boolean} interstate   Whether supply is inter-state (IGST)
 * @returns {{ cgst: number, sgst: number, igst: number, total: number }}
 */
export function computeGST(amount, category, interstate = false) {
  if (!TAX_CONFIG.GST.enabled || isTaxExempt(category)) {
    return { cgst: 0, sgst: 0, igst: 0, total: 0 };
  }

  if (interstate) {
    const igst = financialRound(amount * TAX_CONFIG.GST.components.IGST);
    return { cgst: 0, sgst: 0, igst, total: igst };
  }

  const cgst = financialRound(amount * TAX_CONFIG.GST.components.CGST);
  const sgst = financialRound(amount * TAX_CONFIG.GST.components.SGST);
  return { cgst, sgst, igst: 0, total: financialRound(cgst + sgst) };
}

// ─── Discount Calculations ────────────────────────────────────────────────────

/**
 * Clamp a discount percentage to configured maximum.
 * @param {number} percent
 * @returns {number}
 */
export function clampDiscount(percent) {
  return Math.max(0, Math.min(percent, DISCOUNT_CONFIG.maxPercentage));
}

/**
 * Compute discount amount from subtotal and percentage.
 * @param {number} subtotal
 * @param {number} discountPercent
 * @returns {{ percent: number, amount: number, requiresApproval: boolean }}
 */
export function computeDiscount(subtotal, discountPercent) {
  const clamped = clampDiscount(discountPercent);
  const amount  = financialRound(subtotal * (clamped / 100));
  return {
    percent:          clamped,
    amount,
    requiresApproval: clamped >= DISCOUNT_CONFIG.requiresApproval,
  };
}

/**
 * Apply senior citizen discount if eligible.
 * @param {number} currentPercent
 * @param {number} age
 * @returns {number} Updated discount percent
 */
export function applySeniorDiscount(currentPercent, age) {
  if (age >= 60) {
    return Math.min(
      currentPercent + DISCOUNT_CONFIG.seniorCitizen,
      DISCOUNT_CONFIG.maxPercentage
    );
  }
  return currentPercent;
}

// ─── Invoice Totals ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} LineItem
 * @property {string}  category    BILLING_CATEGORIES key
 * @property {number}  quantity
 * @property {number}  unitPrice
 * @property {number}  [discountPercent]
 * @property {boolean} [interstate]
 */

/**
 * @typedef {Object} InvoiceSummary
 * @property {number} subtotal
 * @property {number} discountAmount
 * @property {number} taxableAmount
 * @property {number} cgst
 * @property {number} sgst
 * @property {number} igst
 * @property {number} totalTax
 * @property {number} grandTotal
 * @property {LineItem[]} lineItems  Enriched items with computed fields
 */

/**
 * Compute full invoice summary from line items.
 * @param {LineItem[]} items
 * @param {number}     invoiceDiscountPercent  Invoice-level discount
 * @param {boolean}    interstate
 * @returns {InvoiceSummary}
 */
export function computeInvoiceTotals(items, invoiceDiscountPercent = 0, interstate = false) {
  let subtotal     = 0;
  let totalCGST    = 0;
  let totalSGST    = 0;
  let totalIGST    = 0;

  const enrichedItems = items.map((item) => {
    const lineTotal   = computeLineTotal(item);
    const itemDisc    = computeDiscount(lineTotal, item.discountPercent ?? 0);
    const afterDisc   = financialRound(lineTotal - itemDisc.amount);
    const gst         = computeGST(afterDisc, item.category, interstate);

    subtotal   += lineTotal;
    totalCGST  += gst.cgst;
    totalSGST  += gst.sgst;
    totalIGST  += gst.igst;

    return {
      ...item,
      lineTotal,
      discountAmount: itemDisc.amount,
      taxableAmount:  afterDisc,
      cgst:           gst.cgst,
      sgst:           gst.sgst,
      igst:           gst.igst,
      lineTax:        gst.total,
      lineGrandTotal: financialRound(afterDisc + gst.total),
    };
  });

  subtotal          = financialRound(subtotal);
  const invDiscount = computeDiscount(subtotal, invoiceDiscountPercent);
  const taxableAmt  = financialRound(subtotal - invDiscount.amount);

  // Invoice-level tax on the taxable remainder (after invoice discount)
  // Item-level taxes already computed; here we recalculate proportionally
  const scaleFactor     = subtotal > 0 ? taxableAmt / subtotal : 0;
  const scaledCGST      = financialRound(totalCGST * scaleFactor);
  const scaledSGST      = financialRound(totalSGST * scaleFactor);
  const scaledIGST      = financialRound(totalIGST * scaleFactor);
  const totalTax        = financialRound(scaledCGST + scaledSGST + scaledIGST);
  const grandTotal      = financialRound(taxableAmt + totalTax);

  return {
    subtotal,
    discountAmount:          invDiscount.amount,
    discountPercent:         invDiscount.percent,
    discountRequiresApproval: invDiscount.requiresApproval,
    taxableAmount:           taxableAmt,
    cgst:                    scaledCGST,
    sgst:                    scaledSGST,
    igst:                    scaledIGST,
    totalTax,
    grandTotal,
    lineItems:               enrichedItems,
  };
}

// ─── Payment Balance ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} PaymentRecord
 * @property {number}  amount
 * @property {string}  status   "SETTLED" | "REVERSED" | "PENDING"
 */

/**
 * Compute balance due from invoice total and payment history.
 * @param {number}          grandTotal
 * @param {PaymentRecord[]} payments
 * @returns {{ amountPaid: number, balanceDue: number, overpayment: number, isFullyPaid: boolean }}
 */
export function computeBalance(grandTotal, payments = []) {
  const amountPaid = financialRound(
    payments
      .filter((p) => p.status === "SETTLED")
      .reduce((sum, p) => sum + p.amount, 0)
  );

  const balanceDue   = financialRound(Math.max(0, grandTotal - amountPaid));
  const overpayment  = financialRound(Math.max(0, amountPaid - grandTotal));
  const isFullyPaid  = balanceDue === 0 && amountPaid > 0;

  return { amountPaid, balanceDue, overpayment, isFullyPaid };
}

// ─── Late Fee ─────────────────────────────────────────────────────────────────

/**
 * Compute late fee for an overdue invoice.
 * @param {number} grandTotal
 * @param {Date|string} dueDate
 * @param {Date|string} [asOf]   Default: now
 * @returns {{ daysOverdue: number, lateFeePercent: number, lateFeeAmount: number }}
 */
export function computeLateFee(grandTotal, dueDate, asOf = new Date()) {
  const due    = new Date(dueDate);
  const check  = new Date(asOf);
  const diffMs = check - due;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= OVERDUE_CONFIG.gracePeriodDays) {
    return { daysOverdue: diffDays, lateFeePercent: 0, lateFeeAmount: 0 };
  }

  const billableMonths = Math.ceil((diffDays - OVERDUE_CONFIG.gracePeriodDays) / 30);
  const rawPercent     = billableMonths * OVERDUE_CONFIG.lateFeePercent;
  const cappedPercent  = Math.min(rawPercent, OVERDUE_CONFIG.maxLateFeePercent);
  const lateFeeAmount  = financialRound(grandTotal * (cappedPercent / 100));

  return {
    daysOverdue:    diffDays,
    lateFeePercent: cappedPercent,
    lateFeeAmount,
  };
}

// ─── Insurance Split ──────────────────────────────────────────────────────────

/**
 * Split invoice total between insurance coverage and patient liability.
 * @param {number} grandTotal
 * @param {number} coverageAmount    Amount the insurer will pay
 * @param {number} coPayPercent      Co-pay percentage (patient's share of covered amount)
 * @returns {{ insurancePays: number, patientPays: number, copayAmount: number }}
 */
export function computeInsuranceSplit(grandTotal, coverageAmount, coPayPercent = 0) {
  const eligible      = Math.min(coverageAmount, grandTotal);
  const copayAmount   = financialRound(eligible * (coPayPercent / 100));
  const insurancePays = financialRound(eligible - copayAmount);
  const uncovered     = financialRound(grandTotal - eligible);
  const patientPays   = financialRound(copayAmount + uncovered);

  return { insurancePays, patientPays, copayAmount, uncoveredAmount: uncovered };
}

// ─── Refund Eligibility ───────────────────────────────────────────────────────

/**
 * Determine whether a refund is eligible.
 * @param {{ paidAt: Date|string, category: string, grandTotal: number, amountPaid: number }} invoice
 * @param {number} refundAmount
 * @returns {{ eligible: boolean, reason: string | null }}
 */
export function checkRefundEligibility(invoice, refundAmount) {
  const { REFUND_CONFIG } = await import("./CoreConfig.js").catch(() => {
    // Synchronous fallback if dynamic import not available
    return { REFUND_CONFIG: { windowDays: 30, nonRefundable: ["OT_CHARGES", "BLOOD_BANK"], partialAllowed: true } };
  });

  return _checkRefundSync(invoice, refundAmount);
}

// Internal synchronous version used by RuleGuard
export function _checkRefundSync(invoice, refundAmount, refundConfig) {
  const cfg = refundConfig ?? { windowDays: 30, nonRefundable: ["OT_CHARGES", "BLOOD_BANK"], partialAllowed: true };

  if (!invoice.paidAt) {
    return { eligible: false, reason: "Invoice has not been paid." };
  }

  const daysSincePaid = Math.floor(
    (Date.now() - new Date(invoice.paidAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSincePaid > cfg.windowDays) {
    return { eligible: false, reason: `Refund window of ${cfg.windowDays} days has expired.` };
  }

  if (cfg.nonRefundable.includes(invoice.category)) {
    return { eligible: false, reason: `${invoice.category} charges are non-refundable.` };
  }

  if (!cfg.partialAllowed && refundAmount < invoice.amountPaid) {
    return { eligible: false, reason: "Partial refunds are not permitted." };
  }

  if (refundAmount > invoice.amountPaid) {
    return { eligible: false, reason: "Refund amount exceeds amount paid." };
  }

  return { eligible: true, reason: null };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable invoice number.
 * Format: INV-YYYYMMDD-XXXXX
 * @param {Date} [date]
 * @returns {string}
 */
export function generateInvoiceNumber(date = new Date()) {
  const d     = date;
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  const seq   = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `INV-${year}${month}${day}-${seq}`;
}

/**
 * Determine invoice status from balance and dates.
 * @param {number}  balanceDue
 * @param {Date|string} dueDate
 * @param {boolean} isCancelled
 * @param {boolean} isRefunded
 * @returns {string}  INVOICE_STATUS value
 */
export function deriveInvoiceStatus(balanceDue, amountPaid, grandTotal, dueDate, isCancelled, isRefunded) {
  if (isCancelled)  return "CANCELLED";
  if (isRefunded)   return "REFUNDED";
  if (balanceDue === 0 && amountPaid > 0) return "PAID";
  if (amountPaid > 0 && balanceDue > 0)  return "PARTIALLY_PAID";
  if (balanceDue === grandTotal && new Date() > new Date(dueDate)) return "OVERDUE";
  if (balanceDue === grandTotal)          return "PENDING";
  return "DRAFT";
}