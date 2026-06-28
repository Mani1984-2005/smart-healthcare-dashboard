// src/pages/PharmacyPage.jsx
// MediCare Pro — Enterprise Pharmacy Management Dashboard
// Upgrade: Professional dashboard, advanced analytics, alert system, future-ready architecture

import { useState, useEffect, useMemo, useCallback } from "react";
import BarcodeScanner from "../components/BarcodeScanner";
import { jsPDF } from "jspdf";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharmacy_medicines";

const CATEGORIES = [
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
  "Tablet", "Capsule", "Syrup", "Injection", "Cream",
  "Ointment", "Drops", "Inhaler", "Patch", "Suppository",
  "Powder", "Suspension", "Gel", "Lotion", "Spray",
];

const STATUS_OPTIONS = ["Available", "Out of Stock", "Discontinued"];

const LOW_STOCK_THRESHOLD = 10;
const EXPIRY_WARNING_DAYS = 30;

// ─── Empty Form ────────────────────────────────────────────────────────────────

const emptyForm = {
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
  // Legacy compat fields
  quantity: "",
  price: "",
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(todayStr());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(todayStr());
}

function isExpiringSoon(dateStr) {
  const days = daysUntilExpiry(dateStr);
  return days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS;
}

function isLowStock(medicine) {
  const qty = getQty(medicine);
  return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
}

function getQty(medicine) {
  return Number(medicine.stockQuantity ?? medicine.quantity ?? 0);
}

function getPrice(medicine) {
  return Number(medicine.sellingPrice ?? medicine.price ?? 0);
}

function getPurchasePrice(medicine) {
  return Number(medicine.purchasePrice ?? 0);
}

function getStockStatus(medicine) {
  if (isExpired(medicine.expiryDate)) return "Expired";
  if (isExpiringSoon(medicine.expiryDate)) return "Expiring Soon";
  if (getQty(medicine) === 0) return "Out of Stock";
  if (isLowStock(medicine)) return "Low Stock";
  return "Available";
}

function formatCurrency(val) {
  const n = Number(val);
  if (isNaN(n) || !val) return "—";
  return `₹${n.toFixed(2)}`;
}

function formatCurrencyCompact(val) {
  const n = Number(val);
  if (isNaN(n)) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

// ─── FUTURE READY Architecture Stubs ──────────────────────────────────────────
// These define integration points. Implement without changing component API.

// eslint-disable-next-line no-unused-vars
const FutureIntegrations = {
  barcodeScanner: { scan: () => {}, scanning: false },
  qrScanner: { scan: () => {}, scanning: false },
  drugInteractionChecker: { check: () => Promise.resolve([]) },
  medicineRecommendationAI: { recommend: () => Promise.resolve([]) },
  inventoryForecasting: { forecast: () => Promise.resolve(null) },
  supplierPortal: { fetchSuppliers: () => Promise.resolve([]), createPO: () => Promise.resolve(null) },
  prescriptionScanner: { scan: () => Promise.resolve(null) },
  medicineComparator: { compare: () => Promise.resolve([]) },
  purchaseOrders: { create: () => Promise.resolve(null), list: () => Promise.resolve([]) },
};

// ─── Export Utilities (Future-ready) ──────────────────────────────────────────

function downloadMedicinePDF(medicine) {
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
  doc.text("Pharmacy Inventory Report", 20, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 120, 28);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(medicine.name || "—", 20, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const subtitle = [medicine.genericName, medicine.brand, medicine.manufacturer].filter(Boolean).join(" · ");
  if (subtitle) doc.text(subtitle, 20, 60);

  const fields = [
    ["Medicine ID", medicine.medicineId],
    ["Generic Name", medicine.genericName || "—"],
    ["Brand", medicine.brand || "—"],
    ["Manufacturer", medicine.manufacturer || "—"],
    ["Category", medicine.category || "—"],
    ["Dosage Form", medicine.dosageForm || "—"],
    ["Strength", medicine.strength || "—"],
    ["Pack Size", medicine.packSize || "—"],
    ["Batch Number", medicine.batchNumber || "—"],
    ["Manufacturing Date", formatDate(medicine.manufacturingDate)],
    ["Expiry Date", formatDate(medicine.expiryDate)],
    ["Purchase Price", formatCurrency(medicine.purchasePrice)],
    ["Selling Price", formatCurrency(medicine.sellingPrice ?? medicine.price)],
    ["MRP", formatCurrency(medicine.mrp)],
    ["GST", medicine.gst ? `${medicine.gst}%` : "—"],
    ["Supplier", medicine.supplier || "—"],
    ["Stock Quantity", String(getQty(medicine))],
    ["Minimum Stock", medicine.minimumStock || "—"],
    ["Status", status],
    ["Storage Instructions", medicine.storageInstructions || "—"],
    ["Notes", medicine.notes || "—"],
  ];

  let y = 70;
  doc.setFontSize(9);
  fields.forEach(([k, v], i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
    doc.rect(18, y - 4, 174, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text(k, 20, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);
    doc.text(String(v ?? "—"), 90, y + 2);
    y += 9;
  });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Computer-generated pharmacy inventory report. MediCare Pro — Enterprise Healthcare System.", 20, 285);
  doc.save(`${medicine.medicineId || "medicine"}_report.pdf`);
}

function downloadInventoryPDF(medicines) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 297, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MediCare Pro — Pharmacy Inventory Report", 15, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")} | Total: ${medicines.length} medicines`, 15, 22);

  const headers = ["ID", "Name", "Category", "Batch", "Expiry", "Stock", "Price", "Status"];
  const colWidths = [22, 55, 28, 28, 25, 18, 22, 25];
  let x = 15;
  let y = 40;

  doc.setFillColor(240, 253, 250);
  doc.rect(15, y - 5, 267, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.setFontSize(8);
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i];
  });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);

  medicines.forEach((m, idx) => {
    if (y > 190) { doc.addPage(); y = 20; }
    const status = getStockStatus(m);
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, 267, 8, "F");
    }
    x = 15;
    const row = [
      m.medicineId?.substring(0, 8) || "—",
      (m.name || "—").substring(0, 25),
      (m.category || "—").substring(0, 14),
      (m.batchNumber || "—").substring(0, 12),
      formatDate(m.expiryDate),
      String(getQty(m)),
      formatCurrency(m.sellingPrice ?? m.price),
      status,
    ];
    doc.setFontSize(7.5);
    if (status === "Expired") doc.setTextColor(200, 50, 50);
    else if (status === "Low Stock") doc.setTextColor(180, 120, 0);
    else doc.setTextColor(30);

    row.forEach((val, i) => {
      doc.text(String(val), x, y);
      x += colWidths[i];
    });
    y += 8;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(150);
  doc.text("MediCare Pro — Computer-generated pharmacy inventory report.", 15, 205);
  doc.save(`pharmacy_inventory_${todayStr()}.pdf`);
}

const exportUtils = {
  singlePDF: downloadMedicinePDF,
  inventoryPDF: downloadInventoryPDF,
  // Future:
  excel: (data) => console.warn("Excel export not yet implemented", data),
  csv: (data) => console.warn("CSV export not yet implemented", data),
  print: (data) => console.warn("Print not yet implemented", data),
};

// ─── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Low Stock": "bg-amber-50 text-amber-700 border border-amber-200",
  "Out of Stock": "bg-red-50 text-red-700 border border-red-200",
  Expired: "bg-rose-100 text-rose-700 border border-rose-300",
  "Expiring Soon": "bg-orange-50 text-orange-700 border border-orange-200",
  Discontinued: "bg-slate-100 text-slate-600 border border-slate-200",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
      {status}
    </span>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: "bg-emerald-600",
    error:   "bg-red-600",
    warning: "bg-amber-500",
    info:    "bg-teal-600",
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[60] px-5 py-3 rounded-xl text-white text-sm font-medium
      shadow-2xl flex items-center gap-3 ${styles[type] || "bg-slate-700"}`}>
      <span>{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-lg leading-none">×</button>
    </div>
  );
}

// ─── Dashboard Metric Card ─────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon, color, alert }) {
  const colorMap = {
    teal:    { grad: "from-teal-500 to-teal-600", ring: "ring-teal-200" },
    emerald: { grad: "from-emerald-500 to-emerald-600", ring: "ring-emerald-200" },
    amber:   { grad: "from-amber-500 to-amber-600", ring: "ring-amber-200" },
    red:     { grad: "from-red-500 to-red-600", ring: "ring-red-200" },
    orange:  { grad: "from-orange-500 to-orange-600", ring: "ring-orange-200" },
    violet:  { grad: "from-violet-500 to-violet-600", ring: "ring-violet-200" },
    slate:   { grad: "from-slate-500 to-slate-600", ring: "ring-slate-200" },
    blue:    { grad: "from-blue-500 to-blue-600", ring: "ring-blue-200" },
  };
  const c = colorMap[color] || colorMap.teal;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden
      ${alert ? `ring-2 ${c.ring}` : ""}`}>
      <div className={`bg-gradient-to-br ${c.grad} px-4 pt-4 pb-3`}>
        <div className="flex items-start justify-between">
          <span className="text-2xl">{icon}</span>
          {alert && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse mt-1" />
          )}
        </div>
        <p className="text-white font-bold text-2xl mt-2 leading-tight">{value}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-slate-700 text-sm font-semibold">{label}</p>
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Alert Banner ──────────────────────────────────────────────────────────────

function AlertBanner({ type, message, onDismiss }) {
  const styles = {
    warning: "bg-amber-50 border-amber-400 text-amber-800",
    error:   "bg-red-50 border-red-400 text-red-800",
    info:    "bg-teal-50 border-teal-400 text-teal-800",
    success: "bg-emerald-50 border-emerald-400 text-emerald-800",
  };
  return (
    <div className={`flex items-center justify-between border-l-4 px-4 py-3 rounded-lg mb-3 text-sm ${styles[type]}`}>
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-4 opacity-50 hover:opacity-100 font-bold text-lg leading-none">×</button>
      )}
    </div>
  );
}

// ─── Table Row ─────────────────────────────────────────────────────────────────

function TableRow({ medicine, onEdit, onDelete, onView, onPDF }) {
  const status = getStockStatus(medicine);
  const days = daysUntilExpiry(medicine.expiryDate);

  const rowBg =
    status === "Expired" ? "bg-red-50 hover:bg-red-100" :
    status === "Low Stock" ? "bg-amber-50 hover:bg-amber-100" :
    status === "Expiring Soon" ? "bg-orange-50 hover:bg-orange-100" :
    "hover:bg-slate-50";

  return (
    <tr className={`text-sm border-b border-slate-100 transition-colors ${rowBg}`}>
      <td className="px-4 py-3 font-mono text-xs text-slate-400">{medicine.medicineId}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-800 leading-tight">{medicine.name}</p>
        {medicine.genericName && (
          <p className="text-xs text-slate-400 mt-0.5">{medicine.genericName}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
          {medicine.category || "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`font-bold ${
          getQty(medicine) === 0 ? "text-red-600" :
          isLowStock(medicine) ? "text-amber-600" : "text-slate-700"
        }`}>
          {getQty(medicine)}
        </span>
        {isLowStock(medicine) && (
          <span className="ml-1.5 text-xs text-amber-500 font-medium">Low</span>
        )}
        {getQty(medicine) === 0 && (
          <span className="ml-1.5 text-xs text-red-500 font-medium">Out</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs font-semibold text-teal-700">
        {formatCurrency(medicine.sellingPrice ?? medicine.price)}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{medicine.supplier || "—"}</td>
      <td className="px-4 py-3 text-xs">
        <span className={
          status === "Expired" ? "text-red-600 font-semibold" :
          status === "Expiring Soon" ? "text-orange-600 font-medium" :
          "text-slate-600"
        }>
          {formatDate(medicine.expiryDate)}
        </span>
        {days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS && (
          <p className="text-orange-500 text-xs mt-0.5">{days}d left</p>
        )}
        {status === "Expired" && (
          <p className="text-red-500 text-xs mt-0.5">Expired</p>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => onView(medicine)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-teal-700 border border-teal-200 hover:bg-teal-50 transition">
            View
          </button>
          <button onClick={() => onPDF(medicine)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-violet-700 border border-violet-200 hover:bg-violet-50 transition">
            PDF
          </button>
          <button onClick={() => onEdit(medicine)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition">
            Edit
          </button>
          <button onClick={() => onDelete(medicine.medicineId)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Medicine Detail View Modal ────────────────────────────────────────────────

function MedicineViewModal({ medicine, onClose, onEdit }) {
  const status = getStockStatus(medicine);
  const days = daysUntilExpiry(medicine.expiryDate);
  const profit = getPrice(medicine) - getPurchasePrice(medicine);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">{medicine.name}</h2>
            <p className="text-teal-200 text-xs mt-0.5">
              {[medicine.genericName, medicine.brand].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <button onClick={onClose} className="text-teal-200 hover:text-white text-2xl leading-none ml-1">×</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {[
            {
              title: "Identity",
              rows: [
                ["Medicine ID", medicine.medicineId],
                ["Manufacturer", medicine.manufacturer || "—"],
                ["Batch No.", medicine.batchNumber || "—"],
                ["Barcode", medicine.barcode || "—"],
              ],
            },
            {
              title: "Pricing",
              rows: [
                ["MRP", formatCurrency(medicine.mrp)],
                ["Purchase Price", formatCurrency(medicine.purchasePrice)],
                ["Selling Price", formatCurrency(medicine.sellingPrice ?? medicine.price)],
                ["Profit per Unit", profit > 0 ? formatCurrency(profit) : "—"],
                ["GST", medicine.gst ? `${medicine.gst}%` : "—"],
              ],
            },
            {
              title: "Stock & Expiry",
              rows: [
                ["Stock", getQty(medicine)],
                ["Minimum Stock", medicine.minimumStock || "—"],
                ["Expiry Date", formatDate(medicine.expiryDate)],
                ["Days to Expiry", days !== null ? (days < 0 ? "Expired" : `${days} days`) : "—"],
              ],
            },
            {
              title: "Other",
              rows: [
                ["Supplier", medicine.supplier || "—"],
                ["Storage", medicine.storageInstructions || "—"],
                ["Notes", medicine.notes || "—"],
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{section.title}</p>
              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                {section.rows.map(([k, v], i) => (
                  <div key={k} className={`flex justify-between px-4 py-2.5 text-sm ${i !== section.rows.length - 1 ? "border-b border-slate-100" : ""}`}>
                    <span className="text-slate-500 font-medium">{k}</span>
                    <span className="text-slate-800 font-medium text-right max-w-xs break-words">{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button
            onClick={() => downloadMedicinePDF(medicine)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-200 text-violet-700 text-sm font-medium hover:bg-violet-50 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
            </svg>
            Export PDF
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition">
              Close
            </button>
            <button
              onClick={() => { onClose(); onEdit(medicine); }}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Form Field ────────────────────────────────────────────────────────────────

function FormField({ label, name, value, onChange, type = "text", placeholder, disabled, min, max, step, required, as, children }) {
  const inputClass = `w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white
    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all
    ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {as === "select" ? (
        <select name={name} value={value} onChange={onChange} disabled={disabled} className={inputClass}>
          {children}
        </select>
      ) : as === "textarea" ? (
        <textarea name={name} value={value} onChange={onChange}
          placeholder={placeholder} rows={3}
          className={`${inputClass} resize-none`} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled}
          min={min} max={max} step={step}
          className={inputClass} />
      )}
    </div>
  );
}

// ─── Add / Edit Form Modal ─────────────────────────────────────────────────────

function FormModal({ form, editingId, onChange, onSubmit, onClose }) {
  const profit = Number(form.sellingPrice || 0) - Number(form.purchasePrice || 0);
  const profitPct = form.purchasePrice > 0
    ? ((profit / Number(form.purchasePrice)) * 100).toFixed(1)
    : null;

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
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">
              {editingId ? "Edit Medicine" : "Add New Medicine"}
            </h2>
            <p className="text-teal-200 text-xs mt-0.5">
              {editingId ? `Editing: ${editingId}` : "Register a new medicine in the pharmacy inventory"}
            </p>
          </div>
          <button onClick={onClose} className="text-teal-200 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Live profit indicator */}
        {(form.purchasePrice || form.sellingPrice) && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center gap-3 border-b
            ${profit >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}`}>
            <span>💹 Profit per unit:</span>
            <span className="font-bold">{formatCurrency(profit)}</span>
            {profitPct && <span className="opacity-70">({profitPct}%)</span>}
            {profit < 0 && <span className="font-semibold">⚠️ Selling below cost!</span>}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Basic Info */}
          <div>
            <SectionTitle title="Basic Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Medicine ID" name="medicineId" value={form.medicineId} onChange={onChange}
                placeholder="e.g. MED-001" required disabled={!!editingId} />
              <FormField label="Medicine Name" name="name" value={form.name} onChange={onChange}
                placeholder="e.g. Paracetamol 500mg" required />
              <FormField label="Generic Name" name="genericName" value={form.genericName} onChange={onChange}
                placeholder="e.g. Acetaminophen" />
              <FormField label="Brand Name" name="brand" value={form.brand} onChange={onChange}
                placeholder="e.g. Calpol" />
              <FormField label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={onChange}
                placeholder="e.g. GSK India" />
              <FormField label="Supplier" name="supplier" value={form.supplier} onChange={onChange}
                placeholder="e.g. Sun Pharma Distributors" required />
            </div>
          </div>

          {/* Classification */}
          <div>
            <SectionTitle title="Classification" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Category" name="category" value={form.category} onChange={onChange}
                required as="select">
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </FormField>
              <FormField label="Dosage Form" name="dosageForm" value={form.dosageForm} onChange={onChange}
                as="select">
                <option value="">Select form…</option>
                {DOSAGE_FORMS.map((d) => <option key={d} value={d}>{d}</option>)}
              </FormField>
              <FormField label="Strength" name="strength" value={form.strength} onChange={onChange}
                placeholder="e.g. 500mg" />
              <FormField label="Pack Size" name="packSize" value={form.packSize} onChange={onChange}
                placeholder="e.g. 10 tablets/strip" />
              <FormField label="Batch Number" name="batchNumber" value={form.batchNumber} onChange={onChange}
                placeholder="e.g. BCH-2024-001" />
              <FormField label="Status" name="status" value={form.status} onChange={onChange} as="select">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </FormField>
            </div>
          </div>

          {/* Dates */}
          <div>
            <SectionTitle title="Dates" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Manufacturing Date" name="manufacturingDate" value={form.manufacturingDate}
                onChange={onChange} type="date" />
              <FormField label="Expiry Date" name="expiryDate" value={form.expiryDate}
                onChange={onChange} type="date" required />
            </div>
          </div>

          {/* Pricing */}
          <div>
            <SectionTitle title="Pricing & Tax" />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <FormField label="MRP (₹)" name="mrp" value={form.mrp} onChange={onChange}
                type="number" placeholder="0.00" min="0" step="0.01" />
              <FormField label="Purchase Price (₹)" name="purchasePrice" value={form.purchasePrice}
                onChange={onChange} type="number" placeholder="0.00" min="0" step="0.01" />
              <FormField label="Selling Price (₹)" name="sellingPrice" value={form.sellingPrice}
                onChange={onChange} type="number" placeholder="0.00" min="0" step="0.01" required />
              <FormField label="GST (%)" name="gst" value={form.gst} onChange={onChange}
                type="number" placeholder="e.g. 12" min="0" max="100" step="0.1" />
            </div>
          </div>

          {/* Inventory */}
          <div>
            <SectionTitle title="Inventory" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Stock Quantity" name="stockQuantity" value={form.stockQuantity}
                onChange={onChange} type="number" placeholder="0" min="0" required />
              <FormField label="Minimum Stock Level" name="minimumStock" value={form.minimumStock}
                onChange={onChange} type="number" placeholder="e.g. 10" min="0" />
            </div>
          </div>

          {/* Future Ready */}
          <div>
            <SectionTitle title="Future Ready (Scanner Integration)" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Barcode" name="barcode" value={form.barcode} onChange={onChange}
                placeholder="Auto-populate via barcode scanner" />
              <FormField label="QR Code" name="qrCode" value={form.qrCode} onChange={onChange}
                placeholder="Auto-populate via QR scanner" />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              📷 Barcode/QR scanner integration coming soon. Fields are ready for hardware scanner input.
            </p>
          </div>

          {/* Additional */}
          <div>
            <SectionTitle title="Additional Details" />
            <div className="grid grid-cols-1 gap-4">
              <FormField label="Storage Instructions" name="storageInstructions" value={form.storageInstructions}
                onChange={onChange} as="textarea" placeholder="e.g. Store below 25°C in a cool, dry place away from sunlight." />
              <FormField label="Notes" name="notes" value={form.notes} onChange={onChange}
                as="textarea" placeholder="Internal notes for pharmacy staff…" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required fields</p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition">
              Cancel
            </button>
            <button onClick={onSubmit}
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition shadow-sm">
              {editingId ? "Save Changes" : "Add Medicine"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
      <span className="flex-1 h-px bg-slate-100" />
      {title}
      <span className="flex-1 h-px bg-slate-100" />
    </p>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onAddMedicine }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <p className="text-slate-600 font-semibold text-base mb-1">No medicines match your filters</p>
          <p className="text-slate-400 text-sm">Try adjusting your search or filter criteria.</p>
        </>
      ) : (
        <>
          <p className="text-slate-600 font-semibold text-base mb-1">Pharmacy inventory is empty</p>
          <p className="text-slate-400 text-sm mb-4">Add your first medicine to get started.</p>
          <button
            onClick={onAddMedicine}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition"
          >
            Add First Medicine
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PharmacyPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast, setToast] = useState(null);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory"); // "dashboard" | "inventory" | "alerts"

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMedicines(JSON.parse(saved));
    } catch { setMedicines([]); }
  }, []);

  // ── Save to localStorage ───────────────────────────────────────────────────
  useEffect(() => {
    if (medicines.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    }
  }, [medicines]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(medicine) {
    setForm({ ...emptyForm, ...medicine });
    setEditingId(medicine.medicineId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function validate() {
    if (!form.medicineId?.trim()) return "Medicine ID is required.";
    if (!form.name?.trim()) return "Medicine Name is required.";
    if (!form.category) return "Category is required.";
    const qty = Number(form.stockQuantity ?? form.quantity ?? "");
    if (isNaN(qty) || qty < 0) return "Stock Quantity must be a valid non-negative number.";
    const price = Number(form.sellingPrice ?? form.price ?? "");
    if (isNaN(price) || price < 0) return "Selling Price must be a valid non-negative number.";
    if (!form.supplier?.trim()) return "Supplier is required.";
    if (!form.expiryDate) return "Expiry Date is required.";
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) { showToast(error, "error"); return; }

    // Ensure backward-compatible fields are kept in sync
    const record = {
      ...form,
      price: form.sellingPrice || form.price || "",
      quantity: form.stockQuantity || form.quantity || "",
    };

    if (editingId) {
      setMedicines((prev) => prev.map((m) => m.medicineId === editingId ? record : m));
      showToast("Medicine updated successfully.", "success");
    } else {
      if (medicines.find((m) => m.medicineId === form.medicineId.trim())) {
        showToast("A medicine with this ID already exists.", "error");
        return;
      }
      setMedicines((prev) => [...prev, record]);
      showToast("Medicine added successfully.", "success");
    }
    closeForm();
  }

  function handleDelete(medicineId) {
    if (!window.confirm("Delete this medicine record? This cannot be undone.")) return;
    setMedicines((prev) => prev.filter((m) => m.medicineId !== medicineId));
    showToast("Medicine deleted.", "warning");
  }

  // ── Derived / analytics ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = medicines.length;
    const low = medicines.filter((m) => getStockStatus(m) === "Low Stock").length;
    const expired = medicines.filter((m) => getStockStatus(m) === "Expired").length;
    const expiringSoon = medicines.filter((m) => getStockStatus(m) === "Expiring Soon").length;
    const outOfStock = medicines.filter((m) => getStockStatus(m) === "Out of Stock").length;
    const available = medicines.filter((m) => getStockStatus(m) === "Available").length;

    const inventoryValue = medicines.reduce(
      (sum, m) => sum + getQty(m) * getPrice(m), 0
    );
    const inventoryCost = medicines.reduce(
      (sum, m) => sum + getQty(m) * getPurchasePrice(m), 0
    );
    const potentialProfit = inventoryValue - inventoryCost;

    const categoryBreakdown = medicines.reduce((acc, m) => {
      const cat = m.category || "Other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const topCategory = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      total, low, expired, expiringSoon, outOfStock, available,
      inventoryValue, inventoryCost, potentialProfit,
      categoryBreakdown, topCategory,
    };
  }, [medicines]);

  // Medicines needing attention
  const alertMedicines = useMemo(() => ({
    expired: medicines.filter((m) => getStockStatus(m) === "Expired"),
    expiringSoon: medicines.filter((m) => getStockStatus(m) === "Expiring Soon"),
    lowStock: medicines.filter((m) => getStockStatus(m) === "Low Stock"),
    outOfStock: medicines.filter((m) => getStockStatus(m) === "Out of Stock"),
  }), [medicines]);

  const totalAlerts = stats.expired + stats.expiringSoon + stats.low + stats.outOfStock;

  // Filtered inventory
  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        m.name?.toLowerCase().includes(term) ||
        m.medicineId?.toLowerCase().includes(term) ||
        m.supplier?.toLowerCase().includes(term) ||
        m.genericName?.toLowerCase().includes(term) ||
        m.batchNumber?.toLowerCase().includes(term);

      const matchCat = filterCategory === "All" || m.category === filterCategory;
      const matchStatus = filterStatus === "All" || getStockStatus(m) === filterStatus;

      return matchSearch && matchCat && matchStatus;
    });
  }, [medicines, search, filterCategory, filterStatus]);

  const hasActiveFilters = search || filterCategory !== "All" || filterStatus !== "All";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900">Pharmacy Management</h1>
              {totalAlerts > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                  {totalAlerts}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              Enterprise pharmacy inventory control and analytics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportUtils.inventoryPDF(medicines)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200
                text-slate-700 text-sm font-medium hover:border-slate-300 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
              </svg>
              Export
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200
                text-slate-700 text-sm font-medium hover:border-slate-300 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m10-16h-4a2 2 0 00-2 2v4m6 10v-4a2 2 0 00-2-2h-4" />
              </svg>
              Scan
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

        {/* ── Tab Navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm mb-6 w-fit">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "inventory", label: "Inventory", icon: "📦" },
            { id: "alerts", label: "Alerts", icon: "🚨", badge: totalAlerts },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                ${activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold
                  ${activeTab === tab.id ? "bg-white text-teal-600" : "bg-red-500 text-white"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Dashboard Tab ──────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Medicines" value={stats.total} icon="📦" color="teal"
                sub={`${stats.available} available`} />
              <MetricCard label="Inventory Value" value={formatCurrencyCompact(stats.inventoryValue)}
                icon="💰" color="emerald" sub="At selling price" />
              <MetricCard label="Inventory Cost" value={formatCurrencyCompact(stats.inventoryCost)}
                icon="🏷️" color="blue" sub="At purchase price" />
              <MetricCard label="Potential Profit" value={formatCurrencyCompact(stats.potentialProfit)}
                icon="📈" color="violet" sub="Sell - Buy (full stock)"
                alert={stats.potentialProfit < 0} />
              <MetricCard label="Low Stock" value={stats.low} icon="⚠️" color="amber"
                sub={`≤${LOW_STOCK_THRESHOLD} units`} alert={stats.low > 0} />
              <MetricCard label="Expired" value={stats.expired} icon="🚫" color="red"
                sub="Needs removal" alert={stats.expired > 0} />
              <MetricCard label="Expiring Soon" value={stats.expiringSoon} icon="⏳" color="orange"
                sub={`Within ${EXPIRY_WARNING_DAYS} days`} alert={stats.expiringSoon > 0} />
              <MetricCard label="Out of Stock" value={stats.outOfStock} icon="❌" color="slate"
                sub="Zero units" alert={stats.outOfStock > 0} />
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Inventory by Category</h3>
              <div className="space-y-3">
                {Object.entries(stats.categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => {
                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-36 truncate">{cat}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-teal-500 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                {Object.keys(stats.categoryBreakdown).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">No data yet. Add medicines to see analytics.</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Stock Health</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Available</span>
                    <span className="font-semibold text-emerald-600">{stats.available}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Low Stock</span>
                    <span className="font-semibold text-amber-600">{stats.low}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Out of Stock</span>
                    <span className="font-semibold text-red-600">{stats.outOfStock}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Expiry Status</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Valid</span>
                    <span className="font-semibold text-emerald-600">
                      {medicines.filter((m) => !isExpired(m.expiryDate) && !isExpiringSoon(m.expiryDate)).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Expiring Soon</span>
                    <span className="font-semibold text-orange-600">{stats.expiringSoon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Expired</span>
                    <span className="font-semibold text-red-600">{stats.expired}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Profit Overview</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Inventory Cost</span>
                    <span className="font-semibold text-slate-700">{formatCurrencyCompact(stats.inventoryCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sell Value</span>
                    <span className="font-semibold text-slate-700">{formatCurrencyCompact(stats.inventoryValue)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                    <span className="text-slate-700 font-semibold">Potential Profit</span>
                    <span className={`font-bold ${stats.potentialProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrencyCompact(stats.potentialProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Inventory Tab ──────────────────────────────────────────────── */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            {/* Alerts summary */}
            {stats.expired > 0 && !dismissedAlerts.includes("expired") && (
              <AlertBanner type="error"
                message={`🚫 ${stats.expired} medicine(s) have expired. Review and remove them immediately.`}
                onDismiss={() => setDismissedAlerts((p) => [...p, "expired"])} />
            )}
            {stats.low > 0 && !dismissedAlerts.includes("low") && (
              <AlertBanner type="warning"
                message={`⚠️ ${stats.low} medicine(s) are running low on stock (≤${LOW_STOCK_THRESHOLD} units).`}
                onDismiss={() => setDismissedAlerts((p) => [...p, "low"])} />
            )}
            {stats.expiringSoon > 0 && !dismissedAlerts.includes("expiring") && (
              <AlertBanner type="warning"
                message={`⏳ ${stats.expiringSoon} medicine(s) expiring within ${EXPIRY_WARNING_DAYS} days.`}
                onDismiss={() => setDismissedAlerts((p) => [...p, "expiring"])} />
            )}

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, ID, supplier, or batch…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200
                      focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                  {search && (
                    <button onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white
                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all">
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white
                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all">
                  <option value="All">All Statuses</option>
                  {["Available", "Low Stock", "Out of Stock", "Expired", "Expiring Soon", "Discontinued"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setSearch(""); setFilterCategory("All"); setFilterStatus("All"); }}
                    className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["ID", "Medicine", "Category", "Stock", "Price", "Supplier", "Expiry", "Status", "Actions"].map((col) => (
                        <th key={col}
                          className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                          <EmptyState
                            hasFilters={hasActiveFilters}
                            onAddMedicine={openAddForm}
                          />
                        </td>
                      </tr>
                    ) : (
                      filtered.map((m) => (
                        <TableRow
                          key={m.medicineId}
                          medicine={m}
                          onEdit={openEditForm}
                          onDelete={handleDelete}
                          onView={setViewingMedicine}
                          onPDF={downloadMedicinePDF}
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
        )}

        {/* ── Alerts Tab ─────────────────────────────────────────────────── */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            {totalAlerts === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-semibold">All Clear</p>
                <p className="text-slate-400 text-sm mt-1">No stock or expiry alerts at this time.</p>
              </div>
            ) : (
              <>
                {alertMedicines.expired.length > 0 && (
                  <AlertSection
                    title="Expired Medicines"
                    color="red"
                    icon="🚫"
                    medicines={alertMedicines.expired}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onView={setViewingMedicine}
                    badge={`${alertMedicines.expired.length} medicines`}
                    description="These medicines have passed their expiry date and must be removed from circulation immediately."
                  />
                )}
                {alertMedicines.expiringSoon.length > 0 && (
                  <AlertSection
                    title="Expiring Within 30 Days"
                    color="orange"
                    icon="⏳"
                    medicines={alertMedicines.expiringSoon}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onView={setViewingMedicine}
                    badge={`${alertMedicines.expiringSoon.length} medicines`}
                    description="These medicines will expire within 30 days. Consider discounting or returning to supplier."
                  />
                )}
                {alertMedicines.lowStock.length > 0 && (
                  <AlertSection
                    title="Low Stock"
                    color="amber"
                    icon="⚠️"
                    medicines={alertMedicines.lowStock}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onView={setViewingMedicine}
                    badge={`${alertMedicines.lowStock.length} medicines`}
                    description={`Stock quantity is ≤${LOW_STOCK_THRESHOLD} units. Reorder soon to avoid stockout.`}
                  />
                )}
                {alertMedicines.outOfStock.length > 0 && (
                  <AlertSection
                    title="Out of Stock"
                    color="red"
                    icon="❌"
                    medicines={alertMedicines.outOfStock}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onView={setViewingMedicine}
                    badge={`${alertMedicines.outOfStock.length} medicines`}
                    description="These medicines have zero stock. Reorder immediately."
                  />
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {viewingMedicine && (
        <MedicineViewModal
          medicine={viewingMedicine}
          onClose={() => setViewingMedicine(null)}
          onEdit={openEditForm}
        />
      )}

      {showForm && (
        <FormModal
          form={form}
          editingId={editingId}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {/* ── Barcode Scanner ───────────────────────────────────────────────── */}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            setScannedCode(code);
            setShowScanner(false);
            setForm((prev) => ({ ...prev, medicineId: code, barcode: code }));
            openAddForm();
            showToast(`Barcode scanned: ${code}`, "success");
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

// ─── Alert Section (used in Alerts tab) ───────────────────────────────────────

function AlertSection({ title, color, icon, medicines, onEdit, onDelete, onView, badge, description }) {
  const [expanded, setExpanded] = useState(true);

  const colorMap = {
    red:    "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    amber:  "bg-amber-50 border-amber-200 text-amber-700",
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${colorMap[color]}`}>
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <p className="font-bold text-base">{title}</p>
            <p className="text-xs opacity-75 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white bg-opacity-50">{badge}</span>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="bg-white border-t border-inherit overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["ID", "Medicine", "Category", "Stock", "Expiry", "Status", "Actions"].map((col) => (
                  <th key={col}
                    className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => {
                const status = getStockStatus(m);
                const days = daysUntilExpiry(m.expiryDate);
                return (
                  <tr key={m.medicineId} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.medicineId}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{m.name}</p>
                      {m.genericName && <p className="text-xs text-slate-400">{m.genericName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs">
                        {m.category || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-red-600">{getQty(m)}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-semibold text-red-600">{formatDate(m.expiryDate)}</p>
                      {days !== null && days >= 0 && (
                        <p className="text-orange-500">{days}d left</p>
                      )}
                      {days !== null && days < 0 && (
                        <p className="text-red-500">{Math.abs(days)}d ago</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => onView(m)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-teal-700 border border-teal-200 hover:bg-teal-50 transition">
                          View
                        </button>
                        <button onClick={() => onEdit(m)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition">
                          Edit
                        </button>
                        <button onClick={() => onDelete(m.medicineId)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
