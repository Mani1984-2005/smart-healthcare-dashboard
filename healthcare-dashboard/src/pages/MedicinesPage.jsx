// src/pages/MedicinesPage.jsx
// MediCare Pro — Enterprise Medicines Catalogue & Inventory Management
// Upgrade: Advanced search, enterprise table, rich modal, future-ready architecture

import { useState, useMemo, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharmacy_medicines";

const CATEGORIES = [
  "All",
  "Antibiotic",
  "Analgesic",
  "Antiviral",
  "Antifungal",
  "Antihistamine",
  "Cardiovascular",
  "Diabetes",
  "Vitamins & Supplements",
  "Respiratory",
  "Gastrointestinal",
  "Neurological",
  "Oncology",
  "Dermatology",
  "Ophthalmology",
  "Other",
];

const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Ointment",
  "Drops",
  "Inhaler",
  "Patch",
  "Suppository",
  "Powder",
  "Suspension",
  "Gel",
  "Lotion",
  "Spray",
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "expiry_asc", label: "Expiry (Earliest)" },
  { value: "expiry_desc", label: "Expiry (Latest)" },
  { value: "stock_asc", label: "Stock (Low–High)" },
  { value: "stock_desc", label: "Stock (High–Low)" },
  { value: "price_asc", label: "Price (Low–High)" },
  { value: "price_desc", label: "Price (High–Low)" },
];

const STATUS_FILTER_OPTIONS = ["All", "Available", "Low Stock", "Out of Stock", "Expired", "Expiring Soon"];

const LOW_STOCK_THRESHOLD = 10;
const EXPIRY_WARNING_DAYS = 30;

// ─── Helper Functions ──────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(todayStr());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStockStatus(medicine) {
  const qty = Number(medicine.stockQuantity ?? medicine.quantity ?? 0);
  const days = daysUntilExpiry(medicine.expiryDate);
  if (days !== null && days < 0) return "Expired";
  if (days !== null && days <= EXPIRY_WARNING_DAYS) return "Expiring Soon";
  if (qty === 0) return "Out of Stock";
  if (qty <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "Available";
}

function formatCurrency(val) {
  const n = Number(val);
  if (isNaN(n)) return "—";
  return `₹${n.toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function calcProfit(medicine) {
  const sell = Number(medicine.sellingPrice ?? medicine.price ?? 0);
  const buy = Number(medicine.purchasePrice ?? 0);
  if (!buy || !sell) return null;
  return sell - buy;
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Low Stock": "bg-amber-50 text-amber-700 border border-amber-200",
  "Out of Stock": "bg-red-50 text-red-700 border border-red-200",
  Expired: "bg-rose-100 text-rose-700 border border-rose-300",
  "Expiring Soon": "bg-orange-50 text-orange-700 border border-orange-200",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Empty Form Template ───────────────────────────────────────────────────────

const emptyMedicineForm = {
  medicineId: "",
  name: "",
  genericName: "",
  brand: "",
  manufacturer: "",
  category: "",
  dosageForm: "",
  strength: "",
  packSize: "",
  batchNumber: "",
  manufacturingDate: "",
  expiryDate: "",
  purchasePrice: "",
  sellingPrice: "",
  mrp: "",
  gst: "",
  supplier: "",
  stockQuantity: "",
  minimumStock: "",
  storageInstructions: "",
  barcode: "",
  qrCode: "",
  notes: "",
  status: "Available",
};

// ─── PDF Export ────────────────────────────────────────────────────────────────

function exportMedicinePDF(medicine) {
  const doc = new jsPDF();
  const status = getStockStatus(medicine);

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MediCare Pro", 20, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Pharmacy Medicine Report", 20, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 130, 28);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(medicine.name || "—", 20, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${medicine.genericName || ""} | ${medicine.brand || ""} | ${medicine.manufacturer || ""}`, 20, 60);

  const fields = [
    ["Medicine ID", medicine.medicineId],
    ["Generic Name", medicine.genericName],
    ["Brand", medicine.brand],
    ["Manufacturer", medicine.manufacturer],
    ["Category", medicine.category],
    ["Dosage Form", medicine.dosageForm],
    ["Strength", medicine.strength],
    ["Pack Size", medicine.packSize],
    ["Batch Number", medicine.batchNumber],
    ["Manufacturing Date", formatDate(medicine.manufacturingDate)],
    ["Expiry Date", formatDate(medicine.expiryDate)],
    ["Purchase Price", formatCurrency(medicine.purchasePrice)],
    ["Selling Price", formatCurrency(medicine.sellingPrice)],
    ["MRP", formatCurrency(medicine.mrp)],
    ["GST (%)", medicine.gst ? `${medicine.gst}%` : "—"],
    ["Supplier", medicine.supplier],
    ["Stock Quantity", medicine.stockQuantity ?? medicine.quantity ?? "—"],
    ["Minimum Stock", medicine.minimumStock || "—"],
    ["Status", status],
    ["Storage Instructions", medicine.storageInstructions || "—"],
    ["Notes", medicine.notes || "—"],
  ];

  let y = 72;
  doc.setFontSize(9);
  fields.forEach(([k, v], i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(18, y - 4, 174, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(k, 20, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(String(v || "—"), 90, y + 2);
    y += 9;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer-generated pharmacy inventory report. MediCare Pro.", 20, 285);

  doc.save(`${medicine.medicineId || "medicine"}_report.pdf`);
}


// ─── Sub-components ────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-52">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm
          focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SelectFilter({ value, onChange, options, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-700"
    >
      {options.map((opt) => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  const colorMap = {
    teal:   "from-teal-500 to-teal-600",
    amber:  "from-amber-500 to-amber-600",
    red:    "from-red-500 to-red-600",
    orange: "from-orange-500 to-orange-600",
    slate:  "from-slate-500 to-slate-600",
    violet: "from-violet-500 to-violet-600",
    emerald: "from-emerald-500 to-emerald-600",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`bg-gradient-to-r ${colorMap[color] || colorMap.teal} p-4`}>
        <div className="flex items-center justify-between">
          <span className="text-white text-opacity-90 text-2xl">{icon}</span>
          <span className="text-white font-bold text-2xl leading-tight">{value}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-slate-700 text-sm font-semibold">{label}</p>
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AlertBanner({ type, message, onDismiss }) {
  const styles = {
    warning: "bg-amber-50 border-amber-400 text-amber-800",
    error:   "bg-red-50 border-red-400 text-red-800",
    info:    "bg-teal-50 border-teal-400 text-teal-800",
  };
  return (
    <div className={`flex items-center justify-between border-l-4 px-4 py-3 rounded-lg mb-3 text-sm ${styles[type]}`}>
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-4 opacity-60 hover:opacity-100 font-bold text-lg leading-none">×</button>
      )}
    </div>
  );
}

function EmptyState({ search, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-slate-600 font-semibold text-base mb-1">No medicines found</p>
      <p className="text-slate-400 text-sm mb-4">
        {search ? `No results for "${search}". Try a different search.` : "Adjust your filters or add a new medicine."}
      </p>
      {search && (
        <button
          onClick={onClear}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition"
        >
          Clear Search
        </button>
      )}
    </div>
  );
}

// ─── Medicine Detail Modal ─────────────────────────────────────────────────────

function MedicineDetailModal({ medicine, onClose, onEdit, onExport }) {
  const status = getStockStatus(medicine);
  const profit = calcProfit(medicine);
  const days = daysUntilExpiry(medicine.expiryDate);

  const sections = [
    {
      title: "Identification",
      fields: [
        ["Medicine ID", medicine.medicineId],
        ["Medicine Name", medicine.name],
        ["Generic Name", medicine.genericName],
        ["Brand", medicine.brand],
        ["Manufacturer", medicine.manufacturer],
        ["Batch Number", medicine.batchNumber],
        ["Barcode", medicine.barcode || "—"],
        ["QR Code", medicine.qrCode || "—"],
      ],
    },
    {
      title: "Classification",
      fields: [
        ["Category", medicine.category],
        ["Dosage Form", medicine.dosageForm],
        ["Strength", medicine.strength],
        ["Pack Size", medicine.packSize],
      ],
    },
    {
      title: "Pricing",
      fields: [
        ["MRP", formatCurrency(medicine.mrp)],
        ["Purchase Price", formatCurrency(medicine.purchasePrice)],
        ["Selling Price", formatCurrency(medicine.sellingPrice ?? medicine.price)],
        ["GST", medicine.gst ? `${medicine.gst}%` : "—"],
        ["Profit per Unit", profit !== null ? formatCurrency(profit) : "—"],
      ],
    },
    {
      title: "Stock & Dates",
      fields: [
        ["Stock Quantity", medicine.stockQuantity ?? medicine.quantity ?? "—"],
        ["Minimum Stock", medicine.minimumStock || "—"],
        ["Manufacturing Date", formatDate(medicine.manufacturingDate)],
        ["Expiry Date", formatDate(medicine.expiryDate)],
        ["Days to Expiry", days !== null ? (days < 0 ? "Expired" : `${days} days`) : "—"],
        ["Status", status],
      ],
    },
    {
      title: "Supply & Storage",
      fields: [
        ["Supplier", medicine.supplier],
        ["Storage Instructions", medicine.storageInstructions || "—"],
        ["Notes", medicine.notes || "—"],
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">{medicine.name || "Medicine Details"}</h2>
            <p className="text-teal-200 text-sm mt-0.5">
              {medicine.genericName && <span>{medicine.genericName} · </span>}
              {medicine.brand && <span>{medicine.brand} · </span>}
              {medicine.manufacturer}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <button onClick={onClose} className="text-teal-200 hover:text-white text-2xl leading-none ml-2">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{section.title}</p>
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                {section.fields.map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex justify-between px-4 py-2.5 text-sm ${
                      i !== section.fields.length - 1 ? "border-b border-slate-100" : ""
                    }`}
                  >
                    <span className="text-slate-500 font-medium">{k}</span>
                    <span className="text-slate-800 text-right font-medium max-w-xs break-words">{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button
            onClick={() => exportUtils.pdf(medicine)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-200 text-violet-700 text-sm font-medium hover:bg-violet-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); onEdit(medicine); }}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition"
            >
              Edit Medicine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Medicine Modal ─────────────────────────────────────────────────

function FormField({ label, name, value, onChange, type = "text", placeholder, disabled, min, step, required, as, children }) {
  const inputClass = `w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 
    focus:ring-teal-500 focus:border-teal-500 transition-all bg-white
    ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {as === "select" ? (
        <select name={name} value={value} onChange={onChange} className={inputClass} disabled={disabled}>
          {children}
        </select>
      ) : as === "textarea" ? (
        <textarea
          name={name} value={value} onChange={onChange}
          placeholder={placeholder} rows={3}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled}
          min={min} step={step}
          className={inputClass}
        />
      )}
    </div>
  );
}

function MedicineFormModal({ form, editingId, onChange, onSubmit, onClose }) {
  const sections = [
    {
      title: "Basic Information",
      cols: 2,
      fields: [
        { label: "Medicine ID", name: "medicineId", placeholder: "e.g. MED-001", required: true, disabled: !!editingId },
        { label: "Medicine Name", name: "name", placeholder: "e.g. Paracetamol 500mg", required: true },
        { label: "Generic Name", name: "genericName", placeholder: "e.g. Acetaminophen" },
        { label: "Brand Name", name: "brand", placeholder: "e.g. Calpol" },
        { label: "Manufacturer", name: "manufacturer", placeholder: "e.g. GSK India" },
        { label: "Supplier", name: "supplier", placeholder: "e.g. Sun Pharma Distributors", required: true },
      ],
    },
    {
      title: "Classification",
      cols: 3,
      fields: [
        {
          label: "Category", name: "category", as: "select", required: true,
          options: ["", ...CATEGORIES.filter((c) => c !== "All")],
          optionLabels: { "": "Select category…" },
        },
        {
          label: "Dosage Form", name: "dosageForm", as: "select",
          options: ["", ...DOSAGE_FORMS],
          optionLabels: { "": "Select form…" },
        },
        { label: "Strength", name: "strength", placeholder: "e.g. 500mg" },
        { label: "Pack Size", name: "packSize", placeholder: "e.g. 10 tablets/strip" },
        { label: "Batch Number", name: "batchNumber", placeholder: "e.g. BCH-2024-001" },
      ],
    },
    {
      title: "Dates",
      cols: 2,
      fields: [
        { label: "Manufacturing Date", name: "manufacturingDate", type: "date" },
        { label: "Expiry Date", name: "expiryDate", type: "date", required: true },
      ],
    },
    {
      title: "Pricing & Tax",
      cols: 3,
      fields: [
        { label: "MRP (₹)", name: "mrp", type: "number", placeholder: "0.00", min: "0", step: "0.01" },
        { label: "Purchase Price (₹)", name: "purchasePrice", type: "number", placeholder: "0.00", min: "0", step: "0.01" },
        { label: "Selling Price (₹)", name: "sellingPrice", type: "number", placeholder: "0.00", min: "0", step: "0.01", required: true },
        { label: "GST (%)", name: "gst", type: "number", placeholder: "e.g. 12", min: "0", max: "100", step: "0.1" },
      ],
    },
    {
      title: "Inventory",
      cols: 3,
      fields: [
        { label: "Stock Quantity", name: "stockQuantity", type: "number", placeholder: "0", min: "0", required: true },
        { label: "Minimum Stock Level", name: "minimumStock", type: "number", placeholder: "e.g. 10", min: "0" },
        {
          label: "Status", name: "status", as: "select",
          options: ["Available", "Out of Stock", "Discontinued"],
        },
      ],
    },
    {
      title: "Future Ready",
      cols: 2,
      fields: [
        { label: "Barcode (Future)", name: "barcode", placeholder: "Auto-populate via scanner" },
        { label: "QR Code (Future)", name: "qrCode", placeholder: "Auto-populate via scanner" },
      ],
    },
    {
      title: "Additional Details",
      cols: 1,
      fields: [
        { label: "Storage Instructions", name: "storageInstructions", as: "textarea", placeholder: "e.g. Store below 25°C in a cool, dry place." },
        { label: "Notes", name: "notes", as: "textarea", placeholder: "Internal notes…" },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">
              {editingId ? "Edit Medicine" : "Add New Medicine"}
            </h2>
            <p className="text-teal-200 text-xs mt-0.5">
              {editingId ? `Editing: ${editingId}` : "Fill in all required fields to register a new medicine"}
            </p>
          </div>
          <button onClick={onClose} className="text-teal-200 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="flex-1 h-px bg-slate-100" />
                {section.title}
                <span className="flex-1 h-px bg-slate-100" />
              </p>
              <div className={`grid grid-cols-1 sm:grid-cols-${section.cols} gap-4`}>
                {section.fields.map((field) => (
                  <FormField
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    value={form[field.name] ?? ""}
                    onChange={onChange}
                    type={field.type}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    required={field.required}
                    as={field.as}
                  >
                    {field.as === "select" && field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                       field.optionLabels?.[opt] ?? (opt || `Select ${field.label}`)
                      </option>
                    ))}
                  </FormField>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required fields</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition shadow-sm"
            >
              {editingId ? "Save Changes" : "Add Medicine"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ─────────────────────────────────────────────────────────────────

function MedicineTableRow({ medicine, onEdit, onDelete, onView }) {
  const status = getStockStatus(medicine);
  const days = daysUntilExpiry(medicine.expiryDate);
  const profit = calcProfit(medicine);
  const isExpiredRow = status === "Expired";
  const isLowRow = status === "Low Stock";
  const isExpiringSoon = status === "Expiring Soon";

  return (
    <tr
      className={`text-sm border-b border-slate-100 transition-colors
        ${isExpiredRow ? "bg-red-50 hover:bg-red-100" :
          isLowRow ? "bg-amber-50 hover:bg-amber-100" :
          isExpiringSoon ? "bg-orange-50 hover:bg-orange-100" :
          "hover:bg-slate-50"}`}
    >
      <td className="px-4 py-3 font-mono text-xs text-slate-500">{medicine.medicineId}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-800">{medicine.name}</p>
        {medicine.genericName && <p className="text-xs text-slate-400 mt-0.5">{medicine.genericName}</p>}
      </td>
      <td className="px-4 py-3 text-slate-500 text-xs">{medicine.genericName || "—"}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">{medicine.brand || "—"}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
          {medicine.category || "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500 text-xs">{medicine.strength || "—"}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">{medicine.manufacturer || "—"}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-500">{medicine.batchNumber || "—"}</td>
      <td className="px-4 py-3 text-xs">
        <span className={isExpiredRow ? "text-red-600 font-semibold" : isExpiringSoon ? "text-orange-600 font-medium" : "text-slate-600"}>
          {formatDate(medicine.expiryDate)}
        </span>
        {days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS && (
          <p className="text-orange-500 text-xs mt-0.5">{days}d left</p>
        )}
        {isExpiredRow && <p className="text-red-500 text-xs mt-0.5">Expired</p>}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`font-bold text-sm ${
          Number(medicine.stockQuantity ?? medicine.quantity) === 0 ? "text-red-600" :
          isLowRow ? "text-amber-600" : "text-slate-700"
        }`}>
          {medicine.stockQuantity ?? medicine.quantity ?? 0}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600 text-xs font-medium">{formatCurrency(medicine.mrp)}</td>
      <td className="px-4 py-3 text-slate-600 text-xs">{formatCurrency(medicine.purchasePrice)}</td>
      <td className="px-4 py-3 text-teal-700 text-xs font-semibold">
        {formatCurrency(medicine.sellingPrice ?? medicine.price)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onView(medicine)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-teal-700 border border-teal-200
              hover:bg-teal-50 transition"
          >
            View
          </button>
          <button
            onClick={() => exportUtils.pdf(medicine)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-violet-700 border border-violet-200
              hover:bg-violet-50 transition"
          >
            PDF
          </button>
          <button
            onClick={() => onEdit(medicine)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 border border-blue-200
              hover:bg-blue-50 transition"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(medicine.medicineId)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200
              hover:bg-red-50 transition"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  const styles = {
    success: "bg-emerald-600",
    error:   "bg-red-600",
    warning: "bg-amber-500",
    info:    "bg-teal-600",
  };
  return (
    <div className={`fixed bottom-6 right-6 z-[60] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-2xl
      flex items-center gap-3 animate-in slide-in-from-bottom-2 ${styles[type] || "bg-slate-700"}`}>
      <span>{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-lg leading-none">×</button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MedicinesPage({ darkMode }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [form, setForm] = useState(emptyMedicineForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [toast, setToast] = useState(null);

  // Search & filter state
  const [searchName, setSearchName] = useState("");
  const [searchGeneric, setSearchGeneric] = useState("");
  const [searchManufacturer, setSearchManufacturer] = useState("");
  const [searchBatch, setSearchBatch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("name_asc");
  const [showFilters, setShowFilters] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // ── Persistence ────────────────────────────────────────────────────────────
  const saveToStorage = useCallback((data) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openAddForm() {
    setForm(emptyMedicineForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(medicine) {
    setForm(medicine);
    setEditingId(medicine.medicineId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyMedicineForm);
    setEditingId(null);
    setShowForm(false);
  }

  function validate() {
    if (!form.medicineId?.trim()) return "Medicine ID is required.";
    if (!form.name?.trim()) return "Medicine Name is required.";
    if (!form.category) return "Category is required.";
    if (!form.supplier?.trim()) return "Supplier is required.";
    if (!form.expiryDate) return "Expiry Date is required.";
    const qty = Number(form.stockQuantity);
    if (isNaN(qty) || qty < 0) return "Stock Quantity must be a valid non-negative number.";
    const price = Number(form.sellingPrice ?? form.price);
    if (isNaN(price) || price < 0) return "Selling Price must be a valid non-negative number.";
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) { showToast(error, "error"); return; }

    // Normalise: map old fields to new fields for backward compat
    const record = {
      ...form,
      price: form.sellingPrice ?? form.price ?? "",
      quantity: form.stockQuantity ?? form.quantity ?? "",
    };

    if (editingId) {
      const updated = medicines.map((m) => m.medicineId === editingId ? record : m);
      setMedicines(updated);
      saveToStorage(updated);
      showToast("Medicine updated successfully.", "success");
    } else {
      if (medicines.find((m) => m.medicineId === form.medicineId.trim())) {
        showToast("A medicine with this ID already exists.", "error");
        return;
      }
      const updated = [...medicines, record];
      setMedicines(updated);
      saveToStorage(updated);
      showToast("Medicine added successfully.", "success");
    }
    closeForm();
  }

  function handleDelete(medicineId) {
    if (!window.confirm("Delete this medicine record? This action cannot be undone.")) return;
    const updated = medicines.filter((m) => m.medicineId !== medicineId);
    setMedicines(updated);
    saveToStorage(updated);
    showToast("Medicine deleted.", "warning");
  }

  // ── Derived Data ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = medicines.length;
    const low = medicines.filter((m) => getStockStatus(m) === "Low Stock").length;
    const expired = medicines.filter((m) => getStockStatus(m) === "Expired").length;
    const expiringSoon = medicines.filter((m) => getStockStatus(m) === "Expiring Soon").length;
    const outOfStock = medicines.filter((m) => getStockStatus(m) === "Out of Stock").length;
    const available = medicines.filter((m) => getStockStatus(m) === "Available").length;
    const inventoryValue = medicines.reduce((sum, m) => {
      return sum + (Number(m.stockQuantity ?? m.quantity ?? 0) * Number(m.sellingPrice ?? m.price ?? 0));
    }, 0);
    return { total, low, expired, expiringSoon, outOfStock, available, inventoryValue };
  }, [medicines]);

  const filtered = useMemo(() => {
    let data = medicines.filter((m) => {
      const name = searchName.toLowerCase();
      const generic = searchGeneric.toLowerCase();
      const mfr = searchManufacturer.toLowerCase();
      const batch = searchBatch.toLowerCase();

      if (name && !m.name?.toLowerCase().includes(name)) return false;
      if (generic && !m.genericName?.toLowerCase().includes(generic)) return false;
      if (mfr && !m.manufacturer?.toLowerCase().includes(mfr)) return false;
      if (batch && !m.batchNumber?.toLowerCase().includes(batch)) return false;
      if (filterCategory !== "All" && m.category !== filterCategory) return false;
      if (filterStatus !== "All" && getStockStatus(m) !== filterStatus) return false;
      return true;
    });

    data = [...data].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":  return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        case "expiry_asc":  return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
        case "expiry_desc": return new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0);
        case "stock_asc":  return Number(a.stockQuantity ?? a.quantity ?? 0) - Number(b.stockQuantity ?? b.quantity ?? 0);
        case "stock_desc": return Number(b.stockQuantity ?? b.quantity ?? 0) - Number(a.stockQuantity ?? a.quantity ?? 0);
        case "price_asc":  return Number(a.sellingPrice ?? a.price ?? 0) - Number(b.sellingPrice ?? b.price ?? 0);
        case "price_desc": return Number(b.sellingPrice ?? b.price ?? 0) - Number(a.sellingPrice ?? a.price ?? 0);
        default: return 0;
      }
    });

    return data;
  }, [medicines, searchName, searchGeneric, searchManufacturer, searchBatch, filterCategory, filterStatus, sortBy]);

  const hasActiveFilters = searchName || searchGeneric || searchManufacturer || searchBatch ||
    filterCategory !== "All" || filterStatus !== "All";

  function clearAllFilters() {
    setSearchName(""); setSearchGeneric(""); setSearchManufacturer(""); setSearchBatch("");
    setFilterCategory("All"); setFilterStatus("All"); setSortBy("name_asc");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900">Medicine Inventory</h1>
            </div>
            <p className="text-slate-500 text-sm">
              Manage medicine catalogue, stock levels, and expiry tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition
                ${showFilters ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-teal-600" />}
            </button>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700
                text-white text-sm font-semibold transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Medicine
            </button>
          </div>
        </div>

        {/* ── Stat Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard label="Total Medicines" value={stats.total} color="teal" icon="📦"
            sub={`${stats.available} available`} />
          <StatCard label="Low Stock" value={stats.low} color="amber" icon="⚠️"
            sub={`≤${LOW_STOCK_THRESHOLD} units`} />
          <StatCard label="Expired" value={stats.expired} color="red" icon="🚫"
            sub="Needs immediate attention" />
          <StatCard label="Expiring Soon" value={stats.expiringSoon} color="orange" icon="⏳"
            sub={`Within ${EXPIRY_WARNING_DAYS} days`} />
          <StatCard label="Out of Stock" value={stats.outOfStock} color="slate" icon="❌"
            sub="Zero units" />
          <StatCard label="Inventory Value" value={`₹${(stats.inventoryValue / 1000).toFixed(1)}K`} color="emerald" icon="💰"
            sub="At selling price" />
        </div>

        {/* ── Alerts ────────────────────────────────────────────────────── */}
        {stats.expired > 0 && !dismissedAlerts.includes("expired") && (
          <AlertBanner type="error"
            message={`🚫 ${stats.expired} medicine(s) have passed their expiry date. Review and remove immediately.`}
            onDismiss={() => setDismissedAlerts((p) => [...p, "expired"])} />
        )}
        {stats.low > 0 && !dismissedAlerts.includes("low") && (
          <AlertBanner type="warning"
            message={`⚠️ ${stats.low} medicine(s) are running low on stock (≤${LOW_STOCK_THRESHOLD} units). Consider restocking.`}
            onDismiss={() => setDismissedAlerts((p) => [...p, "low"])} />
        )}
        {stats.expiringSoon > 0 && !dismissedAlerts.includes("expiring") && (
          <AlertBanner type="warning"
            message={`⏳ ${stats.expiringSoon} medicine(s) are expiring within ${EXPIRY_WARNING_DAYS} days.`}
            onDismiss={() => setDismissedAlerts((p) => [...p, "expiring"])} />
        )}

        {/* ── Search & Filters Panel ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5">
          {/* Primary search row */}
          <div className="flex flex-col sm:flex-row gap-3 p-4">
            <SearchBar value={searchName} onChange={setSearchName} placeholder="Search by medicine name…" />
            <SelectFilter value={filterCategory} onChange={setFilterCategory}
              options={CATEGORIES.map((c) => ({ value: c, label: c === "All" ? "All Categories" : c }))}
              label="Category" />
            <SelectFilter value={filterStatus} onChange={setFilterStatus}
              options={STATUS_FILTER_OPTIONS.map((s) => ({ value: s, label: s === "All" ? "All Statuses" : s }))}
              label="Status" />
            <SelectFilter value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} label="Sort" />
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition whitespace-nowrap"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SearchBar value={searchGeneric} onChange={setSearchGeneric} placeholder="Search by generic name…" />
              <SearchBar value={searchManufacturer} onChange={setSearchManufacturer} placeholder="Search by manufacturer…" />
              <SearchBar value={searchBatch} onChange={setSearchBatch} placeholder="Search by batch number…" />
            </div>
          )}
        </div>

        {/* ── Medicine Table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    "ID", "Medicine Name", "Generic Name", "Brand", "Category",
                    "Strength", "Manufacturer", "Batch No.", "Expiry Date",
                    "Stock", "MRP", "Purchase", "Selling", "Status", "Actions"
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={15}>
                      <EmptyState search={searchName} onClear={clearAllFilters} />
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <MedicineTableRow
                      key={m.medicineId}
                      medicine={m}
                      onEdit={openEditForm}
                      onDelete={handleDelete}
                      onView={setViewingMedicine}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{" "}
                <span className="font-semibold text-slate-600">{medicines.length}</span> medicine(s)
              </p>
              {hasActiveFilters && (
                <p className="text-xs text-teal-600 font-medium">Filters active</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {viewingMedicine && (
        <MedicineDetailModal
          medicine={viewingMedicine}
          onClose={() => setViewingMedicine(null)}
          onEdit={openEditForm}
          onExport={exportUtils.pdf}
        />
      )}

      {showForm && (
        <MedicineFormModal
          form={form}
          editingId={editingId}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
