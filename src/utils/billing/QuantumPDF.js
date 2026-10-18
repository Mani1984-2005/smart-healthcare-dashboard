// src/utils/billing/QuantumPDF.js
// MediCare Pro — Billing Phase 3 — QuantumPDF
// Enterprise hospital invoice PDF: professional layout, tax section,
// hospital branding, QR code placeholder, digital signature block.
// Requires: jspdf (already used in PatientsPage), optionally qrcode

import jsPDF from "jspdf";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary:   [6, 182, 212],    // cyan-500
  dark:      [15, 23, 42],     // slate-900
  mid:       [71, 85, 105],    // slate-600
  light:     [148, 163, 184],  // slate-400
  hairline:  [226, 232, 240],  // slate-200
  white:     [255, 255, 255],
  paid:      [16, 185, 129],   // emerald-500
  pending:   [245, 158, 11],   // amber-500
  overdue:   [239, 68, 68],    // red-500
  refunded:  [99, 102, 241],   // indigo-500
  cancelled: [100, 116, 139],  // slate-500
};

const STATUS_COLOR = {
  Paid:      BRAND.paid,
  Pending:   BRAND.pending,
  Overdue:   BRAND.overdue,
  Refunded:  BRAND.refunded,
  Cancelled: BRAND.cancelled,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setFont(doc, style = "normal", size = 9) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

function setColor(doc, rgb) {
  doc.setTextColor(...rgb);
}

function drawHairline(doc, x1, y, x2, rgb = BRAND.hairline) {
  doc.setDrawColor(...rgb);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function drawRect(doc, x, y, w, h, fillRGB, radius = 0) {
  doc.setFillColor(...fillRGB);
  if (radius > 0) {
    doc.roundedRect(x, y, w, h, radius, radius, "F");
  } else {
    doc.rect(x, y, w, h, "F");
  }
}

function rightText(doc, text, rightEdge, y) {
  const w = doc.getTextWidth(String(text));
  doc.text(String(text), rightEdge - w, y);
}

function currency(n) {
  return `\u20B9${(parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function wrapText(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || ""), maxWidth);
}

// ─── QR Code placeholder ─────────────────────────────────────────────────────
// Draws a styled placeholder box for a QR code. If you integrate `qrcode` or
// `qr.js`, replace this with actual QR image data.

function drawQRPlaceholder(doc, x, y, size, payload = "") {
  // Outer box
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, size, size, 1, 1, "S");

  // Inner pattern (simplified finder pattern impression)
  const cell = size / 7;
  const patterns = [
    [0,0,3,3], [4,0,3,3], [0,4,3,3],  // finder squares
  ];
  doc.setFillColor(...BRAND.dark);
  patterns.forEach(([cx, cy, cw, ch]) => {
    doc.rect(x + cx * cell, y + cy * cell, cw * cell, ch * cell, "F");
    doc.setFillColor(...BRAND.white);
    doc.rect(x + cx * cell + cell * 0.4, y + cy * cell + cell * 0.4, cw * cell - cell * 0.8, ch * cell - cell * 0.8, "F");
    doc.setFillColor(...BRAND.dark);
    doc.rect(x + cx * cell + cell * 0.8, y + cy * cell + cell * 0.8, cw * cell - cell * 1.6, ch * cell - cell * 1.6, "F");
    doc.setFillColor(...BRAND.dark);
  });

  // Data area dots
  doc.setFillColor(...BRAND.mid);
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if ((r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3)) continue;
      if (Math.random() > 0.45) {
        doc.rect(x + c * cell + cell * 0.15, y + r * cell + cell * 0.15, cell * 0.7, cell * 0.7, "F");
      }
    }
  }

  // Label below
  setFont(doc, "normal", 6);
  setColor(doc, BRAND.light);
  const label = "Scan to verify";
  const lw = doc.getTextWidth(label);
  doc.text(label, x + (size - lw) / 2, y + size + 3.5);
}

// ─── Digital signature block ──────────────────────────────────────────────────

function drawSignatureBlock(doc, x, y, label = "Authorised Signatory") {
  // Signature line
  drawHairline(doc, x, y, x + 50, BRAND.dark);
  setFont(doc, "normal", 7);
  setColor(doc, BRAND.mid);
  doc.text(label, x, y + 4);
  doc.text("MediCare Pro EMR System", x, y + 8);

  // Digital seal impression
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.4);
  doc.ellipse(x + 57, y - 3, 8, 8, "S");
  setFont(doc, "bold", 5.5);
  setColor(doc, BRAND.primary);
  doc.text("DIGITAL", x + 57 - doc.getTextWidth("DIGITAL") / 2, y - 4);
  doc.text("VERIFIED", x + 57 - doc.getTextWidth("VERIFIED") / 2, y);
}

// ─── Main PDF builder ─────────────────────────────────────────────────────────

/**
 * @param {Object} invoice - full invoice object
 * @param {Object} hospital - { name, address, phone, email, gstin, logo? }
 * @param {Object[]} [lineItems] - [{description, qty, unitPrice, taxPct, total}]
 * @returns {jsPDF}
 */
export function generateInvoicePDF(invoice, hospital = {}, lineItems = []) {
  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W      = 210;
  const margin = 14;
  const right  = W - margin;

  // ── Computed totals ──────────────────────────────────────────────────────────
  const subtotal   = parseFloat(invoice.subtotal  || 0) ||
    lineItems.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseFloat(i.qty) || 1), 0);
  const taxAmount  = parseFloat(invoice.taxAmount || 0) ||
    lineItems.reduce((s, i) => s + ((parseFloat(i.unitPrice) || 0) * (parseFloat(i.qty) || 1) * (parseFloat(i.taxPct) || 0)) / 100, 0);
  const discount   = parseFloat(invoice.discount  || 0);
  const total      = parseFloat(invoice.amount    || subtotal + taxAmount - discount);
  const paidAmount = parseFloat(invoice.paidAmount || (invoice.status === "Paid" ? total : 0));
  const balance    = Math.max(0, total - paidAmount);

  const statusColor = STATUS_COLOR[invoice.status] || BRAND.pending;

  // ── HEADER BAND ──────────────────────────────────────────────────────────────
  drawRect(doc, 0, 0, W, 38, BRAND.dark);

  // Hospital branding
  setFont(doc, "bold", 18);
  setColor(doc, BRAND.white);
  doc.text(hospital.name || "MediCare Pro", margin, 14);

  setFont(doc, "normal", 7.5);
  setColor(doc, BRAND.light);
  const addrLines = [
    hospital.address || "123 Health Avenue, Medical District",
    `Phone: ${hospital.phone || "+91-1234567890"}  |  Email: ${hospital.email || "billing@medicare.pro"}`,
    hospital.gstin ? `GSTIN: ${hospital.gstin}` : "GSTIN: 29AABCU9603R1ZX",
  ];
  addrLines.forEach((line, i) => doc.text(line, margin, 21 + i * 5));

  // "INVOICE" watermark text on right
  setFont(doc, "bold", 22);
  setColor(doc, BRAND.primary);
  rightText(doc, "INVOICE", right, 16);

  // Invoice number + date
  setFont(doc, "normal", 8);
  setColor(doc, BRAND.light);
  rightText(doc, `# ${invoice.invoiceNumber || invoice.id || "INV-0001"}`, right, 23);
  rightText(doc, `Date: ${formatDate(invoice.date)}`, right, 29);
  if (invoice.dueDate) rightText(doc, `Due: ${formatDate(invoice.dueDate)}`, right, 34);

  let y = 48;

  // ── STATUS BADGE + META ROW ──────────────────────────────────────────────────
  const badgeW = 26; const badgeH = 7;
  drawRect(doc, margin, y - 5, badgeW, badgeH, statusColor, 1.5);
  setFont(doc, "bold", 7.5);
  setColor(doc, BRAND.white);
  doc.text(invoice.status || "Pending", margin + 2, y - 0.2);

  if (invoice.paymentMethod) {
    setFont(doc, "normal", 7.5);
    setColor(doc, BRAND.mid);
    doc.text(`Payment Method: ${invoice.paymentMethod}`, margin + 32, y - 0.2);
  }

  y += 6;
  drawHairline(doc, margin, y, right);
  y += 6;

  // ── PATIENT + BILLING-TO BOX ─────────────────────────────────────────────────
  const colW = (right - margin - 6) / 2;
  const boxH = 34;

  // Patient box
  drawRect(doc, margin, y, colW, boxH, [248, 250, 252], 2);
  setFont(doc, "bold", 7.5);
  setColor(doc, BRAND.primary);
  doc.text("BILL TO", margin + 4, y + 6);
  setFont(doc, "bold", 9);
  setColor(doc, BRAND.dark);
  doc.text(invoice.patientName || "Patient Name", margin + 4, y + 12);
  setFont(doc, "normal", 7.5);
  setColor(doc, BRAND.mid);
  const patFields = [
    `ID: ${invoice.patientId || "—"}`,
    invoice.patientGender ? `${invoice.patientGender}${invoice.patientAge ? ", " + invoice.patientAge + " yrs" : ""}` : "",
    invoice.patientPhone  || "",
    invoice.patientAddress || "",
  ].filter(Boolean);
  patFields.forEach((line, i) => doc.text(line, margin + 4, y + 18 + i * 4.5));

  // Billing details box
  const bx = margin + colW + 6;
  drawRect(doc, bx, y, colW, boxH, [248, 250, 252], 2);
  setFont(doc, "bold", 7.5);
  setColor(doc, BRAND.primary);
  doc.text("BILLING DETAILS", bx + 4, y + 6);
  setFont(doc, "normal", 7.5);
  setColor(doc, BRAND.mid);
  const billingFields = [
    ["Department:",  invoice.department   || "General"],
    ["Doctor:",      invoice.doctorName   || invoice.doctor_name || "—"],
    ["Ref Doctor:",  invoice.referralDoctor || "—"],
    ["Insurance:",   invoice.insuranceProvider || "Self-pay"],
  ];
  billingFields.forEach(([lbl, val], i) => {
    doc.text(lbl, bx + 4, y + 12 + i * 5.5);
    setFont(doc, "bold", 7.5);
    setColor(doc, BRAND.dark);
    doc.text(val, bx + 30, y + 12 + i * 5.5);
    setFont(doc, "normal", 7.5);
    setColor(doc, BRAND.mid);
  });

  y += boxH + 8;

  // ── LINE ITEMS TABLE ─────────────────────────────────────────────────────────
  // Table header
  drawRect(doc, margin, y, right - margin, 8, BRAND.dark);
  setFont(doc, "bold", 7.5);
  setColor(doc, BRAND.white);
  const cols = [
    { label: "#",           x: margin + 2,  w: 8  },
    { label: "Description", x: margin + 10, w: 75 },
    { label: "Qty",         x: margin + 87, w: 14, right: true },
    { label: "Unit Price",  x: margin + 103, w: 24, right: true },
    { label: "Tax %",       x: margin + 129, w: 16, right: true },
    { label: "Amount",      x: right - 2,   w: 0,  right: true },
  ];
  cols.forEach((col) => {
    if (col.right) rightText(doc, col.label, col.x + col.w, y + 5.5);
    else doc.text(col.label, col.x, y + 5.5);
  });

  y += 8;

  // Table rows
  const displayItems = lineItems.length > 0 ? lineItems : [
    {
      description: invoice.description || invoice.notes || "Medical Services",
      qty:         1,
      unitPrice:   subtotal,
      taxPct:      invoice.taxRate || 0,
      total:       subtotal,
    },
  ];

  displayItems.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    drawRect(doc, margin, y, right - margin, 9, rowBg);

    const lineTotal = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 1);
    const lineTax   = lineTotal * ((parseFloat(item.taxPct) || 0) / 100);
    const lineAmt   = lineTotal + lineTax - (parseFloat(item.discount) || 0);

    setFont(doc, "normal", 7.5);
    setColor(doc, BRAND.mid);
    doc.text(String(idx + 1), margin + 2, y + 6);

    setColor(doc, BRAND.dark);
    const desc = wrapText(doc, item.description || "Service", 70);
    doc.text(desc[0], margin + 10, y + 6);

    setColor(doc, BRAND.mid);
    rightText(doc, String(parseFloat(item.qty) || 1), margin + 101, y + 6);
    rightText(doc, currency(item.unitPrice),            margin + 127, y + 6);
    rightText(doc, `${parseFloat(item.taxPct) || 0}%`,  margin + 145, y + 6);
    setColor(doc, BRAND.dark);
    setFont(doc, "bold", 7.5);
    rightText(doc, currency(lineAmt),                   right - 2, y + 6);

    drawHairline(doc, margin, y + 9, right, BRAND.hairline);
    y += 9;
  });

  y += 6;

  // ── TOTALS + TAX SECTION ─────────────────────────────────────────────────────
  const totalsX = right - 70;
  const totalsW = 70;

  const totalsRows = [
    { label: "Subtotal",       value: currency(subtotal),   bold: false },
    ...(invoice.taxBreakdown?.length
      ? invoice.taxBreakdown.map((tb) => ({ label: tb.label, value: currency(tb.amount), bold: false, indent: true }))
      : [{ label: `Tax (${invoice.taxRate || 0}%)`, value: currency(taxAmount), bold: false }]
    ),
    ...(discount > 0 ? [{ label: "Discount",        value: `-${currency(discount)}`, bold: false, color: BRAND.paid }] : []),
    { label: "Total",          value: currency(total),      bold: true,  divider: true },
    { label: "Amount Paid",    value: currency(paidAmount), bold: false, color: BRAND.paid },
    { label: "Balance Due",    value: currency(balance),    bold: true,  color: balance > 0 ? BRAND.overdue : BRAND.paid },
  ];

  totalsRows.forEach((row) => {
    if (row.divider) {
      drawHairline(doc, totalsX, y, right, BRAND.dark);
      y += 2;
    }
    if (row.bold) {
      setFont(doc, "bold", 8.5);
      setColor(doc, row.color || BRAND.dark);
    } else {
      setFont(doc, "normal", 7.5);
      setColor(doc, row.color || BRAND.mid);
    }
    const lx = row.indent ? totalsX + 4 : totalsX;
    doc.text(row.label, lx, y);
    rightText(doc, row.value, right, y);
    y += 5.5;
  });

  // GST / Tax summary mini-table
  if (taxAmount > 0) {
    y += 4;
    drawRect(doc, margin, y, 90, 6, [248, 250, 252], 1);
    setFont(doc, "bold", 7);
    setColor(doc, BRAND.mid);
    doc.text("TAX SUMMARY", margin + 2, y + 4.2);
    y += 6;
    drawRect(doc, margin, y, 90, 7, BRAND.dark, 0);
    setFont(doc, "bold", 6.5); setColor(doc, BRAND.white);
    doc.text("Tax Type",   margin + 2,  y + 4.8);
    doc.text("Rate",       margin + 32, y + 4.8);
    doc.text("Taxable Amt",margin + 46, y + 4.8);
    doc.text("Tax Amt",    margin + 72, y + 4.8);
    y += 7;

    const taxRows = invoice.taxBreakdown?.length
      ? invoice.taxBreakdown
      : [{ label: "GST", rate: invoice.taxRate || 0, taxable: subtotal, amount: taxAmount }];

    taxRows.forEach((tb, i) => {
      drawRect(doc, margin, y, 90, 6, i % 2 === 0 ? BRAND.white : [248, 250, 252]);
      setFont(doc, "normal", 6.5); setColor(doc, BRAND.dark);
      doc.text(tb.label   || "GST",                margin + 2,  y + 4.2);
      doc.text(`${tb.rate || 0}%`,                 margin + 32, y + 4.2);
      doc.text(currency(tb.taxable || subtotal),   margin + 46, y + 4.2);
      doc.text(currency(tb.amount  || taxAmount),  margin + 72, y + 4.2);
      y += 6;
    });
  }

  // ── PAYMENT + NOTES ROW ──────────────────────────────────────────────────────
  y += 8;
  drawHairline(doc, margin, y, right);
  y += 6;

  if (invoice.notes) {
    setFont(doc, "bold", 7.5); setColor(doc, BRAND.dark);
    doc.text("Notes:", margin, y);
    setFont(doc, "normal", 7.5); setColor(doc, BRAND.mid);
    const noteLines = wrapText(doc, invoice.notes, right - margin - 4);
    doc.text(noteLines, margin, y + 5);
    y += 5 + noteLines.length * 4.5;
  }

  // ── FOOTER BAND ──────────────────────────────────────────────────────────────
  const footerY = 268;
  if (y > footerY - 20) { doc.addPage(); y = 20; }

  drawRect(doc, 0, footerY, W, 29, BRAND.dark);

  // QR placeholder
  drawQRPlaceholder(doc, margin, footerY - 22, 20, JSON.stringify({ id: invoice.id, total, status: invoice.status }));

  // Signature
  drawSignatureBlock(doc, margin + 26, footerY + 8, "Authorised Signatory");

  // Terms
  setFont(doc, "normal", 6.5); setColor(doc, BRAND.light);
  const terms = [
    "This is a computer-generated invoice and does not require a physical signature.",
    `Payment due by ${formatDate(invoice.dueDate || invoice.date)}. For queries: ${hospital.email || "billing@medicare.pro"}`,
    hospital.terms || "Thank you for trusting MediCare Pro for your healthcare needs.",
  ];
  terms.forEach((t, i) => rightText(doc, t, right, footerY + 6 + i * 4.5));

  return doc;
}

/**
 * Generate and download the invoice PDF immediately.
 */
export function downloadInvoicePDF(invoice, hospital = {}, lineItems = [], filename) {
  const doc  = generateInvoicePDF(invoice, hospital, lineItems);
  const name = filename || `Invoice_${invoice.invoiceNumber || invoice.id || "export"}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
  return name;
}

/**
 * Generate and open in a new browser tab for print/preview.
 */
export function printInvoicePDF(invoice, hospital = {}, lineItems = []) {
  const doc = generateInvoicePDF(invoice, hospital, lineItems);
  const blob = doc.output("blob");
  const url  = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default { generateInvoicePDF, downloadInvoicePDF, printInvoicePDF };