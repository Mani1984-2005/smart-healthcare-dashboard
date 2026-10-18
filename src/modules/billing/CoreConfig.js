/**
 * =========================================================
 * MEDICARE PRO — ENTERPRISE BILLING CORE CONFIG
 * Unified + Production-Optimized Version
 * =========================================================
 */

// =========================================================
// HOSPITAL CONFIG
// =========================================================

export const HOSPITAL_CONFIG = Object.freeze({
  name: "MediCare Pro Hospital",
  legalName: "MediCare Pro Healthcare Services Pvt. Ltd.",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  phone: "",
  email: "",
  website: "",
  gstin: "",
  panNumber: "",
  cinNumber: "",
  drugLicenseNumber: "",
  logoUrl: "/assets/hospital-logo.png",
  invoiceFooterNote:
    "This is a computer generated invoice and does not require a physical signature.",
});

// =========================================================
// CURRENCY
// =========================================================

export const CURRENCY_CONFIG = Object.freeze({
  code: "INR",
  symbol: "₹",
  locale: "en-IN",
  decimalPlaces: 2,
});

export const formatCurrency = (amount) => {
  const value = Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: "currency",
    currency: CURRENCY_CONFIG.code,
    minimumFractionDigits: CURRENCY_CONFIG.decimalPlaces,
  }).format(value);
};

// =========================================================
// TAX CONFIG (GST + TDS unified)
// =========================================================

export const TAX_CONFIG = Object.freeze({
  GST: {
    enabled: true,
    defaultRate: 0.18,
    components: {
      CGST: 0.09,
      SGST: 0.09,
      IGST: 0.18,
    },
    slabs: [0, 5, 12, 18, 28],
    exemptCategories: [
      "CONSULTATION",
      "BLOOD_BANK",
      "VACCINATION",
    ],
    hsnCodes: {
      consultation: "9993",
      diagnostics: "9993",
      pharmacy: "3004",
      roomCharges: "9993",
      procedure: "9993",
    },
  },

  TDS: {
    enabled: true,
    threshold: 30000,
    rate: 0.1,
  },
});

// =========================================================
// PAYMENT METHODS
// =========================================================

export const PAYMENT_METHODS = Object.freeze({
  CASH: "CASH",
  CARD: "CARD",
  UPI: "UPI",
  NET_BANKING: "NET_BANKING",
  CHEQUE: "CHEQUE",
  DEMAND_DRAFT: "DEMAND_DRAFT",
  INSURANCE: "INSURANCE",
  WALLET: "WALLET",
  BANK_TRANSFER: "BANK_TRANSFER",
});

export const PAYMENT_METHOD_LABELS = Object.freeze({
  CASH: "Cash",
  CARD: "Debit / Credit Card",
  UPI: "UPI",
  NET_BANKING: "Net Banking",
  CHEQUE: "Cheque",
  DEMAND_DRAFT: "Demand Draft",
  INSURANCE: "Insurance",
  WALLET: "Digital Wallet",
  BANK_TRANSFER: "Bank Transfer",
});

export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS).map(
  (value) => ({
    value,
    label: PAYMENT_METHOD_LABELS[value],
  })
);

// =========================================================
// INVOICE STATUS
// =========================================================

export const INVOICE_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  DISPUTED: "DISPUTED",
  WRITTEN_OFF: "WRITTEN_OFF",
});

// =========================================================
// PAYMENT STATUS
// =========================================================

export const PAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  CANCELLED: "CANCELLED",
  DRAFT: "DRAFT",
});

export const PAYMENT_STATUS_COLOR_MAP = Object.freeze({
  PENDING: "#F59E0B",
  PARTIALLY_PAID: "#3B82F6",
  PAID: "#10B981",
  OVERDUE: "#EF4444",
  REFUNDED: "#8B5CF6",
  PARTIALLY_REFUNDED: "#A855F7",
  CANCELLED: "#6B7280",
  DRAFT: "#94A3B8",
});

// =========================================================
// BILLING CATEGORIES
// =========================================================

export const BILLING_CATEGORIES = Object.freeze({
  CONSULTATION: "CONSULTATION",
  PROCEDURE: "PROCEDURE",
  LABORATORY: "LABORATORY",
  RADIOLOGY: "RADIOLOGY",
  PHARMACY: "PHARMACY",
  ROOM_CHARGES: "ROOM_CHARGES",
  NURSING: "NURSING",
  OT_CHARGES: "OT_CHARGES",
  BLOOD_BANK: "BLOOD_BANK",
  AMBULANCE: "AMBULANCE",
  MISCELLANEOUS: "MISCELLANEOUS",
});

// =========================================================
// DISCOUNTS
// =========================================================

export const DISCOUNT_CONFIG = Object.freeze({
  maxPercentage: 50,
  approvalRequiredAbove: 25,
  seniorCitizenDiscount: 10,
  staffDiscount: 20,
});

// =========================================================
// OVERDUE / LATE FEES
// =========================================================

export const OVERDUE_CONFIG = Object.freeze({
  gracePeriodDays: 3,
  monthlyLateFeePercent: 1.5,
  maxLateFeePercent: 15,
});

// =========================================================
// REFUNDS
// =========================================================

export const REFUND_CONFIG = Object.freeze({
  windowDays: 30,
  processingDays: 7,
  partialAllowed: true,
  requiresReason: true,
});

// =========================================================
// INSURANCE
// =========================================================

export const INSURANCE_CONFIG = Object.freeze({
  providers: [
    "STAR_HEALTH",
    "NIVA_BUPA",
    "HDFC_ERGO",
    "ICICI_LOMBARD",
    "NEW_INDIA",
    "CARE_HEALTH",
  ],
  tpaList: ["MEDI_ASSIST", "VIPUL_MEDCORP", "MD_INDIA"],
  claimSettlementDays: 21,
  cashlessThreshold: 500000,
});

// =========================================================
// AUDIT CONFIG
// =========================================================

export const AUDIT_CONFIG = Object.freeze({
  retentionDays: 2555,
  sensitiveFields: ["amount", "discount", "paymentMethod", "insuranceId"],
});

// =========================================================
// API ENDPOINTS (Unified)
// =========================================================

export const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE ?? "/api/v1";

export const BILLING_API_ENDPOINTS = Object.freeze({
  invoices: `${API_BASE_URL}/billing/invoices`,
  payments: `${API_BASE_URL}/billing/payments`,
  refunds: `${API_BASE_URL}/billing/refunds`,
  insurance: `${API_BASE_URL}/billing/insurance-claims`,
  reports: `${API_BASE_URL}/billing/reports`,
  patientLedger: (id) =>
    `${API_BASE_URL}/billing/patients/${id}/ledger`,
});

// =========================================================
// PAGINATION
// =========================================================

export const PAGINATION_CONFIG = Object.freeze({
  defaultPage: 1,
  defaultPageSize: 25,
  maxPageSize: 200,
  pageSizeOptions: [10, 25, 50, 100],
});

// =========================================================
// SEARCH
// =========================================================

export const SEARCH_CONFIG = Object.freeze({
  debounceMs: 350,
  minQueryLength: 2,
  searchableFields: [
    "invoiceNumber",
    "patientName",
    "patientId",
    "phoneNumber",
  ],
});

// =========================================================
// FEATURE FLAGS
// =========================================================

export const FEATURE_FLAGS = Object.freeze({
  enableInsuranceClaims: true,
  enablePartialPayments: true,
  enableAutoLateFee: true,
  enableAuditTrail: true,
  enableBulkBilling: false,
});

// =========================================================
// DATE FORMATTERS
// =========================================================

export const formatDisplayDate = (input) => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

export const formatDisplayDateTime = (input) => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
};

// =========================================================
// EXPORT DEFAULT (MASTER CONFIG)
// =========================================================

const BillingCoreConfig = Object.freeze({
  HOSPITAL_CONFIG,
  CURRENCY_CONFIG,
  TAX_CONFIG,
  PAYMENT_METHODS,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  BILLING_CATEGORIES,
  DISCOUNT_CONFIG,
  OVERDUE_CONFIG,
  REFUND_CONFIG,
  INSURANCE_CONFIG,
  AUDIT_CONFIG,
  API_BASE_URL,
  BILLING_API_ENDPOINTS,
  PAGINATION_CONFIG,
  SEARCH_CONFIG,
  FEATURE_FLAGS,
  formatCurrency,
  formatDisplayDate,
  formatDisplayDateTime,
});

export default BillingCoreConfig;