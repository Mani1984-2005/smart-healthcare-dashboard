// FILE PATH: src/utils/InventoryStorage.js
//
// Backend-ready storage abstraction for the Pharmacy Inventory module.
//
// WHY THIS PATTERN:
// Every function here returns the same shape it would if it were an async
// API call (a Promise resolving to data). Today it reads/writes localStorage
// synchronously wrapped in a Promise. Tomorrow, swap the internals of each
// function for a fetch() call to your real backend — nothing in the UI
// components (PharmacyInventoryPage, MedicineForm, etc.) needs to change,
// because they already call these functions with `await`.
//
// Storage key is namespaced "_v2" / "inventory" to avoid colliding with the
// Phase 1 PharmacyPage.jsx, which uses a different key ("pharmacy_medicines").

const MEDICINES_KEY = "pharmacy_inventory_v2";
const TRANSACTIONS_KEY = "pharmacy_inventory_transactions_v2";

// ─── Low-level helpers ──────────────────────────────────────────────────────

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`InventoryStorage: failed to read "${key}"`, err);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`InventoryStorage: failed to write "${key}"`, err);
    return false;
  }
}

function genId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

// ─── Medicine CRUD (Promise-based — ready for backend swap) ────────────────

/**
 * Get all medicines.
 * BACKEND SWAP: replace body with `return (await fetch('/api/medicines')).json();`
 */
export async function getMedicines() {
  return readJson(MEDICINES_KEY, []);
}

/**
 * Get a single medicine by ID.
 */
export async function getMedicineById(medicineId) {
  const all = readJson(MEDICINES_KEY, []);
  return all.find((m) => m.medicineId === medicineId) || null;
}

/**
 * Add a new medicine. Returns the created record (with generated ID/batch if missing).
 */
export async function addMedicine(medicine) {
  const all = readJson(MEDICINES_KEY, []);

  const record = {
    medicineId: medicine.medicineId || genId("MED"),
    name: medicine.name,
    category: medicine.category,
    batchNumber: medicine.batchNumber || genId("BATCH"),
    stockQuantity: Number(medicine.stockQuantity) || 0,
    unit: medicine.unit || "units",
    purchasePrice: Number(medicine.purchasePrice) || 0,
    sellingPrice: Number(medicine.sellingPrice) || 0,
    supplier: medicine.supplier || "",
    expiryDate: medicine.expiryDate || "",
    manufactureDate: medicine.manufactureDate || "",
    lowStockThreshold: Number(medicine.lowStockThreshold) || 10,
    status: medicine.status || "Available",
    barcode: medicine.barcode || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [...all, record];
  writeJson(MEDICINES_KEY, updated);
  return record;
}

/**
 * Update an existing medicine by ID. Returns the updated record, or null if not found.
 */
export async function updateMedicine(medicineId, changes) {
  const all = readJson(MEDICINES_KEY, []);
  let updatedRecord = null;

  const updated = all.map((m) => {
    if (m.medicineId === medicineId) {
      updatedRecord = { ...m, ...changes, updatedAt: new Date().toISOString() };
      return updatedRecord;
    }
    return m;
  });

  writeJson(MEDICINES_KEY, updated);
  return updatedRecord;
}

/**
 * Delete a medicine by ID. Returns true if deleted.
 */
export async function deleteMedicine(medicineId) {
  const all = readJson(MEDICINES_KEY, []);
  const updated = all.filter((m) => m.medicineId !== medicineId);
  writeJson(MEDICINES_KEY, updated);
  return updated.length !== all.length;
}

/**
 * Find a medicine by its barcode value. Used after a successful scan.
 */
export async function findMedicineByBarcode(barcode) {
  const all = readJson(MEDICINES_KEY, []);
  return all.find((m) => m.barcode === barcode) || null;
}

// ─── Stock movement (Purchase / Sale) ───────────────────────────────────────

/**
 * Record a purchase (stock IN) and increase the medicine's stock quantity.
 * Also logs a transaction entry for audit history.
 */
export async function recordPurchase({ medicineId, quantity, unitCost, supplier, notes }) {
  const medicine = await getMedicineById(medicineId);
  if (!medicine) throw new Error(`Medicine ${medicineId} not found.`);

  const newQty = Number(medicine.stockQuantity) + Number(quantity);
  await updateMedicine(medicineId, { stockQuantity: newQty });

  const txn = {
    transactionId: genId("PUR"),
    type: "purchase",
    medicineId,
    medicineName: medicine.name,
    quantity: Number(quantity),
    unitCost: Number(unitCost) || medicine.purchasePrice,
    supplier: supplier || medicine.supplier,
    notes: notes || "",
    date: new Date().toISOString(),
  };

  const txns = readJson(TRANSACTIONS_KEY, []);
  writeJson(TRANSACTIONS_KEY, [txn, ...txns]);

  return { medicine: await getMedicineById(medicineId), transaction: txn };
}

/**
 * Record a sale/issue (stock OUT). Throws if insufficient stock.
 */
export async function recordSale({ medicineId, quantity, soldTo, notes }) {
  const medicine = await getMedicineById(medicineId);
  if (!medicine) throw new Error(`Medicine ${medicineId} not found.`);

  const qty = Number(quantity);
  if (qty > Number(medicine.stockQuantity)) {
    throw new Error(`Insufficient stock. Available: ${medicine.stockQuantity}, Requested: ${qty}`);
  }

  const newQty = Number(medicine.stockQuantity) - qty;
  const newStatus = newQty === 0 ? "Out of Stock" : medicine.status;
  await updateMedicine(medicineId, { stockQuantity: newQty, status: newStatus });

  const txn = {
    transactionId: genId("SALE"),
    type: "sale",
    medicineId,
    medicineName: medicine.name,
    quantity: qty,
    unitPrice: medicine.sellingPrice,
    soldTo: soldTo || "Walk-in",
    notes: notes || "",
    date: new Date().toISOString(),
  };

  const txns = readJson(TRANSACTIONS_KEY, []);
  writeJson(TRANSACTIONS_KEY, [txn, ...txns]);

  return { medicine: await getMedicineById(medicineId), transaction: txn };
}

/**
 * Get all transactions, optionally filtered by medicineId or type.
 */
export async function getTransactions({ medicineId, type } = {}) {
  let txns = readJson(TRANSACTIONS_KEY, []);
  if (medicineId) txns = txns.filter((t) => t.medicineId === medicineId);
  if (type) txns = txns.filter((t) => t.type === type);
  return txns;
}

// ─── Derived / computed helpers (used by dashboard cards) ──────────────────

export function isLowStock(medicine) {
  const threshold = Number(medicine.lowStockThreshold) || 10;
  return Number(medicine.stockQuantity) > 0 && Number(medicine.stockQuantity) <= threshold;
}

export function isOutOfStock(medicine) {
  return Number(medicine.stockQuantity) === 0;
}

export function isExpired(medicine) {
  if (!medicine.expiryDate) return false;
  return medicine.expiryDate < todayIso();
}

/** Expiring within the next N days (default 30), but not yet expired. */
export function isExpiringSoon(medicine, days = 30) {
  if (!medicine.expiryDate) return false;
  if (isExpired(medicine)) return false;
  const expiry = new Date(medicine.expiryDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return expiry <= cutoff;
}

export function inventoryValue(medicine) {
  return Number(medicine.stockQuantity) * Number(medicine.purchasePrice || 0);
}

/**
 * Compute all dashboard summary numbers in one pass.
 */
export async function getDashboardSummary() {
  const medicines = await getMedicines();

  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;

  medicines.forEach((m) => {
    totalValue += inventoryValue(m);
    if (isLowStock(m)) lowStockCount++;
    if (isOutOfStock(m)) outOfStockCount++;
    if (isExpired(m)) expiredCount++;
    if (isExpiringSoon(m)) expiringSoonCount++;
  });

  return {
    totalMedicines: medicines.length,
    lowStockCount,
    outOfStockCount,
    expiredCount,
    expiringSoonCount,
    totalValue,
  };
}

export { todayIso, genId };