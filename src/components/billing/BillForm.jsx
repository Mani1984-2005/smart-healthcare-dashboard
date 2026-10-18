// FILE PATH: src/components/billing/BillForm.jsx
//
// Billing form component — handles both Create and Edit modes.
// All calculation logic lives in billingStorage.computeTotals() so
// there is no math duplicated here. LocalStorage writes happen in the
// parent page, not here — this component only manages form state and
// calls onSubmit(formData).
//
// PROPS:
//   mode:        "create" | "edit"
//   initialData: bill object (edit mode only)
//   onSubmit(formData): called with raw form data on save
//   onCancel():  called on cancel

import { useState, useEffect } from "react";
import { computeTotals, generateBillId, GST_RATE } from "../../utils/billingStorage";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_MODES   = ["Cash", "Card", "UPI", "Insurance", "Bank Transfer", "Other"];
const PAYMENT_STATUSES = ["Paid", "Unpaid", "Partial"];

const EMPTY_FORM = {
  billId:           "",
  patientName:      "",
  patientId:        "",
  doctorName:       "",
  billDate:         new Date().toISOString().split("T")[0],
  consultationFee:  "",
  medicineCharges:  "",
  labCharges:       "",
  otherCharges:     "",
  discount:         "",
  applyGst:         false,
  paymentMode:      "Cash",
  paymentStatus:    "Paid",
  notes:            "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [totals, setTotals] = useState({ subtotal: 0, discountAmt: 0, gstAmount: 0, grandTotal: 0 });

  // Populate form in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setForm({ ...EMPTY_FORM, ...initialData });
    } else {
      setForm({ ...EMPTY_FORM, billId: generateBillId() });
    }
  }, [mode, initialData]);

  // Recompute totals whenever a relevant field changes
  useEffect(() => {
    setTotals(computeTotals(form));
  }, [
    form.consultationFee,
    form.medicineCharges,
    form.labCharges,
    form.otherCharges,
    form.discount,
    form.applyGst,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.patientName.trim())  errs.patientName      = "Patient name is required.";
    if (!form.billDate)            errs.billDate          = "Bill date is required.";
    const hasAnyCharge =
      Number(form.consultationFee  || 0) > 0 ||
      Number(form.medicineCharges  || 0) > 0 ||
      Number(form.labCharges       || 0) > 0 ||
      Number(form.otherCharges     || 0) > 0;
    if (!hasAnyCharge)             errs.consultationFee  = "Enter at least one charge.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Bill metadata ─────────────────────────────────────────────────── */}
      <Section title="Bill Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bill ID" value={form.billId} disabled />
          <Field label="Bill Date *" name="billDate" type="date"
            value={form.billDate} onChange={handleChange} error={errors.billDate} />
          <Field label="Patient Name *" name="patientName"
            value={form.patientName} onChange={handleChange}
            placeholder="Full patient name" error={errors.patientName} />
          <Field label="Patient ID" name="patientId"
            value={form.patientId} onChange={handleChange} placeholder="e.g. PAT-001" />
          <Field label="Doctor Name" name="doctorName"
            value={form.doctorName} onChange={handleChange} placeholder="Attending doctor" />
        </div>
      </Section>

      {/* ── Charges ───────────────────────────────────────────────────────── */}
      <Section title="Charges">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Consultation Fee (₹)" name="consultationFee" type="number" min="0" step="0.01"
            value={form.consultationFee} onChange={handleChange} placeholder="0.00"
            error={errors.consultationFee} />
          <Field label="Medicine Charges (₹)" name="medicineCharges" type="number" min="0" step="0.01"
            value={form.medicineCharges} onChange={handleChange} placeholder="0.00" />
          <Field label="Lab / Test Charges (₹)" name="labCharges" type="number" min="0" step="0.01"
            value={form.labCharges} onChange={handleChange} placeholder="0.00" />
          <Field label="Other Charges (₹)" name="otherCharges" type="number" min="0" step="0.01"
            value={form.otherCharges} onChange={handleChange} placeholder="0.00" />
          <Field label="Discount (₹)" name="discount" type="number" min="0" step="0.01"
            value={form.discount} onChange={handleChange} placeholder="0.00" />

          {/* GST toggle */}
          <div className="flex items-center gap-3 sm:col-span-2 mt-1">
            <input
              type="checkbox"
              id="applyGst"
              name="applyGst"
              checked={form.applyGst}
              onChange={handleChange}
              className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-300"
            />
            <label htmlFor="applyGst" className="text-small text-neutral-700 cursor-pointer">
              Apply GST ({(GST_RATE * 100).toFixed(0)}%) on taxable amount
            </label>
          </div>
        </div>

        {/* Live totals preview */}
        <div className="mt-5 bg-neutral-50 rounded-lg border border-neutral-200 divide-y divide-neutral-200">
          <TotalsRow label="Subtotal"    value={fmt(totals.subtotal)} />
          {totals.discountAmt > 0 && (
            <TotalsRow label="Discount"  value={`- ${fmt(totals.discountAmt)}`} valueClass="text-error-600" />
          )}
          {form.applyGst && (
            <TotalsRow label={`GST (${(GST_RATE * 100).toFixed(0)}%)`} value={fmt(totals.gstAmount)} />
          )}
          <TotalsRow label="Grand Total" value={fmt(totals.grandTotal)} highlight />
        </div>
      </Section>

      {/* ── Payment ───────────────────────────────────────────────────────── */}
      <Section title="Payment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Payment Mode" name="paymentMode"
            value={form.paymentMode} onChange={handleChange} options={PAYMENT_MODES} />
          <SelectField label="Payment Status" name="paymentStatus"
            value={form.paymentStatus} onChange={handleChange} options={PAYMENT_STATUSES} />
        </div>
      </Section>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      <Section title="Notes (optional)">
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Any additional billing notes..."
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 placeholder:text-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
        />
      </Section>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
  type="submit"
  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
>
  {mode === "edit" ? "Save Changes" : "Create Bill"}
</button>
      </div>
    </form>
  );
}

// ─── Small local sub-components ───────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, error, disabled, min, step }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        className={`h-10 w-full rounded-lg border px-3 text-sm text-neutral-800 placeholder:text-neutral-400
          transition-colors focus:outline-none focus:ring-2
          ${disabled ? "bg-neutral-50 text-neutral-400 cursor-not-allowed border-neutral-200" : "bg-white border-neutral-200 focus:ring-primary-300 focus:border-primary-400"}
          ${error ? "border-error-500 focus:ring-error-100" : ""}
        `}
      />
      {error && <span className="text-xs text-error-500">{error}</span>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TotalsRow({ label, value, highlight = false, valueClass = "" }) {
  return (
    <div className={`flex justify-between items-center px-4 py-2.5 ${highlight ? "bg-primary-50" : ""}`}>
      <span className={`text-sm ${highlight ? "font-bold text-neutral-800" : "text-neutral-500"}`}>{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-primary-700 text-base" : valueClass || "text-neutral-700"}`}>
        {value}
      </span>
    </div>
  );
}