/**
 * CoreConfig.js
 * MediCare Pro – Enterprise Billing Module
 * Centralized configuration for all billing subsystems.
 * All environment-sensitive values must be sourced from here.
 */

// ─── Tax Configuration ────────────────────────────────────────────────────────

export const TAX_CONFIG = {
  GST: {
    enabled: true,
    rate: 0.18,          // 18%
    components: {
      CGST: 0.09,
      SGST: 0.09,
      IGST: 0.18,        // interstate
    },
    exemptCategories: ["CONSULTATION", "BLOOD_TEST", "VACCINATION"],
  },
  TDS: {
    enabled: true,
    threshold: 30000,    // Apply TDS above ₹30,000
    rate: 0.1,
  },
};

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const PAYMENT_METHODS = Object.freeze({
  CASH:          "CASH",
  CARD:          "CARD",
  UPI:           "UPI",
  NET_BANKING:   "NET_BANKING",
  INSURANCE:     "INSURANCE",
  WALLET:        "WALLET",
  CHEQUE:        "CHEQUE",
  DD:            "DEMAND_DRAFT",
});

// ─── Invoice States ───────────────────────────────────────────────────────────

export const INVOICE_STATUS = Object.freeze({
  DRAFT:          "DRAFT",
  PENDING:        "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID:           "PAID",
  OVERDUE:        "OVERDUE",
  CANCELLED:      "CANCELLED",
  REFUNDED:       "REFUNDED",
  DISPUTED:       "DISPUTED",
  WRITTEN_OFF:    "WRITTEN_OFF",
});

// ─── Billing Categories ───────────────────────────────────────────────────────

export const BILLING_CATEGORIES = Object.freeze({
  CONSULTATION:     "CONSULTATION",
  PROCEDURE:        "PROCEDURE",
  LABORATORY:       "LABORATORY",
  RADIOLOGY:        "RADIOLOGY",
  PHARMACY:         "PHARMACY",
  ROOM_CHARGES:     "ROOM_CHARGES",
  NURSING:          "NURSING",
  OT_CHARGES:       "OT_CHARGES",
  BLOOD_BANK:       "BLOOD_BANK",
  AMBULANCE:        "AMBULANCE",
  MISCELLANEOUS:    "MISCELLANEOUS",
});

// ─── Discount Rules ───────────────────────────────────────────────────────────

export const DISCOUNT_CONFIG = {
  maxPercentage:      50,     // never exceed 50% discount
  requiresApproval:   25,     // manual approval above 25%
  seniorCitizen:      10,     // auto-applied for age >= 60
  staffDiscount:      20,
  insuranceAdjustment: true,
};

// ─── Overdue & Late Fee ───────────────────────────────────────────────────────

export const OVERDUE_CONFIG = {
  gracePeriodDays:  3,
  lateFeePercent:   1.5,      // 1.5% per month
  compounding:      false,
  maxLateFeePercent: 15,      // cap at 15% of total
};

// ─── Refund Policy ────────────────────────────────────────────────────────────

export const REFUND_CONFIG = {
  windowDays:       30,       // refund allowed within 30 days
  processingDays:   7,
  partialAllowed:   true,
  requiresReason:   true,
  nonRefundable:    ["OT_CHARGES", "BLOOD_BANK"],
};

// ─── Insurance Configuration ──────────────────────────────────────────────────

export const INSURANCE_CONFIG = {
  supportedProviders: [
    "STAR_HEALTH", "NIVA_BUPA", "HDFC_ERGO",
    "ICICI_LOMBARD", "NEW_INDIA", "UNITED_INDIA",
    "ORIENTAL", "NATIONAL", "CARE_HEALTH", "ADITYA_BIRLA",
  ],
  tpaList: [
    "MEDI_ASSIST", "HEALTH_INDIA", "VIPUL_MEDCORP",
    "PARAMOUNT", "RAKSHA_TPA", "MD_INDIA",
  ],
  claimSettlementDays: 21,
  cashlessThreshold:  500000,   // ₹5L
};

// ─── Pagination & Performance ─────────────────────────────────────────────────

export const PAGINATION = {
  defaultPageSize:  25,
  maxPageSize:      200,
  defaultSortField: "createdAt",
  defaultSortOrder: "desc",
};

// ─── Audit Configuration ──────────────────────────────────────────────────────

export const AUDIT_CONFIG = {
  retentionDays:          2555,   // 7 years (regulatory)
  sensitiveFields:        ["amount", "discount", "paymentMethod", "insuranceId"],
  suspiciousThresholds: {
    highValueInvoice:     100000,  // ₹1L
    rapidEdits:           5,       // edits within 10 mins
    rapidEditWindowMs:    600000,
    unusualDiscount:      30,      // percent
    samePayerDuplicateMs: 60000,   // same payer, same amount, within 1 min
  },
};

// ─── Currency ─────────────────────────────────────────────────────────────────

export const CURRENCY_CONFIG = {
  code:     "INR",
  symbol:   "₹",
  locale:   "en-IN",
  decimals: 2,
};

// ─── API Endpoints ────────────────────────────────────────────────────────────

export const API_ENDPOINTS = {
  BASE:          import.meta?.env?.VITE_API_BASE ?? "http://localhost:5000/api",
  BILLING:       "/billing",
  INVOICES:      "/billing/invoices",
  PAYMENTS:      "/billing/payments",
  REFUNDS:       "/billing/refunds",
  INSURANCE:     "/billing/insurance",
  AUDIT:         "/billing/audit",
  REPORTS:       "/billing/reports",
  SENTINEL:      "/billing/sentinel",
};

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  enableInsuranceClaims:    true,
  enablePartialPayments:    true,
  enableAutoLateFee:        true,
  enableSentinelMonitoring: true,
  enableAuditTrail:         true,
  enableBulkBilling:        false,   // Phase 2
  enableOnlinePayment:      false,   // Phase 2
};