import { jsPDF } from "jspdf";

const COLORS = {
  primary: [40, 60, 140],
  primaryDark: [30, 50, 120],
  accent: [220, 180, 50],
  text: [50, 50, 50],
  textLight: [120, 120, 120],
  border: [200, 200, 210],
  highlight: [240, 242, 255],
  white: [255, 255, 255],
  success: [16, 185, 129],
  warning: [245, 158, 11],
  danger: [220, 38, 38],
  info: [59, 130, 246],
};

function now() {
  return new Date().toLocaleString("en-IN", { hour12: true, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function today() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function createEnterprisePDF(title = "Document") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210, ph = 297;
  let pageNum = 1;

  function header() {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pw, 35, "F");
    doc.setFillColor(...COLORS.primaryDark);
    doc.rect(0, 32, pw, 3, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("MediCare Pro", 16, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Enterprise Hospital Management System", 16, 21);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, pw - 16, 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Generated: ${now()}`, pw - 16, 21, { align: "right" });
    doc.setTextColor(...COLORS.text);
  }

  function footer() {
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(16, ph - 18, pw - 16, ph - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text("CONFIDENTIAL — This document is intended for authorized personnel only.", pw / 2, ph - 13, { align: "center" });
    doc.text(`Page ${pageNum}`, pw / 2, ph - 8, { align: "center" });
    doc.text(`MediCare Pro Hospital System v1.0`, 16, ph - 8);
    doc.setTextColor(...COLORS.text);
  }

  function addPage() {
    footer();
    doc.addPage();
    pageNum++;
    header();
  }

  function sectionTitle(text, y) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.text(text, 16, y);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.4);
    doc.line(16, y + 1, pw - 16, y + 1);
    doc.setTextColor(...COLORS.text);
    return y + 8;
  }

  function infoTable(data, startY, cols = 2) {
    let y = startY;
    const colW = (pw - 32) / cols;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    data.forEach((row, i) => {
      const col = i % cols;
      const rowIdx = Math.floor(i / cols);
      const x = 16 + col * colW;
      const yy = y + rowIdx * 7;
      if (yy > ph - 30) { addPage(); y = 40; return; }
      doc.setFont("helvetica", "bold");
      doc.text(row.label + ":", x, yy);
      doc.setFont("helvetica", "normal");
      const val = row.value || "\u2014";
      doc.text(String(val), x + colW / 2, yy);
    });
    return y + Math.ceil(data.length / cols) * 7 + 4;
  }

  function table(headers, rows, startY) {
    let y = startY;
    const colW = (pw - 32) / headers.length;

    doc.setFillColor(...COLORS.highlight);
    doc.rect(16, y - 4, pw - 32, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.primary);
    headers.forEach((h, i) => doc.text(h, 16 + i * colW + 1, y));
    doc.setTextColor(...COLORS.text);
    y += 2;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(16, y, pw - 16, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    rows.forEach((row, ri) => {
      if (y > ph - 25) { addPage(); y = 40; }
      if (ri % 2 === 1) { doc.setFillColor(248, 249, 252); doc.rect(16, y - 3, pw - 32, 6, "F"); }
      row.forEach((cell, ci) => {
        doc.text(String(cell), 16 + ci * colW + 1, y);
      });
      y += 6;
    });
    doc.setDrawColor(...COLORS.border);
    doc.line(16, y - 1, pw - 16, y - 1);
    return y + 3;
  }

  function divider(y) {
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(16, y, pw - 16, y);
    return y + 6;
  }

  function watermark(text = "CONFIDENTIAL") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(50);
    doc.setTextColor(230, 230, 240);
    doc.text(text, pw / 2, ph / 2, { align: "center", angle: -30 });
    doc.setTextColor(...COLORS.text);
  }

  function signatureBlock(y, techName = "", doctorName = "") {
    if (y > ph - 40) { addPage(); y = 40; }
    y += 4;
    doc.setDrawColor(...COLORS.textLight);
    doc.setLineWidth(0.4);
    doc.line(16, y, 80, y);
    doc.line(100, y, 165, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Lab Technician", 16, y + 5);
    doc.text(techName || "_________________________", 16, y + 10);
    doc.text("Verifying Doctor / Pathologist", 100, y + 5);
    doc.text(doctorName || "_________________________", 100, y + 10);
    return y + 18;
  }

  function sealBlock(y) {
    if (y > ph - 35) { addPage(); y = 40; }
    y += 2;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.8);
    doc.circle(180, y, 12, "S");
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.primary);
    doc.text("LAB", 177, y - 2);
    doc.text("SEAL", 176, y + 2);
    doc.setTextColor(...COLORS.text);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(155, y - 18, 18, 18, "S");
    doc.setFontSize(5.5);
    doc.setTextColor(130, 130, 130);
    doc.text("QR Verify", 156, y - 3);
    doc.setTextColor(...COLORS.text);
    return y + 8;
  }

  function disclaimer(y) {
    if (y > ph - 25) { addPage(); y = 40; }
    y += 2;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(16, y, pw - 16, y);
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    const text = "This document has been generated by MediCare Pro Enterprise Hospital Management System. All information contained herein is confidential and intended solely for authorized medical professionals. Results must be interpreted in clinical context. This is not a substitute for professional medical judgment.";
    const lines = doc.splitTextToSize(text, pw - 32);
    doc.text(lines, 16, y);
    doc.setTextColor(...COLORS.text);
    return y + lines.length * 4 + 6;
  }

  // Render first page
  header();
  watermark();

  return {
    doc,
    pw,
    ph,
    pageNum: () => pageNum,
    header,
    footer,
    addPage,
    sectionTitle,
    infoTable,
    table,
    divider,
    signatureBlock,
    sealBlock,
    disclaimer,
    save: (filename) => {
      footer();
      doc.save(filename);
    },
    getDoc: () => doc,
  };
}
