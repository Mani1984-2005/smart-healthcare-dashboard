// src/components/billing/NovaInvoice.jsx
// MediCare Pro — Billing Phase 3 — NovaInvoice
// Premium invoice UI: enterprise design, status badges, patient details,
// payment details, tax summary, invoice actions.
// Integrates: InvoiceExporter, SmartFilter, SignalToast, Chronicle, HorizonMetrics

import { useState, useCallback, useMemo } from "react";
import { dispatchExport } from "../../utils/billing/InvoiceExporter";
import { applySmartFilter, applySort, buildDefaultCriteria } from "./SmartFilter";
import SmartFilterBar from "./SmartFilterBar";
import Chronicle from "./Chronicle";
import { useToast } from "./SignalToast";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  Paid:      { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", icon: "✓" },
  Pending:   { bg: "bg-amber-100 dark:bg-amber-900/40",     text: "text-amber-700 dark:text-amber-300",     dot: "bg-amber-500",   icon: "⏳" },
  Overdue:   { bg: "bg-red-100 dark:bg-red-900/40",         text: "text-red-700 dark:text-red-300",         dot: "bg-red-500",     icon: "⚠" },
  Refunded:  { bg: "bg-indigo-100 dark:bg-indigo-900/40",   text: "text-indigo-700 dark:text-indigo-300",   dot: "bg-indigo-500",  icon: "↩" },
  Cancelled: { bg: "bg-slate-200 dark:bg-slate-700",        text: "text-slate-600 dark:text-slate-300",     dot: "bg-slate-400",   icon: "✕" },
};

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Net Banking", "Cheque", "Insurance", "Wallet"];
const TAX_PRESETS     = [0, 5, 12, 18, 28];

function currency(n) {
  return `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function emptyLineItem() {
  return { id: Date.now(), description: "", qty: 1, unitPrice: "", taxPct: 0, discount: 0 };
}
function emptyInvoice(patient = null) {
  return {
    id:            `INV-${Date.now()}`,
    invoiceNumber: `INV-${Date.now()}`,
    patientId:     patient?.id    || "",
    patientName:   patient?.name  || "",
    patientGender: patient?.gender || "",
    patientAge:    patient?.age   || "",
    patientPhone:  patient?.phone || "",
    patientAddress:patient?.address || "",
    date:          new Date().toISOString().split("T")[0],
    dueDate:       new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    status:        "Pending",
    paymentMethod: "Cash",
    department:    patient?.department || "",
    doctorName:    patient?.primaryDoctor || "",
    insuranceProvider: patient?.insuranceProvider || "",
    taxRate:       18,
    discount:      0,
    notes:         "",
    timeline:      [],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, size = "md" }) {
  const meta = STATUS_META[status] || STATUS_META.Pending;
  const sizeClass = size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${sizeClass} ${meta.bg} ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {status}
    </span>
  );
}

function TotalsBlock({ lineItems, taxRate, discount, darkMode }) {
  const sub  = darkMode ? "text-slate-400" : "text-slate-500";
  const divider = darkMode ? "border-slate-700" : "border-slate-200";

  const subtotal = lineItems.reduce((s, item) => s + (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 1), 0);
  const itemDiscounts = lineItems.reduce((s, item) => s + (parseFloat(item.discount) || 0), 0);
  const taxBase   = subtotal - itemDiscounts;
  const taxAmount = taxBase * ((parseFloat(taxRate) || 0) / 100);
  const lineDisc  = parseFloat(discount) || 0;
  const total     = taxBase + taxAmount - lineDisc;

  return (
    <div className="space-y-1.5 pt-2">
      <div className={`flex justify-between text-sm ${sub}`}>
        <span>Subtotal</span>
        <span>{currency(subtotal)}</span>
      </div>
      {itemDiscounts > 0 && (
        <div className={`flex justify-between text-sm ${sub}`}>
          <span>Item Discounts</span>
          <span className="text-emerald-500">-{currency(itemDiscounts)}</span>
        </div>
      )}
      <div className={`flex justify-between text-sm ${sub}`}>
        <span>GST / Tax ({taxRate || 0}%)</span>
        <span>{currency(taxAmount)}</span>
      </div>
      {lineDisc > 0 && (
        <div className={`flex justify-between text-sm ${sub}`}>
          <span>Invoice Discount</span>
          <span className="text-emerald-500">-{currency(lineDisc)}</span>
        </div>
      )}
      <div className={`flex justify-between font-bold text-base border-t pt-2 ${divider}`}>
        <span>Total</span>
        <span className="text-cyan-500">{currency(total)}</span>
      </div>
    </div>
  );
}

function LineItemsTable({ items, onChange, darkMode, readOnly = false }) {
  const th    = darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500";
  const input = `border rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-cyan-400 w-full ${
    darkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
  }`;
  const rowBg = (i) => i % 2 === 0
    ? (darkMode ? "bg-slate-900" : "bg-white")
    : (darkMode ? "bg-slate-800/50" : "bg-slate-50");

  const update = (id, key, val) =>
    onChange(items.map((it) => (it.id === id ? { ...it, [key]: val } : it)));
  const remove = (id) =>
    onChange(items.filter((it) => it.id !== id));
  const add = () =>
    onChange([...items, emptyLineItem()]);

  const headers = ["Description", "Qty", "Unit Price (₹)", "Discount (₹)", "Tax %", "Amount", ""];
  const colW    = ["w-auto", "w-16", "w-24", "w-20", "w-16", "w-24", "w-8"];

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className={th}>
              {headers.map((h, i) => (
                <th key={h} className={`text-left text-xs font-semibold px-3 py-2.5 ${colW[i] || ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineTotal = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 1);
              const lineTax   = lineTotal * ((parseFloat(item.taxPct) || 0) / 100);
              const lineDisc  = parseFloat(item.discount) || 0;
              const lineAmt   = lineTotal + lineTax - lineDisc;

              return (
                <tr key={item.id} className={rowBg(idx)}>
                  <td className="px-3 py-2">
                    {readOnly
                      ? <span className="text-sm">{item.description}</span>
                      : <input className={input} value={item.description} onChange={(e) => update(item.id, "description", e.target.value)} placeholder="Service / medicine / procedure" />
                    }
                  </td>
                  <td className="px-3 py-2">
                    {readOnly
                      ? <span>{item.qty}</span>
                      : <input className={input} type="number" min={1} value={item.qty} onChange={(e) => update(item.id, "qty", e.target.value)} />
                    }
                  </td>
                  <td className="px-3 py-2">
                    {readOnly
                      ? <span>{currency(item.unitPrice)}</span>
                      : <input className={input} type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => update(item.id, "unitPrice", e.target.value)} placeholder="0.00" />
                    }
                  </td>
                  <td className="px-3 py-2">
                    {readOnly
                      ? <span>{currency(item.discount)}</span>
                      : <input className={input} type="number" min={0} step="0.01" value={item.discount} onChange={(e) => update(item.id, "discount", e.target.value)} placeholder="0.00" />
                    }
                  </td>
                  <td className="px-3 py-2">
                    {readOnly
                      ? <span>{item.taxPct}%</span>
                      : (
                        <select className={input} value={item.taxPct} onChange={(e) => update(item.id, "taxPct", e.target.value)}>
                          {TAX_PRESETS.map((t) => <option key={t} value={t}>{t}%</option>)}
                        </select>
                      )
                    }
                  </td>
                  <td className="px-3 py-2 font-semibold text-cyan-500">{currency(lineAmt)}</td>
                  <td className="px-3 py-2">
                    {!readOnly && items.length > 1 && (
                      <button onClick={() => remove(item.id)} className="text-red-400 hover:text-red-500 text-xs">✕</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button onClick={add} className="mt-2 text-xs text-cyan-500 hover:text-cyan-600 font-medium">
          + Add line item
        </button>
      )}
    </div>
  );
}

// ─── Action toolbar ───────────────────────────────────────────────────────────

function InvoiceActions({ invoice, lineItems, darkMode, onStatusChange, onDelete }) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(null);

  const btn = (color) =>
    `flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
      color === "primary"
        ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500"
        : color === "danger"
        ? "text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
        : darkMode
        ? "border-slate-700 hover:bg-slate-800"
        : "border-slate-300 hover:bg-slate-50"
    }`;

  const doExport = async (format) => {
    setExporting(format);
    const loadId = toast.loading(`Preparing ${format.toUpperCase()}…`);
    try {
      dispatchExport(format, invoice, lineItems);
      toast.update(loadId, { type: "success", message: `${format.toUpperCase()} ready.` });
    } catch (err) {
      toast.update(loadId, { type: "error", message: err.message || "Export failed." });
    } finally {
      setExporting(null);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const id = toast.loading(`Updating to ${newStatus}…`);
    try {
      await onStatusChange?.(invoice.id, newStatus);
      toast.update(id, { type: "success", message: `Status updated to ${newStatus}.` });
    } catch (err) {
      toast.update(id, { type: "error", message: "Status update failed." });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Export group */}
      <button onClick={() => doExport("pdf")}   disabled={!!exporting} className={btn("default")}>
        {exporting === "pdf" ? "…" : "⬇"} PDF
      </button>
      <button onClick={() => doExport("print")} disabled={!!exporting} className={btn("default")}>
        🖨 Print
      </button>
      <button onClick={() => doExport("csv")}   disabled={!!exporting} className={btn("default")}>
        CSV
      </button>
      <button onClick={() => doExport("excel")} disabled={!!exporting} className={btn("default")}>
        Excel
      </button>
      <button onClick={() => doExport("json")}  disabled={!!exporting} className={btn("default")}>
        JSON
      </button>

      {/* Status quick-changes */}
      {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
        <button onClick={() => handleStatusChange("Paid")} className={btn("primary")}>
          ✓ Mark Paid
        </button>
      )}
      {invoice.status === "Pending" && (
        <button onClick={() => handleStatusChange("Overdue")} className={btn("default")}>
          ⚠ Mark Overdue
        </button>
      )}
      {invoice.status !== "Cancelled" && (
        <button onClick={() => handleStatusChange("Cancelled")} className={btn("default")}>
          Cancel
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <button onClick={() => onDelete(invoice.id)} className={btn("danger")}>
          🗑 Delete
        </button>
      )}
    </div>
  );
}

// ─── Invoice detail panel ─────────────────────────────────────────────────────

function InvoiceDetail({ invoice, patients, darkMode, onUpdate, onDelete, onClose }) {
  const [lineItems, setLineItems] = useState(
    invoice.lineItems || [{ id: 1, description: invoice.description || "Medical Services", qty: 1, unitPrice: invoice.subtotal || invoice.amount, taxPct: invoice.taxRate || 0, discount: 0 }]
  );
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...invoice });
  const { toast } = useToast();

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const sub  = darkMode ? "text-slate-400" : "text-slate-500";
  const inp  = `border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400 ${
    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
  }`;
  const label = "text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1";

  const subtotal   = lineItems.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseFloat(i.qty) || 1), 0);
  const taxAmount  = subtotal * ((parseFloat(form.taxRate) || 0) / 100);
  const total      = subtotal + taxAmount - (parseFloat(form.discount) || 0);

  const handleSave = () => {
    const updated = { ...form, lineItems, subtotal, taxAmount, amount: total };
    onUpdate?.(updated);
    setEditing(false);
    toast.success("Invoice updated.");
  };

  const enrichedHistory = useMemo(() => {
    const base = form.timeline || [];
    return base.map((ev) => ({
      ...ev,
      type:   ev.type || "edited",
      actor:  ev.actor || "Billing System",
    }));
  }, [form.timeline]);

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold">{form.invoiceNumber || form.id}</h2>
            <StatusBadge status={form.status} size="lg" />
          </div>
          <p className={`text-sm mt-1 ${sub}`}>
            {form.patientName} · {form.patientId} · {formatDate(form.date)}
          </p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className={`text-xs px-3 py-2 rounded-lg border font-medium ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>
              ✎ Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} className="text-xs px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium">Save</button>
              <button onClick={() => { setEditing(false); setForm({ ...invoice }); }} className={`text-xs px-3 py-2 rounded-lg border font-medium ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>Cancel</button>
            </>
          )}
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl px-2">✕</button>
          )}
        </div>
      </div>

      {/* Actions */}
      <InvoiceActions
        invoice={{ ...form, lineItems, subtotal, taxAmount, amount: total }}
        lineItems={lineItems}
        darkMode={darkMode}
        onStatusChange={(_, status) => {
          const timeline = [
            ...(form.timeline || []),
            { id: Date.now(), type: status.toLowerCase(), title: `Status changed to ${status}`, date: new Date().toISOString(), actor: "User" },
          ];
          const updated = { ...form, status, timeline };
          setForm(updated);
          onUpdate?.(updated);
        }}
        onDelete={onDelete}
      />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main invoice */}
        <div className="lg:col-span-2 space-y-5">
          {/* Patient + billing details */}
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h3 className="font-semibold text-sm mb-4">Invoice Details</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Patient Name", "patientName"], ["Patient ID", "patientId"],
                  ["Department", "department"],    ["Doctor", "doctorName"],
                  ["Payment Method", "paymentMethod"], ["Insurance", "insuranceProvider"],
                ].map(([lbl, key]) => (
                  <div key={key}>
                    <label className={label}>{lbl}</label>
                    {key === "paymentMethod" ? (
                      <select className={`${inp} w-full`} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}>
                        {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input className={`${inp} w-full`} value={form[key] || ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                    )}
                  </div>
                ))}
                <div>
                  <label className={label}>Invoice Date</label>
                  <input type="date" className={`${inp} w-full`} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className={label}>Due Date</label>
                  <input type="date" className={`${inp} w-full`} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {[
                  ["Patient",       form.patientName],
                  ["Patient ID",    form.patientId],
                  ["Department",    form.department || "—"],
                  ["Doctor",        form.doctorName || "—"],
                  ["Payment",       form.paymentMethod || "—"],
                  ["Insurance",     form.insuranceProvider || "—"],
                  ["Invoice Date",  formatDate(form.date)],
                  ["Due Date",      formatDate(form.dueDate)],
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-2">
                    <span className={`shrink-0 ${sub}`}>{l}:</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h3 className="font-semibold text-sm mb-4">Line Items</h3>
            <LineItemsTable
              items={lineItems}
              onChange={setLineItems}
              darkMode={darkMode}
              readOnly={!editing}
            />
          </div>

          {/* Tax summary */}
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h3 className="font-semibold text-sm mb-4">Tax & Payment Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                {editing && (
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className={label}>Tax Rate (%)</label>
                      <select className={`${inp} w-full`} value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}>
                        {TAX_PRESETS.map((t) => <option key={t} value={t}>{t}%</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Invoice Discount (₹)</label>
                      <input type="number" min={0} className={`${inp} w-full`} value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
                    </div>
                  </div>
                )}
                <TotalsBlock lineItems={lineItems} taxRate={form.taxRate} discount={form.discount} darkMode={darkMode} />
              </div>
              {/* GST breakdown table */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-2`}>GST Breakdown</p>
                <div className={`rounded-xl overflow-hidden border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                  <table className="w-full text-xs">
                    <thead className={darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}>
                      <tr>
                        {["Type", "Rate", "Taxable", "Tax Amt"].map((h) => (
                          <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={darkMode ? "bg-slate-900" : "bg-white"}>
                        <td className="px-2 py-2">CGST</td>
                        <td className="px-2 py-2">{((parseFloat(form.taxRate) || 0) / 2).toFixed(1)}%</td>
                        <td className="px-2 py-2">{currency(subtotal)}</td>
                        <td className="px-2 py-2">{currency(taxAmount / 2)}</td>
                      </tr>
                      <tr className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                        <td className="px-2 py-2">SGST</td>
                        <td className="px-2 py-2">{((parseFloat(form.taxRate) || 0) / 2).toFixed(1)}%</td>
                        <td className="px-2 py-2">{currency(subtotal)}</td>
                        <td className="px-2 py-2">{currency(taxAmount / 2)}</td>
                      </tr>
                      <tr className={`font-semibold border-t ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
                        <td className="px-2 py-2" colSpan={3}>Total Tax</td>
                        <td className="px-2 py-2 text-cyan-500">{currency(taxAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className={label}>Notes</label>
              {editing
                ? <textarea className={`${inp} w-full h-16 resize-none`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                : form.notes ? <p className={`text-sm ${sub}`}>{form.notes}</p> : null
              }
            </div>
          </div>
        </div>

        {/* Right: history */}
        <div className="space-y-5">
          <Chronicle darkMode={darkMode} events={enrichedHistory} invoiceId={form.invoiceNumber || form.id} />
        </div>
      </div>
    </div>
  );
}

// ─── Invoice list row ─────────────────────────────────────────────────────────

function InvoiceRow({ invoice, selected, onSelect, darkMode }) {
  const sub  = darkMode ? "text-slate-400" : "text-slate-500";
  const sel  = selected
    ? (darkMode ? "bg-cyan-900/20 border-cyan-700" : "bg-cyan-50 border-cyan-300")
    : (darkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-800" : "bg-white border-slate-200 hover:bg-slate-50");

  const subtotal  = parseFloat(invoice.subtotal  || 0);
  const taxAmount = parseFloat(invoice.taxAmount || 0);
  const total     = parseFloat(invoice.amount || subtotal + taxAmount);

  return (
    <button
      onClick={() => onSelect(invoice)}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${sel}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{invoice.invoiceNumber || invoice.id}</span>
            <StatusBadge status={invoice.status} />
          </div>
          <p className={`text-xs mt-0.5 truncate ${sub}`}>
            {invoice.patientName} · {invoice.patientId}
          </p>
          <p className={`text-xs ${sub}`}>{invoice.department || "General"} · Dr. {invoice.doctorName || "—"}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-sm text-cyan-500">{currency(total)}</p>
          <p className={`text-xs ${sub}`}>{formatDate(invoice.date)}</p>
          {invoice.dueDate && invoice.status === "Pending" && (
            <p className={`text-xs ${new Date(invoice.dueDate) < new Date() ? "text-red-400" : sub}`}>
              Due {formatDate(invoice.dueDate)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── NOVA INVOICE — main export ───────────────────────────────────────────────

/**
 * @param {Object[]} invoices - array of billing records
 * @param {Object[]} patients - from PatientsPage localStorage context
 * @param {Function} onCreateInvoice - async (invoice) => saved invoice
 * @param {Function} onUpdateInvoice - async (invoice) => updated invoice
 * @param {Function} onDeleteInvoice - async (id) => void
 * @param {boolean}  darkMode
 */
export default function NovaInvoice({
  darkMode,
  invoices = [],
  patients = [],
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
}) {
  const { toast } = useToast();

  const [criteria,       setCriteria]       = useState(buildDefaultCriteria());
  const [selectedInv,    setSelectedInv]    = useState(null);
  const [creating,       setCreating]       = useState(false);
  const [newInvForm,     setNewInvForm]     = useState(null);
  const [newLineItems,   setNewLineItems]   = useState([emptyLineItem()]);
  const [patSearch,      setPatSearch]      = useState("");
  const [selectedPat,    setSelectedPat]    = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [view,           setView]           = useState("list"); // list | detail | new

  const bg    = darkMode ? "bg-slate-950 text-white"  : "bg-slate-100 text-slate-900";
  const card  = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const sub   = darkMode ? "text-slate-400" : "text-slate-500";
  const inp   = `border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400 ${
    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
  }`;

  // ── Filtered invoice list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const f = applySmartFilter(invoices, criteria);
    return applySort(f, criteria.sortBy);
  }, [invoices, criteria]);

  // ── Select invoice ─────────────────────────────────────────────────────────
  const handleSelect = (inv) => {
    setSelectedInv(inv);
    setView("detail");
  };

  // ── Start new invoice ──────────────────────────────────────────────────────
  const startNew = () => {
    setNewInvForm(emptyInvoice(null));
    setNewLineItems([emptyLineItem()]);
    setSelectedPat(null);
    setPatSearch("");
    setCreating(true);
    setView("new");
  };

  const selectPatientForNew = (pat) => {
    setSelectedPat(pat);
    setPatSearch(pat.name);
    setNewInvForm((f) => ({
      ...f,
      patientId:     pat.id,
      patientName:   pat.name,
      patientGender: pat.gender || "",
      patientAge:    pat.age    || "",
      patientPhone:  pat.phone  || "",
      patientAddress:pat.address || "",
      department:    pat.department || f.department,
      doctorName:    pat.primaryDoctor || f.doctorName,
      insuranceProvider: pat.insuranceProvider || f.insuranceProvider,
    }));
  };

  const handleCreateSubmit = async () => {
    if (!newInvForm?.patientId) return toast.error("Select a patient before saving.");
    if (newLineItems.some((i) => !i.description || !i.unitPrice))
      return toast.error("All line items need a description and price.");

    setSaving(true);
    const loadId = toast.loading("Creating invoice…");
    try {
      const subtotal   = newLineItems.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseFloat(i.qty) || 1), 0);
      const taxAmount  = subtotal * ((parseFloat(newInvForm.taxRate) || 0) / 100);
      const total      = subtotal + taxAmount - (parseFloat(newInvForm.discount) || 0);

      const invoice = {
        ...newInvForm,
        lineItems: newLineItems,
        subtotal,
        taxAmount,
        amount: total,
        timeline: [{ id: Date.now(), type: "created", title: "Invoice Created", date: new Date().toISOString(), actor: "Billing" }],
      };
      await onCreateInvoice?.(invoice);
      toast.update(loadId, { type: "success", message: `Invoice ${invoice.invoiceNumber} created.` });
      setCreating(false);
      setView("list");
    } catch (err) {
      toast.update(loadId, { type: "error", message: err.message || "Failed to create invoice." });
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk export ────────────────────────────────────────────────────────────
  const doBulkExport = (format) => {
    const id = toast.loading(`Exporting ${filtered.length} invoices as ${format.toUpperCase()}…`);
    try {
      dispatchExport(format, filtered);
      toast.update(id, { type: "success", message: `${filtered.length} invoices exported.` });
    } catch (err) {
      toast.update(id, { type: "error", message: err.message || "Export failed." });
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = patSearch.toLowerCase();
    return !selectedPat && q.length > 1 && (p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q));
  }).slice(0, 8);

  return (
    <div className={`min-h-screen p-6 ${bg}`}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className={`text-sm ${sub}`}>
            {invoices.length} total · {invoices.filter((i) => i.status === "Pending").length} pending · {invoices.filter((i) => i.status === "Overdue").length} overdue
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {view !== "list" && (
            <button onClick={() => { setView("list"); setCreating(false); }} className={`text-sm px-3 py-2 rounded-lg border font-medium ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>
              ← Back to list
            </button>
          )}
          {view === "list" && filtered.length > 0 && (
            <div className="flex gap-1.5">
              {["csv","excel","json"].map((f) => (
                <button key={f} onClick={() => doBulkExport(f)} className={`text-xs px-3 py-2 rounded-lg border font-medium ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <button onClick={startNew} className="text-sm bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium">
            + New Invoice
          </button>
        </div>
      </div>

      {/* ── NEW INVOICE VIEW ── */}
      {view === "new" && creating && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Patient search */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h3 className="font-semibold text-sm mb-3">Select Patient</h3>
              <div className="relative">
                <input className={`${inp} w-full`} placeholder="Search patient…" value={patSearch} onChange={(e) => { setPatSearch(e.target.value); setSelectedPat(null); }} />
                {filteredPatients.length > 0 && (
                  <div className={`absolute z-20 w-full top-full mt-1 rounded-xl border shadow-lg overflow-hidden ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                    {filteredPatients.map((p) => (
                      <button key={p.id} onClick={() => selectPatientForNew(p)} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-cyan-50 dark:hover:bg-slate-700 transition-colors`}>
                        <span className="font-medium">{p.name}</span>
                        <span className={`ml-2 text-xs ${sub}`}>{p.id} · {p.gender} · {p.age} yrs</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedPat && (
                <div className={`mt-3 rounded-xl border p-3 text-sm ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <p className="font-semibold text-cyan-500">{selectedPat.name}</p>
                  <p className={`text-xs ${sub}`}>{selectedPat.id} · {selectedPat.gender} · {selectedPat.age} · {selectedPat.phone}</p>
                </div>
              )}
            </div>

            {/* Invoice header fields */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h3 className="font-semibold text-sm mb-4">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Department",      "department"],
                  ["Doctor",          "doctorName"],
                  ["Invoice Date",    "date", "date"],
                  ["Due Date",        "dueDate", "date"],
                  ["Tax Rate (%)",    "taxRate", "number"],
                  ["Invoice Discount (₹)", "discount", "number"],
                ].map(([lbl, key, type = "text"]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">{lbl}</label>
                    <input
                      type={type}
                      className={`${inp} w-full`}
                      value={newInvForm?.[key] || ""}
                      onChange={(e) => setNewInvForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">Payment Method</label>
                  <select className={`${inp} w-full`} value={newInvForm?.paymentMethod} onChange={(e) => setNewInvForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h3 className="font-semibold text-sm mb-4">Line Items</h3>
              <LineItemsTable items={newLineItems} onChange={setNewLineItems} darkMode={darkMode} />
            </div>

            {/* Notes */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">Notes</label>
              <textarea className={`${inp} w-full h-16 resize-none`} value={newInvForm?.notes || ""} onChange={(e) => setNewInvForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes for patient or internal reference…" />
            </div>

            <button onClick={handleCreateSubmit} disabled={saving} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
              {saving ? "Creating Invoice…" : "Create Invoice"}
            </button>
          </div>

          {/* Preview totals */}
          <div className={`rounded-2xl border p-5 h-fit ${card}`}>
            <h3 className="font-semibold text-sm mb-4">Live Preview</h3>
            <TotalsBlock lineItems={newLineItems} taxRate={newInvForm?.taxRate} discount={newInvForm?.discount} darkMode={darkMode} />
          </div>
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {view === "detail" && selectedInv && (
        <InvoiceDetail
          invoice={selectedInv}
          patients={patients}
          darkMode={darkMode}
          onUpdate={(updated) => {
            onUpdateInvoice?.(updated);
            setSelectedInv(updated);
          }}
          onDelete={async (id) => {
            if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
            await onDeleteInvoice?.(id);
            setView("list");
            setSelectedInv(null);
            toast.success("Invoice deleted.");
          }}
          onClose={() => { setView("list"); setSelectedInv(null); }}
        />
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="space-y-5">
          <SmartFilterBar darkMode={darkMode} onChange={setCriteria} patients={patients} />

          {filtered.length === 0 ? (
            <div className={`rounded-2xl border p-16 text-center ${card}`}>
              <p className="text-4xl mb-2">🧾</p>
              <p className="font-medium">No invoices found</p>
              <p className={`text-sm mt-1 ${sub}`}>Try adjusting your filters or create a new invoice.</p>
              <button onClick={startNew} className="mt-4 text-sm bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium">
                + New Invoice
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filtered.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  selected={selectedInv?.id === inv.id}
                  onSelect={handleSelect}
                  darkMode={darkMode}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { StatusBadge, InvoiceActions, TotalsBlock, LineItemsTable, InvoiceDetail };
