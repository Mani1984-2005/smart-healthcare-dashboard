// src/pages/BillingPage.jsx
// MediCare Pro — Enterprise Billing & Invoicing Module

import { useState, useEffect, useCallback, useMemo } from "react";
import { jsPDF } from "jspdf";
import NovaInvoice from "../components/billing/NovaInvoice";
import BillForm from "../components/billing/BillForm";
import BillTable from "../components/billing/BillTable";
import { PageHeader, StatCard, Modal } from "../components/ui";
import { Plus, Receipt, FileText, ShieldAlert, LayoutDashboard, Sliders } from "lucide-react";

/* ─────────────────────────────────────────────
   SHARED BUSINESS LOGIC & STORAGE IMPORT
───────────────────────────────────────────── */

import {
  billingAPI,
  generateBillId,
  computeTotals,
  resolvePayment,
  validateBill,
  fmt,
  DEFAULT_BILLS,
  STORAGE_KEY,
} from "../utils/billingStorage";

export {
  billingAPI,
  generateBillId,
  computeTotals,
  resolvePayment,
  validateBill,
  fmt,
  DEFAULT_BILLS,
  STORAGE_KEY,
};

export function generateInvoicePDF(bill) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  doc.setFontSize(20);
  doc.setTextColor(14, 124, 134);
  doc.text("MediCare Pro Hospital", 40, 45);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Smart Healthcare Dashboard — Tax Invoice", 40, 62);
  doc.line(40, 70, 555, 70);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice Number: ${bill.billId}`, 40, 92);
  doc.text(`Date: ${bill.billDate || new Date().toISOString().split("T")[0]}`, 380, 92);
  doc.text(`Patient: ${bill.patientName}`, 40, 110);
  if (bill.patientId) doc.text(`Patient ID: ${bill.patientId}`, 380, 110);
  doc.text(`Attending Doctor: ${bill.doctorName ? "Dr. " + bill.doctorName.replace(/^Dr\.\s*/i, "") : "General Consultation"}`, 40, 128);
  doc.text(`Payment: ${bill.paymentMode || "Cash"} • ${bill.paymentStatus || "Paid"}`, 380, 128);

  doc.line(40, 138, 555, 138);

  let y = 162;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const items = [
    { name: "Consultation Fee", val: bill.consultationFee },
    { name: "Medicine / Pharmacy Charges", val: bill.medicineCharges || bill.pharmacyCharges },
    { name: "Laboratory Charges", val: bill.labCharges },
    { name: "Procedure / Room / Other Charges", val: bill.otherCharges || bill.procedureCharges },
  ];

  items.forEach((it) => {
    if (Number(it.val || 0) > 0) {
      doc.text(it.name, 40, y);
      doc.text(fmt(it.val), 510, y, { align: "right" });
      y += 18;
    }
  });

  doc.line(40, y + 4, 555, y + 4);
  y += 24;

  doc.text("Subtotal:", 380, y);
  doc.text(fmt(bill.subtotal), 510, y, { align: "right" });
  y += 18;

  if (Number(bill.discountAmt || bill.discount || 0) > 0) {
    doc.text("Discount:", 380, y);
    doc.text(`- ${fmt(bill.discountAmt || bill.discount)}`, 510, y, { align: "right" });
    y += 18;
  }

  if (Number(bill.gstAmount || bill.gst || 0) > 0) {
    doc.text("GST (18%):", 380, y);
    doc.text(fmt(bill.gstAmount || bill.gst), 510, y, { align: "right" });
    y += 18;
  }

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Grand Total:", 380, y + 6);
  doc.text(fmt(bill.grandTotal || bill.grand), 510, y + 6, { align: "right" });

  doc.save(`${bill.billId}.pdf`);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function BillingPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [activeTab, setActiveTab] = useState("bills"); // "bills" | "console"
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await billingAPI.getAll();
    setBills(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /* ───────── CREATE / UPDATE ───────── */

  async function handleSave(form) {
    setSaving(true);

    try {
      const isEdit = form._mode === "edit" || (editingBill && editingBill.billId === form.billId);
      const billId = isEdit ? (form.billId || editingBill.billId) : (form.billId || generateBillId());

      const totals = computeTotals(form);
      const payment = resolvePayment(form.paymentStatus, totals.grandTotal, form.paidAmount);

      const finalBill = {
        ...form,
        billId,
        ...totals,
        ...payment,
        patientName: form.patientName?.trim() || "",
        doctorName: form.doctorName?.trim() || "",
        patientId: form.patientId?.trim() || "",
        billDate: form.billDate || new Date().toISOString().split("T")[0],
        paymentMode: form.paymentMode || "Cash",
        paymentStatus: form.paymentStatus || "Paid",
      };

      validateBill(finalBill);

      if (isEdit) {
        await billingAPI.update(billId, {
          ...finalBill,
          updatedAt: new Date().toISOString(),
          version: (Number(form.version || editingBill?.version || 1)) + 1,
        });
        showToast("Bill updated successfully", "success");
      } else {
        await billingAPI.create({
          ...finalBill,
          createdAt: new Date().toISOString(),
          version: 1,
        });
        showToast("Bill created successfully", "success");
      }

      await loadData();
      setShowForm(false);
      setEditingBill(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await billingAPI.remove(id);
    await loadData();
    showToast("Bill deleted from registry", "warning");
  }

  /* ───────── COMPUTED METRICS ───────── */

  const stats = useMemo(() => {
    let revenueTotal = 0;
    let paidTotal = 0;
    let dueTotal = 0;
    let paidCount = 0;
    let pendingCount = 0;

    bills.forEach((b) => {
      const grand = Number(b.grandTotal ?? b.grand ?? 0);
      const paid = Number(b.paidAmount ?? (b.paymentStatus === "Paid" ? grand : 0));
      const due = Number(b.dueAmount ?? (b.paymentStatus === "Pending" || b.paymentStatus === "Unpaid" ? grand : 0));
      revenueTotal += grand;
      paidTotal += paid;
      dueTotal += due;
      if (b.paymentStatus === "Paid") paidCount++;
      else pendingCount++;
    });

    return {
      count: bills.length,
      revenueTotal,
      paidTotal,
      dueTotal,
      paidCount,
      pendingCount,
    };
  }, [bills]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading billing records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <PageHeader
        title="Billing & Invoicing"
        subtitle="Itemized patient billing, GST calculation (18%), fee breakdown & PDF generation"
        icon={<Receipt className="w-6 h-6 text-white" />}
        actions={
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("bills")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "bills" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("console")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "console" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Executive Console</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingBill(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Bill</span>
            </button>
          </div>
        }
      />

      {/* ── Billing Vitals / Summary Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoices"
          value={stats.count}
          sub={`${stats.paidCount} paid, ${stats.pendingCount} pending`}
          icon="📄"
          color="indigo"
        />
        <StatCard
          label="Total Billed"
          value={fmt(stats.revenueTotal)}
          sub="Gross invoices value"
          icon="💳"
          color="cyan"
        />
        <StatCard
          label="Collected Revenue"
          value={fmt(stats.paidTotal)}
          sub="Settled payments"
          icon="💰"
          color="emerald"
        />
        <StatCard
          label="Pending Due"
          value={fmt(stats.dueTotal)}
          sub="Awaiting patient / payer clearance"
          icon="⏳"
          color="amber"
        />
      </div>

      {/* ── Verification & Safety Banner ────────────────────────────── */}
      <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/70 text-slate-700 text-xs flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold text-teal-900">Hospital Browser Registry Active</p>
          <p className="text-teal-800/90 mt-0.5">
            Bills, GST (18%) itemized charges, and discounts are recorded and calculated in your secure active session registry. Real-time bank payment gateways and persistent PostgreSQL transactional synchronization occur automatically when the connected backend service is online.
          </p>
        </div>
      </div>

      {/* ── View Switch: Invoices Table vs Executive Console ────────── */}
      {activeTab === "bills" ? (
        <div className="space-y-4">
          <BillTable
            bills={bills}
            invoices={bills}
            onEdit={(bill) => {
              setEditingBill(bill);
              setShowForm(true);
            }}
            onDelete={handleDelete}
            onRefresh={loadData}
          />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
          <NovaInvoice
            bills={bills}
            invoices={bills}
            onCreateInvoice={handleSave}
            onSave={handleSave}
            onClose={() => setActiveTab("bills")}
          />
        </div>
      )}

      {/* ── Bill Form Modal (Create & Edit) ─────────────────────────── */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingBill(null);
        }}
        title={editingBill ? `Edit Invoice — ${editingBill.billId}` : "Create New Patient Bill"}
        subtitle="Itemize consultation, pharmacy, lab, and procedure fees. GST and discounts are calculated automatically."
        size="lg"
      >
        <BillForm
          mode={editingBill ? "edit" : "create"}
          initialData={editingBill}
          onSubmit={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingBill(null);
          }}
        />
      </Modal>

      {/* ── Toast Notifications ─────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-2 transition-all duration-300 ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : toast.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}