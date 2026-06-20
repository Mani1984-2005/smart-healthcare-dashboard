// FILE PATH: src/pages/BillingPage.jsx
// Day 3 — Billing Module | MediCare Pro
// Features: Create invoices, line items, payment status, totals, search/filter, LocalStorage

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "billing_invoices";

const PAYMENT_STATUS = ["Unpaid", "Partial", "Paid", "Cancelled"];

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Insurance", "Bank Transfer", "Other"];

const SERVICE_TYPES = [
  "Consultation",
  "Lab Test",
  "X-Ray / Scan",
  "Surgery",
  "Room Charges",
  "Pharmacy",
  "Nursing",
  "Emergency",
  "Other",
];

// Empty line item
const emptyItem = { description: "", serviceType: "", qty: 1, unitPrice: "", discount: 0 };

// Empty invoice
const emptyInvoice = {
  invoiceId: "",
  patientName: "",
  patientId: "",
  doctorName: "",
  invoiceDate: "",
  dueDate: "",
  paymentStatus: "Unpaid",
  paymentMethod: "",
  paidAmount: "",
  notes: "",
  items: [{ ...emptyItem }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genInvoiceId() {
  return "INV-" + Date.now().toString().slice(-6);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// Calculate line total
function lineTotal(item) {
  const base = Number(item.qty) * Number(item.unitPrice || 0);
  const disc = (base * Number(item.discount || 0)) / 100;
  return base - disc;
}

// Calculate invoice grand total
function grandTotal(items) {
  return items.reduce((sum, i) => sum + lineTotal(i), 0);
}

// Format currency
function fmt(n) {
  return "₹" + Number(n).toFixed(2);
}

// ─── Toast ────────────────────────────────────────────────────────────────────

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

// ─── Print / PDF helper ───────────────────────────────────────────────────────

function printInvoice(invoice) {
  const total = grandTotal(invoice.items);
  const paid = Number(invoice.paidAmount || 0);
  const balance = total - paid;

  const html = `
    <html><head><title>Invoice ${invoice.invoiceId}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
      h1 { color: #2563eb; } table { width:100%; border-collapse:collapse; margin-top:16px; }
      th { background:#f3f4f6; padding:8px; text-align:left; font-size:13px; }
      td { padding:8px; border-bottom:1px solid #e5e7eb; font-size:13px; }
      .total-row td { font-weight:bold; background:#f9fafb; }
      .info { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; font-size:13px; }
      .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600;
        background:${invoice.paymentStatus === "Paid" ? "#dcfce7" : "#fef9c3"}; 
        color:${invoice.paymentStatus === "Paid" ? "#166534" : "#854d0e"}; }
    </style></head><body>
    <h1>🏥 MediCare Pro — Invoice</h1>
    <div class="info">
      <div><b>Invoice ID:</b> ${invoice.invoiceId}</div>
      <div><b>Date:</b> ${invoice.invoiceDate}</div>
      <div><b>Patient:</b> ${invoice.patientName} (${invoice.patientId || "—"})</div>
      <div><b>Doctor:</b> ${invoice.doctorName || "—"}</div>
      <div><b>Due Date:</b> ${invoice.dueDate || "—"}</div>
      <div><b>Status:</b> <span class="badge">${invoice.paymentStatus}</span></div>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Type</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Total</th></tr></thead>
      <tbody>
        ${invoice.items.map((i) => `<tr>
          <td>${i.description}</td><td>${i.serviceType}</td><td>${i.qty}</td>
          <td>${fmt(i.unitPrice)}</td><td>${i.discount}%</td><td>${fmt(lineTotal(i))}</td>
        </tr>`).join("")}
        <tr class="total-row"><td colspan="5" style="text-align:right">Grand Total</td><td>${fmt(total)}</td></tr>
        <tr class="total-row"><td colspan="5" style="text-align:right">Paid</td><td>${fmt(paid)}</td></tr>
        <tr class="total-row"><td colspan="5" style="text-align:right">Balance Due</td><td>${fmt(balance)}</td></tr>
      </tbody>
    </table>
    ${invoice.notes ? `<p style="margin-top:16px;font-size:12px;color:#6b7280"><b>Notes:</b> ${invoice.notes}</p>` : ""}
    </body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.print();
}function downloadInvoicePDF(invoice) {
  const doc = new jsPDF();
  const total = grandTotal(invoice.items);
  const paid = Number(invoice.paidAmount || 0);
  const balance = total - paid;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("MediCare Pro", 20, 13);
  doc.setFontSize(10);
  doc.text("Smart Hospital Management System", 20, 21);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text("PATIENT RECEIPT", 20, 40);

  doc.setFontSize(10);
  doc.text(`Invoice ID: ${invoice.invoiceId}`, 20, 50);
  doc.text(`Date: ${invoice.invoiceDate}`, 130, 50);
  doc.text(`Patient: ${invoice.patientName}`, 20, 58);
  doc.text(`Patient ID: ${invoice.patientId || "-"}`, 20, 66);
  doc.text(`Doctor: ${invoice.doctorName || "-"}`, 130, 58);
  doc.text(`Status: ${invoice.paymentStatus}`, 130, 66);

  doc.setDrawColor(200);
  doc.line(20, 75, 190, 75);

  let y = 85;
  doc.setFontSize(10);
  doc.text("Description", 20, y);
  doc.text("Qty", 95, y);
  doc.text("Unit Price", 115, y);
  doc.text("Total", 160, y);
  doc.line(20, y + 3, 190, y + 3);

  y += 10;

  invoice.items.forEach((item) => {
    doc.text(String(item.description).slice(0, 32), 20, y);
    doc.text(String(item.qty), 95, y);
    doc.text(`Rs. ${Number(item.unitPrice || 0).toFixed(2)}`, 115, y);
    doc.text(`Rs. ${lineTotal(item).toFixed(2)}`, 160, y);
    y += 8;
  });

  y += 6;
  doc.line(20, y, 190, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Grand Total: Rs. ${total.toFixed(2)}`, 120, y);
  y += 8;
  doc.text(`Paid: Rs. ${paid.toFixed(2)}`, 120, y);
  y += 8;
  doc.text(`Balance Due: Rs. ${balance.toFixed(2)}`, 120, y);

  y += 15;
  doc.setDrawColor(150);
  doc.rect(20, y, 35, 25);
  doc.setFontSize(8);
  doc.text("QR Placeholder", 24, y + 14);

  doc.setFontSize(9);
  doc.text("Thank you for choosing MediCare Pro.", 70, y + 8);
  doc.text("This is a computer-generated receipt.", 70, y + 16);

  if (invoice.notes) {
    y += 35;
    doc.setFontSize(9);
    doc.text(`Notes: ${invoice.notes}`, 20, y);
  }

  doc.save(`${invoice.invoiceId}_receipt.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(emptyInvoice);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast, setToast] = useState(null);

  // Load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { setInvoices(JSON.parse(saved)); } catch { setInvoices([]); } }
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }, [invoices]);

  function showToast(msg, type = "success") { setToast({ message: msg, type }); }

  // ── Form field handlers ───────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleItemChange(index, e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [name]: value };
      return { ...prev, items };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function openAddForm() {
    setForm({ ...emptyInvoice, invoiceId: genInvoiceId(), invoiceDate: today() });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(inv) {
    setForm(inv);
    setEditingId(inv.invoiceId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyInvoice);
    setEditingId(null);
    setShowForm(false);
  }

  function validate() {
    if (!form.patientName.trim()) return "Patient Name is required.";
    if (!form.invoiceDate) return "Invoice Date is required.";
    if (form.items.length === 0) return "At least one line item is required.";
    for (const item of form.items) {
      if (!item.description.trim()) return "All items need a description.";
      if (!item.unitPrice || isNaN(item.unitPrice)) return "All items need a valid unit price.";
    }
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) { showToast(error, "error"); return; }

    const total = grandTotal(form.items);
    const data = { ...form, total };

    if (editingId) {
      setInvoices((prev) => prev.map((inv) => inv.invoiceId === editingId ? data : inv));
      showToast("Invoice updated.", "success");
    } else {
      setInvoices((prev) => [...prev, data]);
      showToast("Invoice created.", "success");
    }
    closeForm();
  }

  function handleDelete(invoiceId) {
    if (!window.confirm("Delete this invoice?")) return;
    setInvoices((prev) => prev.filter((inv) => inv.invoiceId !== invoiceId));
    showToast("Invoice deleted.", "warning");
  }

  function updatePaymentStatus(invoiceId, newStatus) {
    setInvoices((prev) => prev.map((inv) => inv.invoiceId === invoiceId ? { ...inv, paymentStatus: newStatus } : inv));
    showToast(`Status set to ${newStatus}.`, "success");
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = invoices.filter((inv) => {
    const term = search.toLowerCase();
    const matchSearch =
      inv.patientName.toLowerCase().includes(term) ||
      inv.invoiceId.toLowerCase().includes(term) ||
      (inv.doctorName || "").toLowerCase().includes(term);
    const matchStatus = filterStatus === "All" || inv.paymentStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Summary ────────────────────────────────────────────────────────────────

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
  const totalDue = invoices.reduce((s, i) => s + (grandTotal(i.items) - Number(i.paidAmount || 0)), 0);
  const unpaidCount = invoices.filter((i) => i.paymentStatus === "Unpaid").length;
  const paidCount = invoices.filter((i) => i.paymentStatus === "Paid").length;

  const statusColors = {
    Paid: "bg-green-100 text-green-700",
    Unpaid: "bg-red-100 text-red-700",
    Partial: "bg-yellow-100 text-yellow-700",
    Cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💳 Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage patient invoices and payments.</p>
        </div>
        <button onClick={openAddForm}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg transition shadow">
          + New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Collected" value={fmt(totalRevenue)} color="green" icon="💰" />
        <SummaryCard label="Total Due" value={fmt(totalDue)} color="red" icon="📋" />
        <SummaryCard label="Unpaid Invoices" value={unpaidCount} color="yellow" icon="⏳" />
        <SummaryCard label="Paid Invoices" value={paidCount} color="blue" icon="✅" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input type="text" placeholder="Search patient, invoice ID, doctor…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="All">All Statuses</option>
          {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Invoice ID</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No invoices yet. Click "+ New Invoice" to create one.</td></tr>
            ) : (
              filtered.map((inv) => {
                const total = grandTotal(inv.items);
                const paid = Number(inv.paidAmount || 0);
                const balance = total - paid;
                return (
                  <tr key={inv.invoiceId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.invoiceId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{inv.patientName}</p>
                      <p className="text-xs text-gray-400">{inv.patientId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.doctorName || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.invoiceDate}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(total)}</td>
                    <td className="px-4 py-3 text-green-600">{fmt(paid)}</td>
                    <td className={`px-4 py-3 font-semibold ${balance > 0 ? "text-red-600" : "text-gray-400"}`}>{fmt(balance)}</td>
                    <td className="px-4 py-3">
                      <select value={inv.paymentStatus} onChange={(e) => updatePaymentStatus(inv.invoiceId, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${statusColors[inv.paymentStatus]}`}>
                        {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setViewingInvoice(inv)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs font-medium border border-emerald-200 px-2 py-1 rounded transition">View</button>
                        <button onClick={() => printInvoice(inv)}
                          className="text-purple-600 hover:text-purple-800 text-xs font-medium border border-purple-200 px-2 py-1 rounded transition">Print</button>
                          <button
                               onClick={() => downloadInvoicePDF(inv)}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 px-2 py-1 rounded transition"
                                        >
                                           PDF
                                            </button>
                          
                        <button onClick={() => openEditForm(inv)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-2 py-1 rounded transition">Edit</button>
                        <button onClick={() => handleDelete(inv.invoiceId)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 px-2 py-1 rounded transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            Showing {filtered.length} of {invoices.length} invoice(s)
          </div>
        )}
      </div>

      {/* Add/Edit Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editingId ? "✏️ Edit Invoice" : "➕ New Invoice"}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Patient & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabeledField label="Invoice ID" name="invoiceId" value={form.invoiceId} disabled />
                <LabeledField label="Patient Name *" name="patientName" value={form.patientName} onChange={handleChange} placeholder="Full name" />
                <LabeledField label="Patient ID" name="patientId" value={form.patientId} onChange={handleChange} placeholder="e.g. PAT-001" />
                <LabeledField label="Doctor Name" name="doctorName" value={form.doctorName} onChange={handleChange} placeholder="Dr. Name" />
                <LabeledField label="Invoice Date *" name="invoiceDate" value={form.invoiceDate} onChange={handleChange} type="date" />
                <LabeledField label="Due Date" name="dueDate" value={form.dueDate} onChange={handleChange} type="date" />
                <LabeledSelect label="Payment Status" name="paymentStatus" value={form.paymentStatus} onChange={handleChange} options={PAYMENT_STATUS} />
                <LabeledSelect label="Payment Method" name="paymentMethod" value={form.paymentMethod} onChange={handleChange} options={PAYMENT_METHODS} placeholder="Select method…" />
                <LabeledField label="Amount Paid (₹)" name="paidAmount" value={form.paidAmount} onChange={handleChange} type="number" min="0" placeholder="0.00" />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Line Items</h3>
                  <button onClick={addItem}
                    className="text-sm text-emerald-600 hover:text-emerald-800 border border-emerald-300 px-3 py-1 rounded-lg transition">
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-gray-50 rounded-lg p-3">
                      <div className="col-span-12 sm:col-span-4">
                        <input name="description" value={item.description} onChange={(e) => handleItemChange(idx, e)}
                          placeholder="Description *" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <select name="serviceType" value={item.serviceType} onChange={(e) => handleItemChange(idx, e)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400">
                          <option value="">Type…</option>
                          {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <input name="qty" value={item.qty} onChange={(e) => handleItemChange(idx, e)} type="number" min="1"
                          placeholder="Qty" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                      <div className="col-span-5 sm:col-span-2">
                        <input name="unitPrice" value={item.unitPrice} onChange={(e) => handleItemChange(idx, e)} type="number" min="0"
                          placeholder="Unit Price *" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <input name="discount" value={item.discount} onChange={(e) => handleItemChange(idx, e)} type="number" min="0" max="100"
                          placeholder="Disc%" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                      <div className="col-span-4 sm:col-span-1 flex items-center">
                        <span className="text-sm font-semibold text-gray-700">{fmt(lineTotal(item))}</span>
                      </div>
                      <div className="col-span-3 sm:col-span-1 flex items-center justify-end">
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Grand total preview */}
                <div className="flex justify-end mt-3 pr-2">
                  <div className="bg-gray-100 rounded-lg px-5 py-3 text-right">
                    <p className="text-xs text-gray-500">Grand Total</p>
                    <p className="text-xl font-bold text-gray-800">{fmt(grandTotal(form.items))}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Paid: {fmt(form.paidAmount || 0)} | Balance: {fmt(grandTotal(form.items) - Number(form.paidAmount || 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Any billing notes…"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow">
                {editingId ? "Save Changes" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setViewingInvoice(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">🧾 Invoice — {viewingInvoice.invoiceId}</h2>
              <button onClick={() => setViewingInvoice(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Patient", viewingInvoice.patientName],
                  ["Patient ID", viewingInvoice.patientId || "—"],
                  ["Doctor", viewingInvoice.doctorName || "—"],
                  ["Invoice Date", viewingInvoice.invoiceDate],
                  ["Due Date", viewingInvoice.dueDate || "—"],
                  ["Payment Method", viewingInvoice.paymentMethod || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">{k}</p>
                    <p className="text-gray-800 font-medium mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-xs text-gray-600">Description</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-600">Qty</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-600">Unit Price</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-600">Disc</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewingInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{item.description} <span className="text-gray-400 text-xs">({item.serviceType})</span></td>
                      <td className="px-3 py-2 text-right">{item.qty}</td>
                      <td className="px-3 py-2 text-right">{fmt(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{item.discount}%</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(lineTotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right space-y-1 pr-3">
                <p className="text-gray-600">Grand Total: <span className="font-bold text-gray-800 text-base">{fmt(grandTotal(viewingInvoice.items))}</span></p>
                <p className="text-green-600">Paid: {fmt(viewingInvoice.paidAmount || 0)}</p>
                <p className="text-red-500">Balance: {fmt(grandTotal(viewingInvoice.items) - Number(viewingInvoice.paidAmount || 0))}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => printInvoice(viewingInvoice)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition">🖨️ Print / PDF</button>
              <button onClick={() => setViewingInvoice(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon }) {
  const colorMap = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

function LabeledField({ label, name, value, onChange, type = "text", placeholder, disabled, min }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled} min={min}
        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`} />
    </div>
  );
}

function LabeledSelect({ label, name, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select name={name} value={value} onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}