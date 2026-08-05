// src/utils/billing/DataExporter.js
// MediCare Pro — Billing Phase 3 — DataExporter
// Reusable CSV / Excel-ready TSV / JSON export engine.
// No external dependencies — pure browser/Node-compatible JS.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCSVCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row, columns) {
  return columns.map((col) => escapeCSVCell(row[col.key] ?? col.fallback ?? "")).join(",");
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

// ─── Column definitions ───────────────────────────────────────────────────────

export const INVOICE_COLUMNS = [
  { key: "invoiceNumber", header: "Invoice #" },
  { key: "patientId",     header: "Patient ID" },
  { key: "patientName",   header: "Patient Name" },
  { key: "date",          header: "Invoice Date" },
  { key: "dueDate",       header: "Due Date" },
  { key: "status",        header: "Status" },
  { key: "subtotal",      header: "Subtotal (₹)" },
  { key: "taxAmount",     header: "Tax (₹)" },
  { key: "discount",      header: "Discount (₹)" },
  { key: "amount",        header: "Total (₹)" },
  { key: "paidAmount",    header: "Paid (₹)" },
  { key: "balanceDue",    header: "Balance Due (₹)" },
  { key: "paymentMethod", header: "Payment Method" },
  { key: "department",    header: "Department" },
  { key: "doctorName",    header: "Doctor" },
  { key: "notes",         header: "Notes" },
];

export const PAYMENT_COLUMNS = [
  { key: "id",            header: "Transaction ID" },
  { key: "invoiceNumber", header: "Invoice #" },
  { key: "patientId",     header: "Patient ID" },
  { key: "patientName",   header: "Patient Name" },
  { key: "amount",        header: "Amount (₹)" },
  { key: "type",          header: "Type" },
  { key: "method",        header: "Method" },
  { key: "date",          header: "Date" },
  { key: "status",        header: "Status" },
  { key: "reference",     header: "Reference No." },
];

// ─── CSV Export ───────────────────────────────────────────────────────────────

/**
 * Export records to a downloadable CSV file.
 * @param {Object[]} records
 * @param {Array<{key:string, header:string, fallback?:string}>} columns
 * @param {string} [filename]
 */
export function exportToCSV(records, columns = INVOICE_COLUMNS, filename) {
  const name = filename || `MediCarePro_Invoices_${nowStamp()}.csv`;
  const header = columns.map((c) => escapeCSVCell(c.header)).join(",");
  const rows   = records.map((r) => rowToCSV(r, columns));
  const bom    = "\uFEFF"; // UTF-8 BOM — ensures Excel reads ₹ correctly
  triggerDownload([bom, header, ...rows].join("\n"), name, "text/csv;charset=utf-8;");
  return { filename: name, rows: records.length };
}

// ─── Excel-ready TSV Export ───────────────────────────────────────────────────
// Tab-separated; when opened in Excel/Sheets, cells stay unambiguous.

export function exportToExcelTSV(records, columns = INVOICE_COLUMNS, filename) {
  const name   = filename || `MediCarePro_Invoices_${nowStamp()}.tsv`;
  const header = columns.map((c) => c.header).join("\t");
  const rows   = records.map((r) =>
    columns.map((col) => String(r[col.key] ?? col.fallback ?? "").replace(/\t/g, " ")).join("\t")
  );
  const bom = "\uFEFF";
  triggerDownload([bom, header, ...rows].join("\n"), name, "text/tab-separated-values;charset=utf-8;");
  return { filename: name, rows: records.length };
}

// ─── JSON Export ──────────────────────────────────────────────────────────────

export function exportToJSON(records, filename) {
  const name = filename || `MediCarePro_Invoices_${nowStamp()}.json`;
  const payload = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      system:      "MediCare Pro EMR",
      total:       records.length,
      records,
    },
    null,
    2
  );
  triggerDownload(payload, name, "application/json");
  return { filename: name, rows: records.length };
}

// ─── Reusable export dispatcher ───────────────────────────────────────────────

/**
 * Single entry point for all export formats.
 * @param {"csv"|"tsv"|"json"} format
 * @param {Object[]} records
 * @param {Object} [opts] - { columns, filename }
 */
export function exportData(format, records, opts = {}) {
  const { columns, filename } = opts;
  switch (format) {
    case "csv":  return exportToCSV(records, columns, filename);
    case "tsv":  return exportToExcelTSV(records, columns, filename);
    case "json": return exportToJSON(records, filename);
    default:     throw new Error(`Unsupported export format: ${format}`);
  }
}

// ─── Data normaliser — maps raw billing records to clean export shape ─────────

export function normaliseInvoiceForExport(invoice) {
  const subtotal   = parseFloat(invoice.subtotal  || invoice.amount || 0);
  const taxAmount  = parseFloat(invoice.taxAmount || 0);
  const discount   = parseFloat(invoice.discount  || 0);
  const total      = parseFloat(invoice.amount    || subtotal + taxAmount - discount);
  const paidAmount = parseFloat(invoice.paidAmount || (invoice.status === "Paid" ? total : 0));

  return {
    invoiceNumber: invoice.invoiceNumber || invoice.id || "",
    patientId:     invoice.patientId     || "",
    patientName:   invoice.patientName   || "",
    date:          invoice.date ? new Date(invoice.date).toLocaleDateString("en-IN") : "",
    dueDate:       invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "",
    status:        invoice.status        || "Pending",
    subtotal:      subtotal.toFixed(2),
    taxAmount:     taxAmount.toFixed(2),
    discount:      discount.toFixed(2),
    amount:        total.toFixed(2),
    paidAmount:    paidAmount.toFixed(2),
    balanceDue:    Math.max(0, total - paidAmount).toFixed(2),
    paymentMethod: invoice.paymentMethod || "",
    department:    invoice.department    || "",
    doctorName:    invoice.doctorName    || invoice.doctor_name || "",
    notes:         invoice.notes         || "",
  };
}

export default { exportToCSV, exportToExcelTSV, exportToJSON, exportData, normaliseInvoiceForExport };
