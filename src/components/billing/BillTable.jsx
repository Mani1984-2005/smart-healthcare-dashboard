// FILE PATH: src/components/billing/BillTable.jsx
//
// Bill history table: search by patient/ID/doctor, filter by date range
// and payment status. Rows have Edit, Delete, Download PDF, and Print actions.
// PDF generation uses jsPDF + html2canvas via a hidden off-screen receipt div.
//
// PROPS:
//   bills:         array of bill objects from billingStorage
//   onEdit(bill):  called when user clicks Edit
//   onDelete(id):  called when user clicks Delete
//   onRefresh():   called after delete so the parent can reload data

import { useState, useRef } from "react";
import { Search, Download, Printer, Pencil, Trash2, X } from "lucide-react";
import BillPrintTemplate from "./BillPrintTemplate";
import { generateBillPdf, printBill } from "../../utils/billPdfGenerator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

const STATUS_STYLES = {
  Paid:    "bg-success-50 text-success-700",
  Unpaid:  "bg-error-50 text-error-700",
  Partial: "bg-warning-50 text-warning-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillTable({ bills, onEdit, onDelete, onRefresh }) {
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("All");
  const [filterFrom,    setFilterFrom]    = useState("");
  const [filterTo,      setFilterTo]      = useState("");
  const [pdfLoading,    setPdfLoading]    = useState(null); // billId being processed

  // Hidden div that holds the print template — html2canvas reads from here
  const printRef  = useRef(null);
  const [printData, setPrintData] = useState(null);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = bills.filter((b) => {
    const term = search.toLowerCase();
    const matchSearch =
      b.patientName.toLowerCase().includes(term) ||
      b.billId.toLowerCase().includes(term) ||
      (b.doctorName || "").toLowerCase().includes(term) ||
      (b.patientId  || "").toLowerCase().includes(term);

    const matchStatus = filterStatus === "All" || b.paymentStatus === filterStatus;

    const matchFrom = !filterFrom || (b.billDate || "") >= filterFrom;
    const matchTo   = !filterTo   || (b.billDate || "") <= filterTo;

    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  // ── PDF generation ─────────────────────────────────────────────────────────

  async function handleDownloadPdf(bill) {
    setPrintData(bill);
    setPdfLoading(bill.billId);
    // Wait a tick so React renders the hidden template before html2canvas reads it
    await new Promise((r) => setTimeout(r, 120));
    await generateBillPdf(printRef.current, `bill-${bill.billId}.pdf`);
    setPdfLoading(null);
  }

  async function handlePrint(bill) {
    setPrintData(bill);
    await new Promise((r) => setTimeout(r, 120));
    printBill(printRef.current);
  }

  // ── Delete with confirm ────────────────────────────────────────────────────

  function handleDelete(bill) {
    if (!window.confirm(`Delete bill ${bill.billId} for ${bill.patientName}? This cannot be undone.`)) return;
    onDelete(bill.billId);
  }

  function clearFilters() {
    setSearch("");
    setFilterStatus("All");
    setFilterFrom("");
    setFilterTo("");
  }

  const hasFilters = search || filterStatus !== "All" || filterFrom || filterTo;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, bill ID, doctor…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partial">Partial</option>
        </select>

        {/* Date range */}
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          title="From date"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          title="To date"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-9 px-3 rounded-lg border border-neutral-200 text-sm text-neutral-500 hover:bg-neutral-50 inline-flex items-center gap-1.5 transition-colors"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-neutral-200/70 shadow-card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {["Bill ID", "Date", "Patient", "Doctor", "Subtotal", "Discount", "GST", "Grand Total", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-neutral-400 text-sm">
                  {hasFilters ? "No bills match your filters. Try clearing them." : "No bills yet. Create your first bill above."}
                </td>
              </tr>
            ) : (
              filtered.map((bill) => (
                <tr key={bill.billId} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{bill.billId}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{fmtDate(bill.billDate)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-800">{bill.patientName}</p>
                    {bill.patientId && <p className="text-xs text-neutral-400">{bill.patientId}</p>}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{bill.doctorName || "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">{fmt(bill.subtotal)}</td>
                  <td className="px-4 py-3 text-error-600">{bill.discountAmt > 0 ? `- ${fmt(bill.discountAmt)}` : "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{bill.gstAmount > 0 ? fmt(bill.gstAmount) : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-neutral-800">{fmt(bill.grandTotal)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[bill.paymentStatus] || "bg-neutral-100 text-neutral-600"}`}>
                      {bill.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ActionBtn
                        icon={<Download size={14} />}
                        label="Download PDF"
                        onClick={() => handleDownloadPdf(bill)}
                        loading={pdfLoading === bill.billId}
                        color="text-primary-600 hover:bg-primary-50"
                      />
                      <ActionBtn
                        icon={<Printer size={14} />}
                        label="Print"
                        onClick={() => handlePrint(bill)}
                        color="text-neutral-600 hover:bg-neutral-100"
                      />
                      <ActionBtn
                        icon={<Pencil size={14} />}
                        label="Edit"
                        onClick={() => onEdit(bill)}
                        color="text-blue-600 hover:bg-blue-50"
                      />
                      <ActionBtn
                        icon={<Trash2 size={14} />}
                        label="Delete"
                        onClick={() => handleDelete(bill)}
                        color="text-error-500 hover:bg-error-50"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 text-xs text-neutral-400 border-t border-neutral-100">
            Showing {filtered.length} of {bills.length} bill(s)
          </div>
        )}
      </div>

      {/* ── Hidden print/PDF template ────────────────────────────────────── */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
        <div ref={printRef}>
          {printData && <BillPrintTemplate bill={printData} />}
        </div>
      </div>
    </div>
  );
}

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({ icon, label, onClick, color, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={label}
      aria-label={label}
      className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-40 ${color}`}
    >
      {loading
        ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon
      }
    </button>
  );
}