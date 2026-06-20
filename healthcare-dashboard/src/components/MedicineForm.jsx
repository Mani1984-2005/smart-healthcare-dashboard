// FILE PATH: src/components/MedicineForm.jsx
//
// Add / Edit form for the Enterprise Pharmacy Inventory module.
// Integrates the existing BarcodeScanner component to auto-fill fields
// when a medicine's barcode is recognized from a previous scan/save.
//
// PROPS:
//   mode: "add" | "edit"
//   initialData: medicine object (required for edit mode)
//   onSubmit(formData): called with validated form data on save
//   onCancel(): called when the form is dismissed
//   onLookupBarcode(barcode): async fn — should return an existing medicine
//                              record (or null) for the scanned barcode.
//                              Passed in from the parent page so this form
//                              stays decoupled from the storage layer.
//
// ⚠️ ASSUMES BarcodeScanner.jsx exports:
//   export default function BarcodeScanner({ onScan, onClose, label })
// If your actual component signature differs, adjust the <BarcodeScanner />
// usage near the bottom of this file accordingly.

import { useState, useEffect } from "react";
import BarcodeScanner from "./BarcodeScanner";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Antibiotic", "Analgesic", "Antiviral", "Antifungal", "Antihistamine",
  "Cardiovascular", "Diabetes", "Vitamins & Supplements", "Respiratory", "Other",
];

const UNITS = ["units", "tablets", "capsules", "bottles", "vials", "strips", "boxes", "ml", "mg"];

const STATUS_OPTIONS = ["Available", "Out of Stock", "Discontinued"];

const emptyForm = {
  medicineId: "",
  name: "",
  category: "",
  batchNumber: "",
  stockQuantity: "",
  unit: "units",
  purchasePrice: "",
  sellingPrice: "",
  supplier: "",
  expiryDate: "",
  manufactureDate: "",
  lowStockThreshold: "10",
  status: "Available",
  barcode: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MedicineForm({ mode = "add", initialData, onSubmit, onCancel, onLookupBarcode }) {
  const [form, setForm] = useState(emptyForm);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState(null); // { text, type }
  const [errors, setErrors] = useState({});

  // Load initial data when editing
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setForm({ ...emptyForm, ...initialData });
    } else {
      setForm(emptyForm);
    }
  }, [mode, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error as user edits
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  // ── Barcode scan handling ────────────────────────────────────────────────────

  async function handleScanResult(scannedCode) {
    setShowScanner(false);
    setForm((prev) => ({ ...prev, barcode: scannedCode }));

    // If the parent gave us a lookup function, try to auto-fill from a
    // previously saved medicine that shares this barcode.
    if (onLookupBarcode) {
      try {
        const existing = await onLookupBarcode(scannedCode);
        if (existing) {
          setForm((prev) => ({
            ...prev,
            // Keep the new barcode + stock-specific fields fresh,
            // but pull in the descriptive fields from the matched record.
            name: existing.name,
            category: existing.category,
            unit: existing.unit,
            purchasePrice: existing.purchasePrice,
            sellingPrice: existing.sellingPrice,
            supplier: existing.supplier,
            lowStockThreshold: existing.lowStockThreshold,
            barcode: scannedCode,
          }));
          setScanMessage({ text: `✅ Matched existing medicine: ${existing.name}. Details auto-filled.`, type: "success" });
        } else {
          setScanMessage({ text: "ℹ️ New barcode — no existing match. Please fill in details manually.", type: "info" });
        }
      } catch {
        setScanMessage({ text: "Barcode captured, but lookup failed.", type: "warning" });
      }
    } else {
      setScanMessage({ text: "Barcode captured.", type: "success" });
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────────

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Medicine name is required.";
    if (!form.category) errs.category = "Category is required.";
    if (form.stockQuantity === "" || isNaN(form.stockQuantity) || Number(form.stockQuantity) < 0)
      errs.stockQuantity = "Enter a valid non-negative quantity.";
    if (form.purchasePrice === "" || isNaN(form.purchasePrice) || Number(form.purchasePrice) < 0)
      errs.purchasePrice = "Enter a valid non-negative purchase price.";
    if (form.sellingPrice === "" || isNaN(form.sellingPrice) || Number(form.sellingPrice) < 0)
      errs.sellingPrice = "Enter a valid non-negative selling price.";
    if (!form.supplier.trim()) errs.supplier = "Supplier is required.";
    if (!form.expiryDate) errs.expiryDate = "Expiry date is required.";
    if (form.lowStockThreshold === "" || isNaN(form.lowStockThreshold) || Number(form.lowStockThreshold) < 0)
      errs.lowStockThreshold = "Enter a valid low-stock threshold.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  return (
    <div className="space-y-5">
      {/* ── Barcode Scan Section ─────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Barcode</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.barcode ? (
                <span className="font-mono text-gray-600">{form.barcode}</span>
              ) : (
                "No barcode scanned yet"
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
          >
            📷 Scan Barcode
          </button>
        </div>
        {scanMessage && (
          <p className={`text-xs mt-2 ${
            scanMessage.type === "success" ? "text-green-600" :
            scanMessage.type === "warning" ? "text-yellow-600" : "text-blue-600"
          }`}>
            {scanMessage.text}
          </p>
        )}
      </div>

      {/* ── Form Fields ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Medicine ID"
            name="medicineId"
            value={form.medicineId}
            disabled
            placeholder="Auto-generated on save"
          />
          <Field
            label="Medicine Name *"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Paracetamol 500mg"
            error={errors.name}
          />

          <SelectField
            label="Category *"
            name="category"
            value={form.category}
            onChange={handleChange}
            options={CATEGORIES}
            placeholder="Select category…"
            error={errors.category}
          />
          <Field
            label="Batch Number"
            name="batchNumber"
            value={form.batchNumber}
            onChange={handleChange}
            placeholder="Auto-generated if left blank"
          />

          <Field
            label="Stock Quantity *"
            name="stockQuantity"
            type="number"
            min="0"
            value={form.stockQuantity}
            onChange={handleChange}
            placeholder="e.g. 100"
            error={errors.stockQuantity}
          />
          <SelectField
            label="Unit"
            name="unit"
            value={form.unit}
            onChange={handleChange}
            options={UNITS}
          />

          <Field
            label="Purchase Price (₹) *"
            name="purchasePrice"
            type="number"
            min="0"
            step="0.01"
            value={form.purchasePrice}
            onChange={handleChange}
            placeholder="Cost per unit"
            error={errors.purchasePrice}
          />
          <Field
            label="Selling Price (₹) *"
            name="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            value={form.sellingPrice}
            onChange={handleChange}
            placeholder="Price per unit"
            error={errors.sellingPrice}
          />

          <Field
            label="Supplier *"
            name="supplier"
            value={form.supplier}
            onChange={handleChange}
            placeholder="e.g. Sun Pharma"
            error={errors.supplier}
          />
          <SelectField
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={STATUS_OPTIONS}
          />

          <Field
            label="Manufacture Date"
            name="manufactureDate"
            type="date"
            value={form.manufactureDate}
            onChange={handleChange}
          />
          <Field
            label="Expiry Date *"
            name="expiryDate"
            type="date"
            value={form.expiryDate}
            onChange={handleChange}
            error={errors.expiryDate}
          />

          <Field
            label="Low Stock Threshold *"
            name="lowStockThreshold"
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={handleChange}
            placeholder="Alert when stock falls below this"
            error={errors.lowStockThreshold}
          />
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow"
          >
            {mode === "edit" ? "Save Changes" : "Add Medicine"}
          </button>
        </div>
      </form>

      {/* ── Barcode Scanner Modal ───────────────────────────────────────── */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
          label="Scan Medicine Barcode"
        />
      )}
    </div>
  );
}

// ─── Reusable field components ─────────────────────────────────────────────────

function Field({ label, name, value, onChange, type = "text", placeholder, disabled, min, step, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-400"
        } ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-400"
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}