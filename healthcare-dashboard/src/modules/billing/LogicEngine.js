/**
 * =========================================================
 * MEDICARE PRO — ENTERPRISE BILLING LOGIC ENGINE
 * Unified + Production-Optimized Version (FIXED)
 * Pure deterministic financial computation layer
 * =========================================================
 */

import {
  GST_CONFIG,
  TAX_CONFIG,
  PAYMENT_STATUS,
  VALIDATION_LIMITS,
  INVOICE_NUMBER_CONFIG,
  OVERDUE_CONFIG,
  REFUND_CONFIG,
  DISCOUNT_CONFIG,
} from "./CoreConfig.js";

// =========================================================
// SAFE MATH CORE
// =========================================================

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const round2 = (v) =>
  Math.round((toNumber(v) + Number.EPSILON) * 100) / 100;

const clamp = (v, min, max) => Math.min(max, Math.max(min, toNumber(v)));

// =========================================================
// SUBTOTAL
// =========================================================

export const calculateSubtotal = (items = []) =>
  round2(
    (Array.isArray(items) ? items : []).reduce((sum, i) => {
      return sum + toNumber(i.quantity) * toNumber(i.unitPrice);
    }, 0)
  );

// =========================================================
// GST ENGINE (FIXED ROUNDING SAFETY)
// =========================================================

export const calculateGST = (
  amount,
  ratePercent = GST_CONFIG.defaultRate,
  intraState = true,
  category = null
) => {
  const amt = toNumber(amount);

  const exempt =
    TAX_CONFIG?.GST?.exemptCategories?.includes(category) || false;

  if (!GST_CONFIG.enabled || exempt) {
    return { cgst: 0, sgst: 0, igst: 0, total: 0 };
  }

  const totalTax = round2((amt * ratePercent) / 100);

  if (!intraState) {
    return { cgst: 0, sgst: 0, igst: totalTax, total: totalTax };
  }

  // FIX: prevents cgst + sgst mismatch due to rounding
  const cgst = round2(totalTax / 2);
  const sgst = round2(totalTax - cgst);

  return { cgst, sgst, igst: 0, total: totalTax };
};

// =========================================================
// DISCOUNT ENGINE
// =========================================================

export const calculateDiscount = (base, discount = {}) => {
  const value = toNumber(base);

  if (!discount || !discount.value) return 0;

  if (discount.type === "PERCENT") {
    const percent = clamp(
      discount.value,
      0,
      DISCOUNT_CONFIG.maxPercentage
    );
    return round2((value * percent) / 100);
  }

  return round2(clamp(discount.value, 0, value));
};

// =========================================================
// INSURANCE ENGINE (FIXED LOGIC)
// =========================================================

export const calculateInsurance = (amount, policy = {}) => {
  const base = toNumber(amount);

  if (!policy?.coveragePercent) {
    return { insuranceCovered: 0, patientPayable: base };
  }

  let covered = round2((base * clamp(policy.coveragePercent, 0, 100)) / 100);

  if (policy.coverageCap) {
    covered = Math.min(covered, toNumber(policy.coverageCap));
  }

  covered = Math.min(covered, base);

  return {
    insuranceCovered: covered,
    patientPayable: round2(base - covered),
  };
};

// =========================================================
// GRAND TOTAL ENGINE (FIXED INSURANCE POSITION)
// =========================================================

export const calculateGrandTotal = ({
  items = [],
  discount = null,
  gstRate = GST_CONFIG.defaultRate,
  intraState = true,
  insurance = null,
} = {}) => {
  const subtotal = calculateSubtotal(items);

  const discountAmount = calculateDiscount(subtotal, discount);

  const taxable = round2(subtotal - discountAmount);

  const gst = calculateGST(taxable, gstRate, intraState);

  // FIX: insurance applies BEFORE GST (correct hospital billing logic)
  const insuranceResult = calculateInsurance(taxable, insurance);

  const insuranceCovered = insuranceResult.insuranceCovered;

  const taxableAfterInsurance = round2(taxable - insuranceCovered);

  const gstAfterInsurance = calculateGST(
    taxableAfterInsurance,
    gstRate,
    intraState
  );

  const grandTotal = round2(taxableAfterInsurance + gstAfterInsurance.total);

  return {
    subtotal,
    discountAmount,
    taxableAmount: taxable,
    insuranceCovered,
    taxableAfterInsurance,
    cgst: gstAfterInsurance.cgst,
    sgst: gstAfterInsurance.sgst,
    igst: gstAfterInsurance.igst,
    totalTax: gstAfterInsurance.total,
    grandTotal,
    patientPayable: grandTotal,
  };
};

// =========================================================
// PAYMENT ENGINE
// =========================================================

export const calculatePaidAmount = (payments = []) =>
  round2(
    (Array.isArray(payments) ? payments : [])
      .filter((p) => p.status !== "FAILED")
      .reduce((sum, p) => sum + toNumber(p.amount), 0)
  );

export const calculateDueAmount = (total, payments = []) => {
  const paid = calculatePaidAmount(payments);
  return Math.max(0, round2(toNumber(total) - paid));
};

// =========================================================
// PAYMENT STATUS RESOLVER (FIXED EDGE CASE)
// =========================================================

export const resolvePaymentStatus = (grandTotal, payments = []) => {
  const paid = calculatePaidAmount(payments);
  const due = calculateDueAmount(grandTotal, payments);

  if (paid <= 0) return PAYMENT_STATUS.PENDING;
  if (paid >= grandTotal) return PAYMENT_STATUS.PAID;
  if (due > 0) return PAYMENT_STATUS.PARTIALLY_PAID;

  return PAYMENT_STATUS.PAID;
};

// =========================================================
// PARTIAL PAYMENT
// =========================================================

export const processPartialPayment = (
  grandTotal,
  existing = [],
  amount = 0
) => {
  const updated = [
    ...(Array.isArray(existing) ? existing : []),
    {
      amount: toNumber(amount),
      status: "SUCCESS",
      paidAt: new Date().toISOString(),
    },
  ];

  const totalPaid = calculatePaidAmount(updated);
  const due = calculateDueAmount(grandTotal, updated);

  return {
    updatedPayments: updated,
    totalPaid,
    dueAmount: due,
    status: resolvePaymentStatus(grandTotal, updated),
  };
};

// =========================================================
// REFUND ENGINE
// =========================================================

export const calculateRefund = (
  totalPaid,
  refundAmount,
  alreadyRefunded = 0
) => {
  const paid = toNumber(totalPaid);
  const refunded = toNumber(alreadyRefunded);

  const maxRefundable = Math.max(0, paid - refunded);

  const finalRefund = Math.min(
    Math.max(0, toNumber(refundAmount)),
    maxRefundable
  );

  const totalRefunded = refunded + finalRefund;

  let status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
  if (totalRefunded <= 0) status = PAYMENT_STATUS.PAID;
  if (totalRefunded >= paid) status = PAYMENT_STATUS.REFUNDED;

  return {
    refundAmount: finalRefund,
    totalRefunded,
    remainingRefundable: Math.max(0, paid - totalRefunded),
    status,
  };
};

// =========================================================
// INVOICE NUMBER (PRODUCTION SAFE)
// =========================================================

export const generateInvoiceNumber = (
  sequence = 1,
  date = new Date()
) => {
  const fyStart = INVOICE_NUMBER_CONFIG.financialYearStartMonthIndex;

  const year = date.getFullYear();
  const month = date.getMonth();

  const startYear = month >= fyStart ? year : year - 1;
  const endYear = String((startYear + 1) % 100).padStart(2, "0");

  const fy = `${startYear}-${endYear}`;

  const seq = String(sequence).padStart(
    INVOICE_NUMBER_CONFIG.sequencePadLength,
    "0"
  );

  return `${INVOICE_NUMBER_CONFIG.prefix}-${fy}-${seq}`;
};

// =========================================================
// FINANCIAL SUMMARY
// =========================================================

export const generateFinancialSummary = (invoices = []) => {
  const list = Array.isArray(invoices) ? invoices : [];

  const summary = list.reduce(
    (acc, inv) => {
      const total = toNumber(inv.grandTotal);
      const paid = calculatePaidAmount(inv.payments);
      const due = calculateDueAmount(total, inv.payments);

      acc.totalBilled += total;
      acc.totalCollected += paid;
      acc.totalOutstanding += due;

      return acc;
    },
    {
      totalBilled: 0,
      totalCollected: 0,
      totalOutstanding: 0,
    }
  );

  return {
    ...summary,
    collectionRate:
      summary.totalBilled > 0
        ? round2((summary.totalCollected / summary.totalBilled) * 100)
        : 0,
    invoiceCount: list.length,
  };
};

// =========================================================
// EXPORT ENGINE
// =========================================================

const BillingLogicEngine = Object.freeze({
  calculateSubtotal,
  calculateGST,
  calculateDiscount,
  calculateInsurance,
  calculateGrandTotal,
  calculatePaidAmount,
  calculateDueAmount,
  resolvePaymentStatus,
  processPartialPayment,
  calculateRefund,
  generateInvoiceNumber,
  generateFinancialSummary,
});

export default BillingLogicEngine;