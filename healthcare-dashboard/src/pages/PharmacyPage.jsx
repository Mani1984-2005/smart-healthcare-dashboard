// src/pages/PharmacyPage.jsx
// Pharmacy Inventory Module — MediCare Pro
// Handles: add, edit, delete, search, filter, low-stock & expiry warnings

import { useState, useEffect } from "react";
import BarcodeScanner from "../components/BarcodeScanner";
import { jsPDF } from "jspdf";
// ─── Constants ────────────────────────────────────────────────────────────────

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
  "Other",
];

const STATUS_OPTIONS = ["Available", "Out of Stock", "Discontinued"];

const LOW_STOCK_THRESHOLD = 10; // warn when quantity ≤ this number

// ─── Empty form template ───────────────────────────────────────────────────────

const emptyForm = {
  medicineId: "",
  name: "",
  category: "",
  quantity: "",
  price: "",
  supplier: "",
  expiryDate: "",
  status: "Available",
};

// ─── Helper: today's date as YYYY-MM-DD ───────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Helper: is the medicine expired? ─────────────────────────────────────────

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(today());
}

// ─── Helper: is stock low? ────────────────────────────────────────────────────

function isLowStock(qty) {
  return Number(qty) <= LOW_STOCK_THRESHOLD && Number(qty) > 0;
}

// ─── Simple Toast (inline — no external dependency) ───────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
  };

  return (
    <div
      className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white shadow-lg flex items-center gap-3 ${colors[type] || "bg-gray-700"}`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="font-bold text-lg leading-none">
        ×
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function downloadMedicinePDF(medicine) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("MediCare Pro", 20, 20);

  doc.setFontSize(14);
  doc.text("Pharmacy Medicine Report", 20, 35);

  doc.line(20, 42, 190, 42);

  doc.setFontSize(11);
  doc.text(`Medicine ID: ${medicine.medicineId}`, 20, 58);
  doc.text(`Name: ${medicine.name}`, 20, 70);
  doc.text(`Category: ${medicine.category}`, 20, 82);
  doc.text(`Stock Quantity: ${medicine.quantity}`, 20, 94);
  doc.text(`Price: Rs. ${Number(medicine.price).toFixed(2)}`, 20, 106);
  doc.text(`Supplier: ${medicine.supplier}`, 20, 118);
  doc.text(`Expiry Date: ${medicine.expiryDate}`, 20, 130);
  doc.text(`Status: ${medicine.status}`, 20, 142);

  doc.line(20, 155, 190, 155);

  doc.setFontSize(9);
  doc.text("This is a computer-generated pharmacy inventory report.", 20, 170);

  doc.save(`${medicine.medicineId}_medicine_report.pdf`);
}
export default function PharmacyPage() {
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
  // ── Load from localStorage on first render ──────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMedicines(JSON.parse(saved));
      } catch {
        setMedicines([]);
      }
    }
  }, []);

  // ── Save to localStorage whenever medicines change ──────────────────────────

  useEffect(() => {
    if (medicines.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    }
  }, [medicines]);

  // ── Toast helper ────────────────────────────────────────────────────────────

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  // ── Handle form field changes ───────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── Open blank form (Add mode) ──────────────────────────────────────────────

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  // ── Open form pre-filled (Edit mode) ───────────────────────────────────────

  function openEditForm(medicine) {
    setForm(medicine);
    setEditingId(medicine.medicineId);
    setShowForm(true);
  }

  // ── Cancel / close form ─────────────────────────────────────────────────────

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  // ── Validate form ───────────────────────────────────────────────────────────

  function validate() {
    if (!form.medicineId.trim()) return "Medicine ID is required.";
    if (!form.name.trim()) return "Medicine Name is required.";
    if (!form.category) return "Category is required.";
    if (form.quantity === "" || isNaN(form.quantity) || Number(form.quantity) < 0)
      return "Stock Quantity must be a valid non-negative number.";
    if (form.price === "" || isNaN(form.price) || Number(form.price) < 0)
      return "Price must be a valid non-negative number.";
    if (!form.supplier.trim()) return "Supplier is required.";
    if (!form.expiryDate) return "Expiry Date is required.";
    return null; // no error
  }

  // ── Submit: Add or Update ───────────────────────────────────────────────────

  function handleSubmit() {
    const error = validate();
    if (error) {
      showToast(error, "error");
      return;
    }

    if (editingId) {
      // Update existing record
      setMedicines((prev) =>
        prev.map((m) => (m.medicineId === editingId ? { ...form } : m))
      );
      showToast("Medicine updated successfully.", "success");
    } else {
      // Check for duplicate ID
      const duplicate = medicines.find(
        (m) => m.medicineId === form.medicineId.trim()
      );
      if (duplicate) {
        showToast("A medicine with this ID already exists.", "error");
        return;
      }
      setMedicines((prev) => [...prev, { ...form }]);
      showToast("Medicine added successfully.", "success");
    }

    closeForm();
  }

  // ── Delete a medicine ───────────────────────────────────────────────────────

  function handleDelete(medicineId) {
    if (!window.confirm("Delete this medicine record?")) return;
    setMedicines((prev) => prev.filter((m) => m.medicineId !== medicineId));
    showToast("Medicine deleted.", "warning");
  }

  // ── Filtered & searched list ────────────────────────────────────────────────

  const filtered = medicines.filter((m) => {
    const term = search.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(term) ||
      m.medicineId.toLowerCase().includes(term) ||
      m.supplier.toLowerCase().includes(term);

    const matchesCategory =
      filterCategory === "All" || m.category === filterCategory;

    const matchesStatus =
      filterStatus === "All" || m.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // ── Summary counts ──────────────────────────────────────────────────────────

  const totalMedicines = medicines.length;
  const lowStockCount = medicines.filter((m) => isLowStock(m.quantity)).length;
  const expiredCount = medicines.filter((m) => isExpired(m.expiryDate)).length;
  const outOfStockCount = medicines.filter(
    (m) => Number(m.quantity) === 0
  ).length;
  const inventoryValue = medicines.reduce(
    (sum, m) => sum + Number(m.quantity) * Number(m.price),
    0
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            💊 Pharmacy Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage medicines, stock levels, and expiry dates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg"
          >
            📷 Scan Barcode
          </button>

          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow"
          >
            + Add Medicine
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          label="Total Medicines"
          value={totalMedicines}
          color="blue"
          icon="📦"
        />
        <SummaryCard
          label="Low Stock"
          value={lowStockCount}
          color="yellow"
          icon="⚠️"
        />
        <SummaryCard
          label="Expired"
          value={expiredCount}
          color="red"
          icon="🚫"
        />
        <SummaryCard
          label="Out of Stock"
          value={outOfStockCount}
          color="gray"
          icon="❌"
        />
        <SummaryCard
          label="Inventory Value"
          value={`₹${inventoryValue.toFixed(2)}`}
          color="blue"
          icon="💰"
        />
      </div>

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
      {lowStockCount > 0 && (
        <AlertBanner
          type="warning"
          message={`⚠️ ${lowStockCount} medicine(s) are running low on stock (≤${LOW_STOCK_THRESHOLD} units).`}
        />
      )}
      {expiredCount > 0 && (
        <AlertBanner
          type="error"
          message={`🚫 ${expiredCount} medicine(s) have passed their expiry date. Please review and remove them.`}
        />
      )}

      {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name, ID, or supplier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ── Medicine Table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Medicine Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price (₹)</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Expiry Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No medicines found. Add one to get started.
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

        {/* Row count */}
        {filtered.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            Showing {filtered.length} of {totalMedicines} medicine(s)
          </div>
        )}
      </div>

      {/* ── Add / Edit Form Modal ──────────────────────────────────────────── */}
      {showForm && (
        <FormModal
          form={form}
          editingId={editingId}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {viewingMedicine && (
  <div
    className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
    onClick={() => setViewingMedicine(null)}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-lg font-bold text-gray-800">💊 Medicine Details</h2>
        <button
          onClick={() => setViewingMedicine(null)}
          className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="px-6 py-5 space-y-3 text-sm">
        {[
          ["Medicine ID", viewingMedicine.medicineId],
          ["Name", viewingMedicine.name],
          ["Category", viewingMedicine.category],
          ["Stock", viewingMedicine.quantity],
          ["Price", `₹${Number(viewingMedicine.price).toFixed(2)}`],
          ["Supplier", viewingMedicine.supplier],
          ["Expiry Date", viewingMedicine.expiryDate],
          ["Status", viewingMedicine.status],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b pb-2">
            <span className="text-gray-500 font-medium">{k}</span>
            <span className="text-gray-800 text-right">{v}</span>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t text-right">
        <button
          onClick={() => setViewingMedicine(null)}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Barcode Scanner Modal ─────────────────────────────────────────── */}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            setScannedCode(code);
            setShowScanner(false);

            setForm((prev) => ({
              ...prev,
              medicineId: code,
            }));

            showToast(`Barcode scanned: ${code}`, "success");
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// Summary card at the top
function SummaryCard({ label, value, color, icon }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

// Coloured alert banner
function AlertBanner({ type, message }) {
  const styles = {
    warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
    error: "bg-red-50 border-red-400 text-red-800",
  };

  return (
    <div className={`border-l-4 px-4 py-3 rounded mb-4 text-sm ${styles[type]}`}>
      {message}
    </div>
  );
}

// One row in the medicine table
function TableRow({ medicine, onEdit, onDelete, onView, onPDF }) {
  const expired = isExpired(medicine.expiryDate);
  const lowStock = isLowStock(medicine.quantity);

  // Status badge colours
  const statusBadge = {
    Available: "bg-green-100 text-green-700",
    "Out of Stock": "bg-red-100 text-red-700",
    Discontinued: "bg-gray-200 text-gray-600",
  };

  return (
    <tr className={expired ? "bg-red-50" : lowStock ? "bg-yellow-50" : "hover:bg-gray-50"}>
      <td className="px-4 py-3 font-mono text-gray-500">{medicine.medicineId}</td>
      <td className="px-4 py-3 font-medium text-gray-800">{medicine.name}</td>
      <td className="px-4 py-3 text-gray-600">{medicine.category}</td>

      {/* Stock — show warning badge if low */}
      <td className="px-4 py-3">
        <span
          className={`font-semibold ${
            Number(medicine.quantity) === 0
              ? "text-red-600"
              : lowStock
              ? "text-yellow-600"
              : "text-gray-800"
          }`}
        >
          {medicine.quantity}
        </span>
        {lowStock && (
          <span className="ml-1 text-yellow-500 text-xs">(Low)</span>
        )}
        {Number(medicine.quantity) === 0 && (
          <span className="ml-1 text-red-500 text-xs">(Out)</span>
        )}
      </td>

      <td className="px-4 py-3 text-gray-700">₹{Number(medicine.price).toFixed(2)}</td>
      <td className="px-4 py-3 text-gray-600">{medicine.supplier}</td>

      {/* Expiry — highlight red if expired */}
      <td className="px-4 py-3">
        <span className={expired ? "text-red-600 font-semibold" : "text-gray-600"}>
          {medicine.expiryDate}
          {expired && <span className="ml-1 text-xs">(Expired)</span>}
        </span>
      </td>

      {/* Status badge */}
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            statusBadge[medicine.status] || "bg-gray-100 text-gray-600"
          }`}
        >
          {medicine.status}
        </span>
      </td>

      {/* Edit / Delete buttons */}
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
  onClick={() => onView(medicine)}
  className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 hover:border-green-400 px-2 py-1 rounded transition"
>
  View
</button>

<button
  onClick={() => onPDF(medicine)}
  className="text-purple-600 hover:text-purple-800 text-xs font-medium border border-purple-200 hover:border-purple-400 px-2 py-1 rounded transition"
>
  PDF
</button>
          <button
            onClick={() => onEdit(medicine)}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 hover:border-blue-400 px-2 py-1 rounded transition"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(medicine.medicineId)}
            className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 hover:border-red-400 px-2 py-1 rounded transition"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// Add / Edit form inside a modal overlay
function FormModal({ form, editingId, onChange, onSubmit, onClose }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {editingId ? "✏️ Edit Medicine" : "➕ Add Medicine"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form fields */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Medicine ID *"
            name="medicineId"
            value={form.medicineId}
            onChange={onChange}
            placeholder="e.g. MED-001"
            disabled={!!editingId}
          />
          <Field
            label="Medicine Name *"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="e.g. Paracetamol 500mg"
          />

          {/* Category dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category *</label>
            <select
              name="category"
              value={form.category}
              onChange={onChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <Field
            label="Stock Quantity *"
            name="quantity"
            type="number"
            value={form.quantity}
            onChange={onChange}
            placeholder="e.g. 50"
            min="0"
          />
          <Field
            label="Price (₹) *"
            name="price"
            type="number"
            value={form.price}
            onChange={onChange}
            placeholder="e.g. 12.50"
            min="0"
            step="0.01"
          />
          <Field
            label="Supplier *"
            name="supplier"
            value={form.supplier}
            onChange={onChange}
            placeholder="e.g. Sun Pharma"
          />
          <Field
            label="Expiry Date *"
            name="expiryDate"
            type="date"
            value={form.expiryDate}
            onChange={onChange}
          />

          {/* Status dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow"
          >
            {editingId ? "Save Changes" : "Add Medicine"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable labelled input field
function Field({ label, name, value, onChange, type = "text", placeholder, disabled, min, step }) {
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
        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
        }`}
      />
    </div>
  );
}