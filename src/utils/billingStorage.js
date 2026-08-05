// FILE PATH: src/utils/billingStorage.js
//
// Storage + business logic for the Phase 4 Billing Module.
// Key: "billing_v2" — completely separate from the Phase 2 "billing_invoices" key,
// so existing invoice data is never touched or overwritten.
//
// Architecture: Promise-wrapped localStorage so every function already
// matches the async/await shape of a real REST API. When you add a backend,
// replace only the inside of each function — nothing in the UI changes.

// ─── Config ───────────────────────────────────────────────────────────────────

const BILLS_KEY = "billing_v2";
const GST_RATE  = 0.18; // 18 % GST — toggle via applyGst flag per bill

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readBills() {
  try {
    const raw = localStorage.getItem(BILLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeBills(bills) {
  try {
    localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
    return true;
  } catch (e) {
    console.error("billingStorage: write failed", e);
    return false;
  }
}

export function generateBillId() {
  return "BILL-" + Date.now().toString().slice(-7);
}

// ─── Calculation helpers (pure functions — no side effects) ───────────────────

/**
 * Given the fee breakdown, compute subtotal, gst amount, and grand total.
 * Always returns numbers, never NaN.
 */
export function computeTotals({ consultationFee, medicineCharges, labCharges, otherCharges, discount, applyGst }) {
  const sub =
    Number(consultationFee  || 0) +
    Number(medicineCharges  || 0) +
    Number(labCharges       || 0) +
    Number(otherCharges     || 0);

  const discountAmt  = Math.max(0, Math.min(Number(discount || 0), sub));
  const taxable      = sub - discountAmt;
  const gstAmount    = applyGst ? parseFloat((taxable * GST_RATE).toFixed(2)) : 0;
  const grandTotal   = parseFloat((taxable + gstAmount).toFixed(2));

  return {
    subtotal:    parseFloat(sub.toFixed(2)),
    discountAmt: parseFloat(discountAmt.toFixed(2)),
    gstAmount,
    grandTotal,
  };
}

// ─── CRUD (Promise-based — swap body for fetch() to hit a real API) ───────────

/** Fetch all bills, newest first. */
export async function getBills() {
  return readBills();
}

/** Fetch one bill by ID. Returns null if not found. */
export async function getBillById(billId) {
  const bills = readBills();
  return bills.find((b) => b.billId === billId) || null;
}

/**
 * Create a new bill.
 * Accepts raw form data; calculates totals internally so the UI never
 * has to re-implement billing math.
 */
export async function createBill(formData) {
  const bills = readBills();

  const totals = computeTotals(formData);

  const bill = {
    billId:           formData.billId || generateBillId(),
    patientName:      formData.patientName.trim(),
    patientId:        formData.patientId?.trim() || "",
    doctorName:       formData.doctorName?.trim() || "",
    consultationFee:  Number(formData.consultationFee  || 0),
    medicineCharges:  Number(formData.medicineCharges  || 0),
    labCharges:       Number(formData.labCharges       || 0),
    otherCharges:     Number(formData.otherCharges     || 0),
    discount:         Number(formData.discount         || 0),
    applyGst:         Boolean(formData.applyGst),
    paymentMode:      formData.paymentMode || "Cash",
    paymentStatus:    formData.paymentStatus || "Paid",
    notes:            formData.notes?.trim() || "",
    // Computed
    ...totals,
    // Timestamps
    createdAt:        new Date().toISOString(),
    billDate:         formData.billDate || new Date().toISOString().split("T")[0],
  };

  const updated = [bill, ...bills];
  writeBills(updated);
  return bill;
}

/** Update an existing bill (e.g. to change payment status). Re-computes totals. */
export async function updateBill(billId, changes) {
  const bills   = readBills();
  let updated   = null;

  const next = bills.map((b) => {
    if (b.billId !== billId) return b;
    const merged  = { ...b, ...changes };
    const totals  = computeTotals(merged);
    updated = { ...merged, ...totals, updatedAt: new Date().toISOString() };
    return updated;
  });

  writeBills(next);
  return updated;
}

/** Delete a bill permanently. Returns true if something was actually removed. */
export async function deleteBill(billId) {
  const bills   = readBills();
  const next    = bills.filter((b) => b.billId !== billId);
  writeBills(next);
  return next.length !== bills.length;
}

// ─── Dashboard summary (single-pass so it's O(n) not O(n×3)) ─────────────────

export async function getBillingSummary() {
  const bills = readBills();

  const todayStr  = new Date().toISOString().split("T")[0];
  const monthStr  = todayStr.slice(0, 7); // "YYYY-MM"

  let totalBills      = bills.length;
  let revenueToday    = 0;
  let revenueMonth    = 0;
  let revenueTotal    = 0;
  let unpaidCount     = 0;

  for (const b of bills) {
    revenueTotal += b.grandTotal || 0;
    if (b.paymentStatus !== "Paid") unpaidCount++;
    if (b.billDate === todayStr)          revenueToday += b.grandTotal || 0;
    if ((b.billDate || "").startsWith(monthStr)) revenueMonth += b.grandTotal || 0;
  }

  return {
    totalBills,
    revenueToday:  parseFloat(revenueToday.toFixed(2)),
    revenueMonth:  parseFloat(revenueMonth.toFixed(2)),
    revenueTotal:  parseFloat(revenueTotal.toFixed(2)),
    unpaidCount,
  };
}

export { GST_RATE };