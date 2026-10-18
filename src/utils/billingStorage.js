// FILE PATH: src/utils/billingStorage.js
// MediCare Pro — Enterprise Billing Storage & Business Logic (Phase 4 / 10/10 Enterprise Upgrade)

export const STORAGE_KEY = "billing_invoices";
export const BILLS_KEY = "billing_v2";
export const GST_RATE = 0.18; // 18% GST

export const DEFAULT_BILLS = [
  {
    billId: "INV-20261015-1042",
    patientName: "Ravi Kumar",
    patientId: "PAT-1001",
    doctorName: "Dr. Ananya Rao",
    billDate: "2026-10-14",
    consultationFee: 500,
    medicineCharges: 1200,
    labCharges: 850,
    otherCharges: 150,
    discount: 100,
    applyGst: true,
    paymentMode: "UPI",
    paymentStatus: "Paid",
    subtotal: 2700,
    discountAmt: 100,
    gstAmount: 468,
    grandTotal: 3068,
    grand: 3068,
    paidAmount: 3068,
    dueAmount: 0,
    version: 1,
    createdAt: "2026-10-14T10:30:00.000Z",
  },
  {
    billId: "INV-20261015-1088",
    patientName: "Sneha Patel",
    patientId: "PAT-1002",
    doctorName: "Dr. Rajesh Sharma",
    billDate: "2026-10-15",
    consultationFee: 800,
    medicineCharges: 2400,
    labCharges: 1500,
    otherCharges: 300,
    discount: 200,
    applyGst: true,
    paymentMode: "Insurance",
    paymentStatus: "Pending",
    subtotal: 5000,
    discountAmt: 200,
    gstAmount: 864,
    grandTotal: 5664,
    grand: 5664,
    paidAmount: 0,
    dueAmount: 5664,
    version: 1,
    createdAt: "2026-10-15T08:15:00.000Z",
  },
  {
    billId: "INV-20261015-1102",
    patientName: "Amit Singh",
    patientId: "PAT-1003",
    doctorName: "Dr. Vikram Seth",
    billDate: "2026-10-15",
    consultationFee: 600,
    medicineCharges: 750,
    labCharges: 0,
    otherCharges: 50,
    discount: 0,
    applyGst: false,
    paymentMode: "Card",
    paymentStatus: "Paid",
    subtotal: 1400,
    discountAmt: 0,
    gstAmount: 0,
    grandTotal: 1400,
    grand: 1400,
    paidAmount: 1400,
    dueAmount: 0,
    version: 1,
    createdAt: "2026-10-15T09:40:00.000Z",
  },
];

// ─── ID Generator ────────────────────────────────────────────────────────────

export function generateBillId() {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const safeNum = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ─── Calculation helpers (pure functions) ───────────────────────────────────

/**
 * Computes subtotal, discount, GST (18%), and grand total.
 * Handles single form object or legacy (charges, discountPct, gstPct) signature.
 */
export function computeTotals(firstArg, discountPctArg, gstPctArg) {
  let consultationFee = 0;
  let medicineCharges = 0;
  let labCharges = 0;
  let otherCharges = 0;
  let discountVal = 0;
  let applyGst = false;
  let gstPct = 0;

  if (firstArg && typeof firstArg === "object" && discountPctArg === undefined && gstPctArg === undefined) {
    const f = firstArg;
    consultationFee = safeNum(f.consultationFee);
    medicineCharges = safeNum(f.medicineCharges || f.pharmacyCharges);
    labCharges = safeNum(f.labCharges);
    otherCharges = safeNum(f.otherCharges || f.procedureCharges || f.roomCharges || f.nursingCharges || f.miscCharges);

    if (f.charges && typeof f.charges === "object") {
      const c = f.charges;
      consultationFee += safeNum(c.consultationFee);
      medicineCharges += safeNum(c.pharmacyCharges || c.medicineCharges);
      labCharges += safeNum(c.labCharges);
      otherCharges += safeNum(c.procedureCharges) + safeNum(c.roomCharges) + safeNum(c.nursingCharges) + safeNum(c.miscCharges);
    }

    discountVal = safeNum(f.discountAmt ?? f.discount);
    if (f.discountPct) {
      const rawSub = consultationFee + medicineCharges + labCharges + otherCharges;
      discountVal = (rawSub * safeNum(f.discountPct)) / 100;
    }
    applyGst = Boolean(f.applyGst || (safeNum(f.gstPct) > 0));
    gstPct = f.gstPct ? safeNum(f.gstPct) : (applyGst ? 18 : 0);
  } else {
    const charges = firstArg || {};
    consultationFee = safeNum(charges.consultationFee);
    medicineCharges = safeNum(charges.pharmacyCharges || charges.medicineCharges);
    labCharges = safeNum(charges.labCharges);
    otherCharges = safeNum(charges.procedureCharges) + safeNum(charges.roomCharges) + safeNum(charges.nursingCharges) + safeNum(charges.miscCharges || charges.otherCharges);

    const rawSub = Object.values(charges).reduce((s, v) => s + safeNum(v), 0);
    const sub = rawSub || (consultationFee + medicineCharges + labCharges + otherCharges);
    discountVal = (sub * safeNum(discountPctArg)) / 100;
    gstPct = safeNum(gstPctArg);
    applyGst = gstPct > 0;
  }

  const subtotal = consultationFee + medicineCharges + labCharges + otherCharges;
  const discountAmt = Math.max(0, Math.min(discountVal, subtotal));
  const taxable = subtotal - discountAmt;
  const gstAmount = parseFloat((taxable * (gstPct > 0 ? gstPct / 100 : 0)).toFixed(2));
  const grandTotal = parseFloat((taxable + gstAmount).toFixed(2));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: discountAmt,
    discountAmt,
    taxable: parseFloat(taxable.toFixed(2)),
    gst: gstAmount,
    gstAmount,
    grand: grandTotal,
    grandTotal,
  };
}

/**
 * Resolves paid amount and due balance based on payment status.
 */
export function resolvePayment(status, grandTotal, paidInput) {
  const grand = safeNum(grandTotal);
  if (status === "Paid") return { paidAmount: grand, dueAmount: 0, paid: grand, due: 0 };
  if (status === "Refunded") return { paidAmount: 0, dueAmount: 0, paid: 0, due: 0 };
  if (status === "Partial") {
    const paid = Math.min(grand, Math.max(0, safeNum(paidInput)));
    const due = Math.max(0, grand - paid);
    return { paidAmount: paid, dueAmount: due, paid, due };
  }
  return { paidAmount: 0, dueAmount: grand, paid: 0, due: grand };
}

/**
 * Validates bill safety & business constraints.
 */
export function validateBill(bill) {
  if (!bill.patientName?.trim()) {
    throw new Error("Patient name is required");
  }

  const total = safeNum(bill.grandTotal ?? bill.grand);
  if (total <= 0) {
    throw new Error("Invoice must have valid charges");
  }

  const due = safeNum(bill.dueAmount ?? bill.due);
  if (bill.paymentStatus === "Paid" && due > 0) {
    throw new Error("Paid invoice cannot have due amount");
  }
}

/**
 * Standardizes currency formatting in Indian Rupees (₹ / INR).
 */
export function fmt(n) {
  const val = safeNum(n);
  return "₹" + val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Unified Storage Layer ───────────────────────────────────────────────────

export const billingAPI = {
  async getAll() {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BILLS));
      }
      return DEFAULT_BILLS;
    } catch {
      return DEFAULT_BILLS;
    }
  },

  async create(invoice) {
    const data = await this.getAll();
    const updated = [invoice, ...data.filter((b) => b.billId !== invoice.billId)];
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return invoice;
  },

  async update(id, patch) {
    const data = await this.getAll();
    const updated = data.map((bill) =>
      bill.billId === id ? { ...bill, ...patch } : bill
    );
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return patch;
  },

  async remove(id) {
    const data = await this.getAll();
    const filtered = data.filter((bill) => bill.billId !== id);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },
};

// Legacy compatibility exports
export const getBills = () => billingAPI.getAll();
export const getBillById = async (id) => {
  const bills = await billingAPI.getAll();
  return bills.find((b) => b.billId === id) || null;
};
export const createBill = (formData) => billingAPI.create({ ...formData, ...computeTotals(formData) });
export const updateBill = (id, changes) => billingAPI.update(id, changes);
export const deleteBill = (id) => billingAPI.remove(id);
export const getBillingSummary = async () => {
  const bills = await billingAPI.getAll();
  let revenueTotal = 0;
  let unpaidCount = 0;
  for (const b of bills) {
    revenueTotal += Number(b.grandTotal || b.grand || 0);
    if (b.paymentStatus !== "Paid") unpaidCount++;
  }
  return {
    totalBills: bills.length,
    revenueTotal: parseFloat(revenueTotal.toFixed(2)),
    unpaidCount,
  };
};