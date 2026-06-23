// FILE PATH: src/pages/BillingPage.jsx
// REPLACE your existing BillingPage.jsx with this file.
//
// Phase 4 complete billing module. Uses storage key "billing_v2" — the old
// Phase 2 "billing_invoices" key is untouched; switching to this page will
// NOT delete any existing invoice data.
//
// Architecture:
//   BillingPage (state + layout)
//     └── BillForm    (create / edit a bill)
//     └── BillTable   (history + search + filter + PDF/print)
//     └── billingStorage (all reads/writes)
//
// Components imported from:
//   src/utils/billingStorage.js
//   src/components/billing/BillForm.jsx
//   src/components/billing/BillTable.jsx

import { useState, useEffect, useCallback } from "react";
import {
  Receipt, TrendingUp, CalendarDays, AlertCircle, Plus, RefreshCw,
} from "lucide-react";
import BillForm  from "../components/billing/BillForm";
import BillTable from "../components/billing/BillTable";
import {
  getBills,
  getBillingSummary,
  createBill,
  updateBill,
  deleteBill,
} from "../utils/billingStorage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: "border-l-success-500 bg-white text-success-700",
    error:   "border-l-error-500  bg-white text-error-700",
    warning: "border-l-warning-500 bg-white text-warning-700",
  };

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 border-l-4 rounded-md shadow-lift px-4 py-3.5 max-w-sm w-full animate-slide-up ${styles[type] || styles.success}`}>
      <span className="text-sm flex-1">{message}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-50 hover:opacity-80">×</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BillingPage() {
  const [bills,   setBills]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [showForm,    setShowForm]    = useState(false);
  const [formMode,    setFormMode]    = useState("create"); // "create" | "edit"
  const [editingBill, setEditingBill] = useState(null);
  const [saving,      setSaving]      = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [allBills, dashSummary] = await Promise.all([getBills(), getBillingSummary()]);
    setBills(allBills);
    setSummary(dashSummary);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  // ── Create bill ────────────────────────────────────────────────────────────

  function openCreateForm() {
    setFormMode("create");
    setEditingBill(null);
    setShowForm(true);
  }

  function openEditForm(bill) {
    setFormMode("edit");
    setEditingBill(bill);
    setShowForm(true);
  }

  async function handleFormSubmit(formData) {
    setSaving(true);
    try {
      if (formMode === "edit") {
        await updateBill(editingBill.billId, formData);
        showToast("Bill updated successfully.", "success");
      } else {
       const createdBill = await createBill(formData);

const patients = JSON.parse(localStorage.getItem("patients")) || [];

const updatedPatients = patients.map((patient) => {
  const isSamePatient =
    patient.id === formData.patientId ||
    patient.name.toLowerCase() === formData.patientName.toLowerCase();

  if (!isSamePatient) return patient;

  return {
    ...patient,
    timeline: [
      ...(patient.timeline || []),
      {
        id: Date.now(),
        date: formData.billDate || new Date().toISOString().split("T")[0],
        type: "Billing",
        title: "Bill Generated",
        details: `Bill ${createdBill?.billId || formData.billId} created. Payment Status: ${formData.paymentStatus}.`,
      },
    ],
  };
});

localStorage.setItem("patients", JSON.stringify(updatedPatients));

showToast("Bill created and patient timeline updated.", "success");
      }
      setShowForm(false);
      setEditingBill(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete bill ────────────────────────────────────────────────────────────

  async function handleDeleteBill(billId) {
    try {
      await deleteBill(billId);
      showToast("Bill deleted.", "warning");
      await loadData();
    } catch {
      showToast("Failed to delete bill.", "error");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">💳 Billing</h1>
          <p className="text-sm text-neutral-500 mt-1">Create bills, track payments, and download invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="h-9 px-3 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={openCreateForm}
            className="h-9 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-soft"
          >
            <Plus size={16} /> New Bill
          </button>
          <button
  onClick={openCreateForm}
  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2"
>
  <Plus size={16} /> New Bill
</button>


        </div>
      </div>

      {/* ── Dashboard cards ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 h-24 animate-pulse" />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={<Receipt size={20} />}       label="Total Bills"       value={summary.totalBills}            tone="primary" />
          <SummaryCard icon={<CalendarDays size={20} />}  label="Revenue Today"     value={fmt(summary.revenueToday)}     tone="success" />
          <SummaryCard icon={<TrendingUp size={20} />}    label="Revenue This Month" value={fmt(summary.revenueMonth)}   tone="info" />
          <SummaryCard icon={<AlertCircle size={20} />}   label="Unpaid Bills"      value={summary.unpaidCount}           tone="warning" />
        </div>
      )}

      {/* ── Bill history table ───────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-neutral-200 h-64 flex items-center justify-center">
          <p className="text-sm text-neutral-400">Loading bills…</p>
        </div>
      ) : (
        <BillTable
          bills={bills}
          onEdit={openEditForm}
          onDelete={handleDeleteBill}
          onRefresh={loadData}
        />
      )}

      {/* ── Create / Edit form modal ─────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-[2px] flex items-start justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => { if (!saving) setShowForm(false); }}
        >
          <div
            className="bg-white rounded-xl shadow-modal w-full max-w-2xl my-8 overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-bold text-neutral-800">
                  {formMode === "edit" ? "✏️ Edit Bill" : "➕ New Bill"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {formMode === "edit" ? `Editing ${editingBill?.billId}` : "Fill in the billing details below."}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors disabled:opacity-40"
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
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Local summary card ───────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, tone }) {
  const toneMap = {
    primary: "bg-primary-50 text-primary-700",
    success: "bg-success-50 text-success-700",
    info:    "bg-info-50 text-info-700",
    warning: "bg-warning-50 text-warning-700",
    error:   "bg-error-50 text-error-700",
  };
  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 shadow-card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${toneMap[tone]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-neutral-800 leading-tight">{value}</p>
      <p className="text-sm text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}