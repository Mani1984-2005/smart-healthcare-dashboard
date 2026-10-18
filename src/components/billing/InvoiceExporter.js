// src/utils/billing/InvoiceExporter.js
// MediCare Pro — Billing Phase 3 — InvoiceExporter
// Orchestration layer: JSON / Print / PDF preparation.
// Integrates DataExporter + QuantumPDF and exposes a unified API.

import { downloadInvoicePDF, printInvoicePDF, generateInvoicePDF } from "./QuantumPDF";
import { exportToJSON, exportToCSV, exportToExcelTSV, normaliseInvoiceForExport, INVOICE_COLUMNS } from "./DataExporter";

// ─── Hospital config (reads from env or defaults) ─────────────────────────────
const defaultHospital = {
  name:    import.meta?.env?.VITE_HOSPITAL_NAME    || "MediCare Pro Hospital",
  address: import.meta?.env?.VITE_HOSPITAL_ADDRESS || "123 Health Avenue, Medical District, Bengaluru — 560001",
  phone:   import.meta?.env?.VITE_HOSPITAL_PHONE   || "+91-80-1234-5678",
  email:   import.meta?.env?.VITE_HOSPITAL_EMAIL   || "billing@medicare.pro",
  gstin:   import.meta?.env?.VITE_HOSPITAL_GSTIN   || "29AABCU9603R1ZX",
  terms:   "All payments are non-refundable except as required by law. Please retain this invoice for your records.",
};

// ─── Single-invoice exports ───────────────────────────────────────────────────

/**
 * Download a single invoice as PDF.
 */
export function exportInvoicePDF(invoice, lineItems = [], hospital = {}) {
  const config = { ...defaultHospital, ...hospital };
  const full   = enrichInvoice(invoice);
  const name   = downloadInvoicePDF(full, config, lineItems);
  return { success: true, filename: name, format: "pdf" };
}

/**
 * Open invoice PDF in browser for printing.
 */
export function printInvoice(invoice, lineItems = [], hospital = {}) {
  const config = { ...defaultHospital, ...hospital };
  const full   = enrichInvoice(invoice);
  printInvoicePDF(full, config, lineItems);
  return { success: true, format: "print" };
}

/**
 * Get a jsPDF instance for a single invoice (for embedding or custom handling).
 */
export function getInvoicePDFDoc(invoice, lineItems = [], hospital = {}) {
  const config = { ...defaultHospital, ...hospital };
  return generateInvoicePDF(enrichInvoice(invoice), config, lineItems);
}

/**
 * Export a single invoice as JSON string (for clipboard / API / storage).
 */
export function exportInvoiceJSON(invoice) {
  const full    = enrichInvoice(invoice);
  const payload = JSON.stringify({ exported_at: new Date().toISOString(), invoice: full }, null, 2);
  return payload;
}

/**
 * Download a single invoice as JSON file.
 */
export function downloadInvoiceJSON(invoice) {
  const full = enrichInvoice(invoice);
  exportToJSON([normaliseInvoiceForExport(full)], `Invoice_${full.invoiceNumber || full.id}.json`);
}

// ─── Bulk exports ─────────────────────────────────────────────────────────────

/**
 * Export an array of invoices to CSV.
 */
export function bulkExportCSV(invoices, filename) {
  const rows = invoices.map((inv) => normaliseInvoiceForExport(enrichInvoice(inv)));
  return exportToCSV(rows, INVOICE_COLUMNS, filename);
}

/**
 * Export an array of invoices to Excel-ready TSV.
 */
export function bulkExportExcel(invoices, filename) {
  const rows = invoices.map((inv) => normaliseInvoiceForExport(enrichInvoice(inv)));
  return exportToExcelTSV(rows, INVOICE_COLUMNS, filename);
}

/**
 * Export an array of invoices to JSON.
 */
export function bulkExportJSON(invoices, filename) {
  const rows = invoices.map((inv) => normaliseInvoiceForExport(enrichInvoice(inv)));
  return exportToJSON(rows, filename);
}

// ─── Unified dispatcher (used by NovaInvoice action buttons) ─────────────────

/**
 * @param {"pdf"|"print"|"json"|"csv"|"excel"} format
 * @param {Object|Object[]} target - single invoice or array for bulk
 * @param {Object[]} [lineItems]
 * @param {Object} [opts] - { hospital, filename }
 */
export function dispatchExport(format, target, lineItems = [], opts = {}) {
  const { hospital = {}, filename } = opts;
  const isArray = Array.isArray(target);

  switch (format) {
    case "pdf":
      if (isArray) throw new Error("PDF export is per-invoice. Use bulkExportCSV for batch.");
      return exportInvoicePDF(target, lineItems, hospital);

    case "print":
      if (isArray) throw new Error("Print is per-invoice.");
      return printInvoice(target, lineItems, hospital);

    case "json":
      return isArray ? bulkExportJSON(target, filename) : downloadInvoiceJSON(target);

    case "csv":
      return isArray
        ? bulkExportCSV(target, filename)
        : bulkExportCSV([target], filename || `Invoice_${target.id}.csv`);

    case "excel":
      return isArray
        ? bulkExportExcel(target, filename)
        : bulkExportExcel([target], filename || `Invoice_${target.id}.tsv`);

    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enriches an invoice with derived fields needed for PDF rendering.
 */
function enrichInvoice(invoice) {
  const subtotal   = parseFloat(invoice.subtotal  || 0) || parseFloat(invoice.amount || 0);
  const taxAmount  = parseFloat(invoice.taxAmount || 0);
  const discount   = parseFloat(invoice.discount  || 0);
  const total      = parseFloat(invoice.amount    || subtotal + taxAmount - discount);
  const paidAmount = parseFloat(invoice.paidAmount || (invoice.status === "Paid" ? total : 0));

  return {
    ...invoice,
    subtotal,
    taxAmount,
    discount,
    amount:      total,
    paidAmount,
    balanceDue:  Math.max(0, total - paidAmount),
    invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id || Date.now()}`,
  };
}

export { defaultHospital };
export default { exportInvoicePDF, printInvoice, getInvoicePDFDoc, exportInvoiceJSON, downloadInvoiceJSON, bulkExportCSV, bulkExportExcel, bulkExportJSON, dispatchExport };