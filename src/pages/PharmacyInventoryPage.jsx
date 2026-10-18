// FILE PATH: src/pages/PharmacyInventoryPage.jsx
//
// Enterprise Pharmacy Inventory Module — Phase 3, MediCare Pro
//
// This is a NEW, separate page from the Phase 1 PharmacyPage.jsx.
// It uses its own storage key (pharmacy_inventory_v2) via InventoryStorage.js,
// so it will NOT conflict with or overwrite Phase 1 pharmacy data.
//
// Composes: MedicineForm, InventoryTable, StockAlertPanel, InventoryStorage.js
//
// ⚠️ ROUTING: This file does not register itself with React Router.
// A separate routing patch will be provided once you share your current
// App.jsx and Navbar.jsx, per your instructions.

import { useState, useEffect, useCallback } from "react";
import MedicineForm from "../components/MedicineForm";
import InventoryTable from "../components/InventoryTable";
import StockAlertPanel from "../components/StockAlertPanel";
import {
  getMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  findMedicineByBarcode,
  recordPurchase,
  recordSale,
  getDashboardSummary,
  isLowStock,
  isOutOfStock,
  isExpired,
  isExpiringSoon,
} from "../utils/InventoryStorage";

// ─── Toast (self-contained, matches style of other modules) ───────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { success: "bg-green-500", error: "bg-red-500", warning: "bg-yellow-500" };

  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white shadow-lg flex items-center gap-3 ${colors[type] || "bg-gray-700"}`}>
      <span>{message}</span>
      <button onClick={onClose} className="font-bold text-xl leading-none">×</button>
    </div>
  );
}

// ─── Purchase / Sale quick-entry modal ─────────────────────────────────────────

function StockMovementModal({ medicine, mode, onConfirm, onCancel }) {
  const [quantity, setQuantity] = useState("");
  const [partyName, setPartyName] = useState(""); // supplier (purchase) or soldTo (sale)
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const isPurchase = mode === "purchase";

  function handleConfirm() {
    const qty = Number(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      setError("Enter a valid quantity greater than 0.");
      return;
    }
    if (!isPurchase && qty > Number(medicine.stockQuantity)) {
      setError(`Cannot issue more than available stock (${medicine.stockQuantity}).`);
      return;
    }
    onConfirm({ quantity: qty, partyName, notes });
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-bold text-gray-800">
            {isPurchase ? "📥 Record Purchase (Stock In)" : "📤 Issue / Sell Stock"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{medicine.name} — Current stock: {medicine.stockQuantity} {medicine.unit}</p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Quantity *</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(""); }}
              placeholder={`e.g. ${isPurchase ? "50" : "5"}`}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              {isPurchase ? "Supplier (optional)" : "Issued To (optional)"}
            </label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder={isPurchase ? medicine.supplier || "Supplier name" : "Patient / Department"}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition shadow ${
              isPurchase ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {isPurchase ? "Confirm Purchase" : "Confirm Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function PharmacyInventoryPage() {
  const [medicines, setMedicines] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("add"); // "add" | "edit"
  const [editingMedicine, setEditingMedicine] = useState(null);

  // Stock movement modal state
  const [movementMedicine, setMovementMedicine] = useState(null);
  const [movementMode, setMovementMode] = useState(null); // "purchase" | "sale"

  // QA Checklist state
  const [qaOpen, setQaOpen] = useState(true);
  const [qaChecked, setQaChecked] = useState(() => {
    try {
      const saved = localStorage.getItem("inventory_qa_checklist");
      return saved ? JSON.parse(saved) : {
        addMedicine: false,
        stockIn: false,
        stockOut: false,
        lowStock: false,
        expiryAlert: false,
      };
    } catch {
      return {
        addMedicine: false,
        stockIn: false,
        stockOut: false,
        lowStock: false,
        expiryAlert: false,
      };
    }
  });

  useEffect(() => {
    localStorage.setItem("inventory_qa_checklist", JSON.stringify(qaChecked));
  }, [qaChecked]);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    setLoading(true);
    const [allMedicines, dashboardSummary] = await Promise.all([
      getMedicines(),
      getDashboardSummary(),
    ]);
    setMedicines(allMedicines);
    setSummary(dashboardSummary);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  // ── Add / Edit handlers ──────────────────────────────────────────────────────

  function openAddForm() {
    setFormMode("add");
    setEditingMedicine(null);
    setShowForm(true);
  }

  function openEditForm(medicine) {
    setFormMode("edit");
    setEditingMedicine(medicine);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingMedicine(null);
  }

  async function handleFormSubmit(formData) {
    try {
      if (formMode === "edit") {
        await updateMedicine(editingMedicine.medicineId, formData);
        showToast("Medicine updated successfully.", "success");
      } else {
        // Prevent duplicate barcode entries (if barcode was scanned/entered)
        if (formData.barcode) {
          const existing = await findMedicineByBarcode(formData.barcode);
          if (existing) {
            showToast(`A medicine with this barcode already exists: ${existing.name}`, "error");
            return;
          }
        }
        await addMedicine(formData);
        showToast("Medicine added successfully.", "success");
      }
      closeForm();
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast("Something went wrong while saving. Please try again.", "error");
    }
  }

  async function handleDelete(medicineId) {
    if (!window.confirm("Delete this medicine? This cannot be undone.")) return;
    try {
      await deleteMedicine(medicineId);
      showToast("Medicine deleted.", "warning");
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete medicine.", "error");
    }
  }

  // ── Purchase / Sale handlers ─────────────────────────────────────────────────

  function openPurchaseModal(medicine) {
    setMovementMedicine(medicine);
    setMovementMode("purchase");
  }

  function openSaleModal(medicine) {
    setMovementMedicine(medicine);
    setMovementMode("sale");
  }

  function closeMovementModal() {
    setMovementMedicine(null);
    setMovementMode(null);
  }

  async function handleMovementConfirm({ quantity, partyName, notes }) {
    try {
      if (movementMode === "purchase") {
        await recordPurchase({
          medicineId: movementMedicine.medicineId,
          quantity,
          supplier: partyName,
          notes,
        });
        showToast(`Stock increased by ${quantity} ${movementMedicine.unit}.`, "success");
      } else {
        await recordSale({
          medicineId: movementMedicine.medicineId,
          quantity,
          soldTo: partyName,
          notes,
        });
        showToast(`${quantity} ${movementMedicine.unit} issued successfully.`, "success");
      }
      closeMovementModal();
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Stock movement failed.", "error");
    }
  }

  // ── Barcode lookup passed into MedicineForm ──────────────────────────────────

  async function handleBarcodeLookup(barcode) {
    return findMedicineByBarcode(barcode);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading inventory…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏭 Pharmacy Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise stock, batch, and expiry management.</p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition shadow"
        >
          + Add Medicine
        </button>
      </div>

      {/* QA Checklist Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div 
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setQaOpen(!qaOpen)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <span className="font-bold text-gray-700 text-sm">Inventory QA Testing Checklist</span>
          </div>
          <span className="text-gray-400 font-bold text-sm">
            {qaOpen ? "Hide ▽" : "Show ▷"}
          </span>
        </div>

        {qaOpen && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-gray-100">
            {[
              { key: "addMedicine", label: "Add medicine tested" },
              { key: "stockIn", label: "Stock in tested" },
              { key: "stockOut", label: "Stock out tested" },
              { key: "lowStock", label: "Low stock alert tested" },
              { key: "expiryAlert", label: "Expiry alert tested" },
            ].map((item) => (
              <label 
                key={item.key} 
                className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 transition"
              >
                <input
                  type="checkbox"
                  checked={qaChecked[item.key]}
                  onChange={() => setQaChecked(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className={`text-xs select-none ${qaChecked[item.key] ? "line-through text-gray-400" : "text-gray-600 font-medium"}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard cards + alerts */}
      <StockAlertPanel summary={summary} />

      {/* Inventory table */}
      <InventoryTable
        medicines={medicines}
        onEdit={openEditForm}
        onDelete={handleDelete}
        onPurchase={openPurchaseModal}
        onSale={openSaleModal}
        isLowStock={isLowStock}
        isOutOfStock={isOutOfStock}
        isExpired={isExpired}
        isExpiringSoon={isExpiringSoon}
      />

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {formMode === "edit" ? "✏️ Edit Medicine" : "➕ Add Medicine"}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5">
              <MedicineForm
                mode={formMode}
                initialData={editingMedicine}
                onSubmit={handleFormSubmit}
                onCancel={closeForm}
                onLookupBarcode={handleBarcodeLookup}
              />
            </div>
          </div>
        </div>
      )}

      {/* Purchase / Sale Modal */}
      {movementMedicine && (
        <StockMovementModal
          medicine={movementMedicine}
          mode={movementMode}
          onConfirm={handleMovementConfirm}
          onCancel={closeMovementModal}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}