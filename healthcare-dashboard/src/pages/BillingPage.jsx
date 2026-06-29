// src/pages/BillingPage.jsx
// Enterprise Hospital Billing Module
// Storage key: "billing_invoices"

import { useState, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";

function getBills() {
  try {
    return JSON.parse(localStorage.getItem("billing_invoices") || "[]");
  } catch {
    return [];
  }
}

function saveBills(bills) {
  localStorage.setItem("billing_invoices", JSON.stringify(bills));
}

function generateBillId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${d}-${rand}`;
}

function computeTotals(charges, discountPct, gstPct) {
  const subtotal = Object.values(charges || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const discount = (subtotal * (parseFloat(discountPct) || 0)) / 100;
  const taxable = subtotal - discount;
  const gst = (taxable * (parseFloat(gstPct) || 0)) / 100;
  const grand = taxable + gst;
  return { subtotal, discount, taxable, gst, grand };
}

function getBillingSummary(bills) {
  const today = new Date().toISOString().split("T")[0];
  const nowMonth = today.slice(0, 7);

  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split("T")[0];
  })();

  let revenueToday = 0;
  let revenueWeek = 0;
  let revenueMonth = 0;
  let pending = 0;
  let insurance = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let highest = 0;

  bills.forEach((b) => {
    const amt = parseFloat(b.grandTotal) || 0;
    if (b.billDate === today) revenueToday += amt;
    if ((b.billDate || "") >= weekStart) revenueWeek += amt;
    if ((b.billDate || "").startsWith(nowMonth)) revenueMonth += amt;
    if (b.paymentStatus === "Pending" || b.paymentStatus === "Partial") pending += parseFloat(b.dueAmount) || 0;
    if (b.paymentMethod === "Insurance") insurance += amt;
    if (b.paymentStatus === "Paid") paidCount += 1;
    else pendingCount += 1;
    if (amt > highest) highest = amt;
  });

  const totalRevenue = bills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0);
  const avg = bills.length ? totalRevenue / bills.length : 0;

  return {
    revenueToday,
    revenueWeek,
    revenueMonth,
    pending,
    insurance,
    paidCount,
    pendingCount,
    highest,
    avg,
    total: bills.length,
  };
}

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return Number.isNaN(d.getTime())
    ? str
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: "border-green-500 bg-green-50 text-green-800",
    error: "border-red-500 bg-red-50 text-red-800",
    warning: "border-yellow-500 bg-yellow-50 text-yellow-800",
  };

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 border-l-4 rounded-lg shadow-lg px-4 py-3 max-w-sm w-full text-sm ${
        styles[type] || styles.success
      }`}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none">
        ×
      </button>
    </div>
  );
}

const STATUS_STYLES = {
  Paid: "bg-green-100 text-green-700 border border-green-200",
  Pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  Partial: "bg-blue-100 text-blue-700 border border-blue-200",
  Refunded: "bg-red-100 text-red-700 border border-red-200",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "—"}
    </span>
  );
}

const CHARGE_FIELDS = [
  { key: "consultationFee", label: "Consultation Fee" },
  { key: "labCharges", label: "Laboratory Charges" },
  { key: "pharmacyCharges", label: "Pharmacy Charges" },
  { key: "procedureCharges", label: "Procedure Charges" },
  { key: "roomCharges", label: "Room Charges" },
  { key: "nursingCharges", label: "Nursing Charges" },
  { key: "miscCharges", label: "Miscellaneous" },
];

function generateInvoicePDF(bill) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pw, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MediCare Pro", 40, 38);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Enterprise Hospital Management System", 40, 56);
  doc.text("123 Healthcare Avenue, Medical City | Tel: +91-9876543210", 40, 70);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pw - 40, 38, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Invoice No: ${bill.billId}`, pw - 40, 56, { align: "right" });
  doc.text(`Date: ${fmtDate(bill.billDate)}`, pw - 40, 70, { align: "right" });

  let y = 105;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(30, y, pw - 60, 80, 4, 4, "F");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 44, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(bill.patientName || "—", 44, y + 30);
  doc.text(`Patient ID: ${bill.patientId || "—"}`, 44, y + 44);
  doc.text(`Dept: ${bill.department || "—"}`, 44, y + 58);

  doc.setFont("helvetica", "bold");
  doc.text("ATTENDING DOCTOR", pw / 2, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(bill.doctorName || "—", pw / 2, y + 30);
  doc.text(`Billing Staff: ${bill.billingStaff || "Reception"}`, pw / 2, y + 44);
  doc.text(`Payment Method: ${bill.paymentMethod || "—"}`, pw / 2, y + 58);

  doc.setDrawColor(200, 200, 200);
  doc.rect(pw - 100, y + 4, 68, 68);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("QR CODE", pw - 66, y + 42, { align: "center" });

  y += 100;
  doc.setFillColor(30, 64, 175);
  doc.rect(30, y, pw - 60, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", 44, y + 14);
  doc.text("Amount", pw - 44, y + 14, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  CHARGE_FIELDS.forEach(({ key, label }, idx) => {
    const val = parseFloat(bill.charges?.[key]) || 0;
    if (val === 0) return;
    if (idx % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(30, y, pw - 60, 20, "F");
    }
    doc.text(label, 44, y + 13);
    doc.text(fmt(val), pw - 44, y + 13, { align: "right" });
    y += 20;
  });

  y += 10;
  const lineX = pw - 200;
  const { subtotal, discount, gst, grand } = computeTotals(bill.charges || {}, bill.discountPct, bill.gstPct);
  const totRows = [
    ["Subtotal", fmt(subtotal)],
    [`Discount (${bill.discountPct || 0}%)`, `-${fmt(discount)}`],
    [`GST (${bill.gstPct || 0}%)`, fmt(gst)],
  ];

  doc.setFontSize(9);
  totRows.forEach(([label, value]) => {
    doc.setTextColor(80, 80, 80);
    doc.text(label, lineX, y);
    doc.text(value, pw - 44, y, { align: "right" });
    y += 18;
  });

  doc.setDrawColor(200, 200, 200);
  doc.line(lineX, y - 4, pw - 30, y - 4);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Grand Total", lineX, y + 8);
  doc.text(fmt(grand), pw - 44, y + 8, { align: "right" });
  y += 24;

  doc.setFontSize(9);
  doc.setTextColor(220, 40, 40);
  doc.text(`Due Amount: ${fmt(bill.dueAmount || 0)}`, lineX, y);
  doc.setTextColor(30, 30, 30);
  doc.text(`Status: ${bill.paymentStatus || "—"}`, pw - 44, y, { align: "right" });

  if (bill.notes) {
    y += 30;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Notes: ${bill.notes}`, 40, y);
  }

  y = ph - 90;
  doc.setDrawColor(200, 200, 200);
  doc.line(44, y, 180, y);
  doc.line(pw - 180, y, pw - 44, y);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Authorized Signatory", 44, y + 14);
  doc.text("Patient / Representative", pw - 44, y + 14, { align: "right" });

  doc.setFillColor(30, 64, 175);
  doc.rect(0, ph - 32, pw, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Thank you for choosing MediCare Pro. Get well soon!", pw / 2, ph - 14, { align: "center" });

  doc.save(`${bill.billId}.pdf`);
}

const EMPTY_CHARGES = {
  consultationFee: "",
  labCharges: "",
  pharmacyCharges: "",
  procedureCharges: "",
  roomCharges: "",
  nursingCharges: "",
  miscCharges: "",
};

function BillForm({ mode, initialData, onSubmit, onCancel, saving }) {
  const patients = (() => {
    try {
      return JSON.parse(localStorage.getItem("patients") || "[]");
    } catch {
      return [];
    }
  })();

  const doctors = (() => {
    try {
      return JSON.parse(localStorage.getItem("doctors") || "[]");
    } catch {
      return [];
    }
  })();

  const [form, setForm] = useState(() => {
    if (mode === "edit" && initialData) {
      return {
        ...initialData,
        charges: { ...EMPTY_CHARGES, ...(initialData.charges || {}) },
      };
    }
    return {
      billId: generateBillId(),
      billDate: new Date().toISOString().split("T")[0],
      patientId: "",
      patientName: "",
      doctorName: "",
      department: "",
      billingStaff: "Reception",
      charges: { ...EMPTY_CHARGES },
      discountPct: "0",
      gstPct: "5",
      paymentMethod: "Cash",
      paymentStatus: "Paid",
      paidAmount: "",
      notes: "",
    };
  });

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function setCharge(key, val) {
    setForm((f) => ({ ...f, charges: { ...f.charges, [key]: val } }));
  }

  function handlePatientSelect(e) {
    const p = patients.find((x) => x.id === e.target.value || String(x.id) === e.target.value);
    if (p) {
      set("patientId", p.id);
      set("patientName", p.name);
    }
  }

  function handleDoctorSelect(e) {
    const d = doctors.find((x) => x.id === e.target.value || String(x.id) === e.target.value);
    if (d) {
      set("doctorName", d.name || d.fullName);
      set("department", d.department || d.specialization || "");
    }
  }

  const { subtotal, discount, gst, grand } = computeTotals(form.charges, form.discountPct, form.gstPct);
  const paid = parseFloat(form.paidAmount) || (form.paymentStatus === "Paid" ? grand : 0);
  const due = Math.max(0, grand - paid);

  function handleSubmit() {
    if (!form.patientName || !form.patientName.trim()) {
      alert("Patient name is required.");
      return;
    }
    onSubmit({ ...form, grandTotal: grand.toFixed(2), paidAmount: paid.toFixed(2), dueAmount: due.toFixed(2) });
  }

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Invoice Number</label>
          <input className={`${inputCls} bg-slate-50 font-mono`} value={form.billId} readOnly />
        </div>
        <div>
          <label className={labelCls}>Bill Date</label>
          <input type="date" className={inputCls} value={form.billDate} onChange={(e) => set("billDate", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Select Patient</label>
          <select className={inputCls} onChange={handlePatientSelect} value={form.patientId || ""}>
            <option value="">— Select —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Patient Name</label>
          <input className={inputCls} placeholder="Or type manually" value={form.patientName} onChange={(e) => set("patientName", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Attending Doctor</label>
          <select
            className={inputCls}
            onChange={handleDoctorSelect}
            value={doctors.find((d) => (d.name || d.fullName) === form.doctorName)?.id || ""}
          >
            <option value="">— Select —</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || d.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <input className={inputCls} placeholder="e.g. Cardiology" value={form.department} onChange={(e) => set("department", e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-blue-600 rounded inline-block" />
          Charge Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHARGE_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                placeholder="0.00"
                value={form.charges[key]}
                onChange={(e) => setCharge(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Discount (%)</label>
          <input type="number" min="0" max="100" className={inputCls} value={form.discountPct} onChange={(e) => set("discountPct", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>GST (%)</label>
          <input type="number" min="0" max="100" className={inputCls} value={form.gstPct} onChange={(e) => set("gstPct", e.target.value)} />
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5 border border-slate-200">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-medium">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Discount ({form.discountPct}%)</span>
          <span className="text-red-600">-{fmt(discount)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>GST ({form.gstPct}%)</span>
          <span>{fmt(gst)}</span>
        </div>
        <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-base text-blue-700">
          <span>Grand Total</span>
          <span>{fmt(grand)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Payment Method</label>
          <select className={inputCls} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            {["Cash", "UPI", "Card", "Insurance", "Mixed"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Payment Status</label>
          <select className={inputCls} value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
            {["Paid", "Pending", "Partial", "Refunded"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {form.paymentStatus === "Partial" && (
        <div>
          <label className={labelCls}>Amount Paid (₹)</label>
          <input
            type="number"
            min="0"
            className={inputCls}
            value={form.paidAmount}
            onChange={(e) => set("paidAmount", e.target.value)}
            placeholder="Enter amount received"
          />
          <p className="text-xs text-red-600 mt-1">Due: {fmt(due)}</p>
        </div>
      )}

      <div>
        <label className={labelCls}>Billing Staff</label>
        <input className={inputCls} value={form.billingStaff} onChange={(e) => set("billingStaff", e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={2} className={`${inputCls} resize-none`} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes..." />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-10 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {saving ? "Saving…" : mode === "edit" ? "Update Bill" : "Create Bill"}
        </button>
      </div>
    </div>
  );
}

function BillTable({ bills, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = bills.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.billId?.toLowerCase().includes(q) ||
      b.patientName?.toLowerCase().includes(q) ||
      b.doctorName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || b.paymentStatus === statusFilter;
    const matchMethod = methodFilter === "All" || b.paymentMethod === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function confirmDelete(bill) {
    if (window.confirm(`Delete bill ${bill.billId}? This cannot be undone.`)) onDelete(bill.billId);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          placeholder="Search bill, patient, doctor…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex gap-2 flex-wrap">
          {["All", "Paid", "Pending", "Partial", "Refunded"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:ml-auto focus:outline-none text-slate-900"
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value);
            setPage(1);
          }}
        >
          {["All", "Cash", "UPI", "Card", "Insurance", "Mixed"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              {["Invoice", "Patient", "Doctor", "Date", "Grand Total", "Due", "Method", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-slate-400 text-sm">
                  No bills found. Create your first bill using the button above.
                </td>
              </tr>
            ) : (
              paged.map((b) => (
                <tr key={b.billId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700 font-semibold whitespace-nowrap">{b.billId}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{b.patientName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.doctorName || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(b.billDate)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{fmt(b.grandTotal)}</td>
                  <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">{fmt(b.dueAmount)}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.paymentMethod || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={b.paymentStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => generateInvoicePDF(b)}
                        title="Download PDF"
                        className="w-7 h-7 rounded-md bg-green-50 hover:bg-green-100 text-green-700 text-xs flex items-center justify-center transition-colors"
                      >
                        📄
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(b)}
                        title="Edit"
                        className="w-7 h-7 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs flex items-center justify-center transition-colors"
                      >
                        ✏
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(b)}
                        title="Delete"
                        className="w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-xs flex items-center justify-center transition-colors"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  page === i + 1 ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    indigo: "bg-indigo-50 text-indigo-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
    teal: "bg-teal-50 text-teal-700",
    orange: "bg-orange-50 text-orange-700",
    slate: "bg-slate-50 text-slate-700",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-lg ${tones[tone] || tones.blue}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function BillingPage({ darkMode }) {
  const [bills, setBillsState] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingBill, setEditingBill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const b = getBills();
    setBillsState(b);
    setSummary(getBillingSummary(b));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function showToast(msg, type = "success") {
    setToast({ message: msg, type });
  }

  function openCreate() {
    setFormMode("create");
    setEditingBill(null);
    setShowForm(true);
  }

  function openEdit(bill) {
    setFormMode("edit");
    setEditingBill(bill);
    setShowForm(true);
  }

  function handleFormSubmit(formData) {
    setSaving(true);
    try {
      const all = getBills();
      if (formMode === "edit") {
        const idx = all.findIndex((b) => b.billId === editingBill.billId);
        if (idx !== -1) all[idx] = { ...all[idx], ...formData };
        saveBills(all);
        showToast("Bill updated successfully.", "success");
      } else {
        const newBill = { ...formData, createdAt: new Date().toISOString() };
        saveBills([newBill, ...all]);

        const patients = (() => {
          try {
            return JSON.parse(localStorage.getItem("patients") || "[]");
          } catch {
            return [];
          }
        })();

        const updated = patients.map((p) => {
          const match =
            p.id === formData.patientId ||
            (p.name && formData.patientName && p.name.toLowerCase() === formData.patientName.toLowerCase());
          if (!match) return p;
          return {
            ...p,
            timeline: [
              ...(p.timeline || []),
              {
                id: Date.now(),
                date: formData.billDate || new Date().toISOString().split("T")[0],
                type: "Billing",
                title: "Bill Generated",
                details: `Invoice ${formData.billId} created. Amount: ${fmt(formData.grandTotal)}. Status: ${formData.paymentStatus}.`,
              },
            ],
          };
        });
        localStorage.setItem("patients", JSON.stringify(updated));
        window.dispatchEvent(new Event("patientsUpdated"));
        showToast("Bill created and patient timeline updated.", "success");
      }
      setShowForm(false);
      setEditingBill(null);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(billId) {
    const all = getBills().filter((b) => b.billId !== billId);
    saveBills(all);
    showToast("Bill deleted.", "warning");
    loadData();
  }

  const summaryCards = summary
    ? [
        { icon: "💳", label: "Total Bills", value: summary.total, tone: "blue" },
        { icon: "💰", label: "Revenue Today", value: fmt(summary.revenueToday), tone: "green" },
        { icon: "📅", label: "Revenue This Week", value: fmt(summary.revenueWeek), tone: "indigo" },
        { icon: "📈", label: "Revenue This Month", value: fmt(summary.revenueMonth), tone: "purple" },
        { icon: "⏳", label: "Pending Amount", value: fmt(summary.pending), tone: "yellow" },
        { icon: "✅", label: "Paid Bills", value: summary.paidCount, tone: "teal" },
        { icon: "🔔", label: "Pending Bills", value: summary.pendingCount, tone: "orange" },
        { icon: "🏥", label: "Insurance Claims", value: fmt(summary.insurance), tone: "blue" },
        { icon: "📊", label: "Average Bill", value: fmt(summary.avg), tone: "slate" },
      ]
    : [];

  return (
    <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>💳 Billing</h1>
            <p className={darkMode ? "text-sm text-slate-400 mt-1" : "text-sm text-slate-500 mt-1"}>
              Create invoices, track payments, and manage billing records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="h-9 px-3 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-sm transition-colors bg-white"
            >
              ⟳ Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              ➕ New Bill
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {summaryCards.map((c) => (
              <SummaryCard key={c.label} {...c} />
            ))}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 h-64 flex items-center justify-center">
            <p className="text-sm text-slate-400">Loading billing records…</p>
          </div>
        ) : (
          <BillTable bills={bills} onEdit={openEdit} onDelete={handleDelete} />
        )}

        {showForm && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => {
              if (!saving) setShowForm(false);
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{formMode === "edit" ? "✏ Edit Bill" : "➕ New Bill"}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formMode === "edit" ? `Editing ${editingBill?.billId}` : "Fill in the details to generate a new invoice."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
                <BillForm
                  mode={formMode}
                  initialData={editingBill}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setShowForm(false)}
                  saving={saving}
                />
              </div>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}

// src/pages/BillingPage.jsx
import { useMemo, useState } from "react";

const initialInvoices = [
  {
    id: "INV-1001",
    patientId: "PAT-1001",
    patientName: "Ravi Kumar",
    phone: "9876543210",
    status: "Paid",
    paymentMethod: "UPI",
    grandTotal: 850,
    amountPaid: 850,
    balanceDue: 0,
    billingDate: "2026-06-15",
    items: [
      { serviceName: "Consultation", category: "Consultation", quantity: 1, unitPrice: 300, amount: 300 },
      { serviceName: "CBC Test", category: "Lab", quantity: 1, unitPrice: 250, amount: 250 },
      { serviceName: "Paracetamol", category: "Medicine", quantity: 5, unitPrice: 60, amount: 300 },
    ],
  },
];

export default function BillingPage({ darkMode }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedPatient, setSelectedPatient] = useState("PAT-1001");
  const [patientName, setPatientName] = useState("Ravi Kumar");
  const [phone, setPhone] = useState("9876543210");
  const [items, setItems] = useState([
    { serviceName: "", category: "Consultation", quantity: 1, unitPrice: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pending");
  const [notes, setNotes] = useState("");

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
    [items]
  );
  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));

  const addItem = () => {
    setItems((prev) => [...prev, { serviceName: "", category: "Other", quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const createInvoice = () => {
    if (!patientName.trim() || !selectedPatient.trim() || items.length === 0) return;

    const cleanItems = items
      .filter((item) => item.serviceName.trim())
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        amount: Number(item.quantity || 1) * Number(item.unitPrice || 0),
      }));

    const newInvoice = {
      id: `INV-${Date.now()}`,
      patientId: selectedPatient,
      patientName,
      phone,
      status: paymentMethod === "Pending" ? "Unpaid" : "Paid",
      paymentMethod,
      grandTotal,
      amountPaid: paymentMethod === "Pending" ? 0 : grandTotal,
      balanceDue: paymentMethod === "Pending" ? grandTotal : 0,
      billingDate: new Date().toISOString().split("T")[0],
      items: cleanItems,
      notes,
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    setItems([{ serviceName: "", category: "Consultation", quantity: 1, unitPrice: 0 }]);
    setDiscount(0);
    setTax(0);
    setNotes("");
  };

  const cardBg = darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900";
  const inputClass = `w-full border rounded-lg p-2 text-sm ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`;

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-sm text-slate-500">Invoice generation, service billing, and patient history</p>
        </div>
        <div className="text-sm font-semibold">Invoices: {invoices.length}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardBg} rounded-2xl p-5 shadow lg:col-span-2`}>
          <h2 className="text-lg font-bold mb-4">Create Invoice</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input className={inputClass} placeholder="Patient ID" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} />
            <input className={inputClass} placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            <input className={inputClass} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input className={`${inputClass} md:col-span-4`} placeholder="Service name" value={item.serviceName} onChange={(e) => updateItem(index, "serviceName", e.target.value)} />
                <select className={`${inputClass} md:col-span-2`} value={item.category} onChange={(e) => updateItem(index, "category", e.target.value)}>
                  <option>Consultation</option>
                  <option>Lab</option>
                  <option>Procedure</option>
                  <option>Medicine</option>
                  <option>Room</option>
                  <option>Other</option>
                </select>
                <input className={`${inputClass} md:col-span-2`} type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                <input className={`${inputClass} md:col-span-2`} type="number" min="0" placeholder="Unit price" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} />
                <button type="button" onClick={() => removeItem(index)} className="md:col-span-2 px-3 py-2 rounded-lg bg-red-600 text-white">
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem} className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 text-white">
            + Add Service
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <input className={inputClass} type="number" min="0" placeholder="Discount" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <input className={inputClass} type="number" min="0" placeholder="Tax" value={tax} onChange={(e) => setTax(e.target.value)} />
            <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Pending</option>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Insurance</option>
            </select>
          </div>

          <textarea className={`${inputClass} mt-3`} rows="3" placeholder="Billing notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex items-center justify-between mt-5">
            <div className="text-sm">
              <div>Subtotal: {subtotal}</div>
              <div>Grand Total: {grandTotal}</div>
            </div>
            <button type="button" onClick={createInvoice} className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold">
              Generate Invoice
            </button>
          </div>
        </div>

        <div className={`${cardBg} rounded-2xl p-5 shadow`}>
          <h2 className="text-lg font-bold mb-4">Billing History</h2>
          <div className="space-y-3 max-h-[650px] overflow-auto">
            {invoices.map((invoice) => (
              <div key={invoice.id} className={`p-3 rounded-xl border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <div className="flex justify-between">
                  <div className="font-semibold">{invoice.invoiceNumber || invoice.id}</div>
                  <div className="text-xs px-2 py-1 rounded-full bg-cyan-600 text-white">{invoice.status}</div>
                </div>
                <div className="text-sm mt-1">{invoice.patientName}</div>
                <div className="text-sm text-slate-500">Total: {invoice.grandTotal}</div>
                <div className="text-xs text-slate-400 mt-1">{invoice.billingDate}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}