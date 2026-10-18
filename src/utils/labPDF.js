import { jsPDF } from "jspdf";
import { LAB_MASTER_LIBRARY } from "../data/labMasterLibrary";
import { generateProfileSummary, isAbnormal } from "../data/labMasterLibrary";

function nowTime() {
  return new Date().toLocaleString("en-IN", { hour12:true, day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export function downloadLabReportPDF(test) {
  const doc = new jsPDF();
  const profileDef = LAB_MASTER_LIBRARY[test.testName];
  const pageW = 210;
  const generated = nowTime();
  let pageNum = 1;

  function addPageNumber() {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum}`, pageW / 2, 292, { align:"center" });
    doc.text("CONFIDENTIAL \u2014 MEDICAL DOCUMENT", pageW / 2, 286, { align:"center" });
  }

  doc.setFillColor(40, 60, 140);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(30, 50, 120);
  doc.rect(0, 29, pageW, 3, "F");
  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(12, 4, 24, 24, 3, 3, "S");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("\uD83C\uDFE5", 18, 18);
  doc.setFontSize(16);
  doc.text("MediCare Pro", 42, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Smart Healthcare Dashboard \u2014 Laboratory Information System", 42, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LABORATORY REPORT", pageW - 14, 13, { align:"right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${generated}`, pageW - 14, 21, { align:"right" });
  doc.setTextColor(0, 0, 0);

  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 60, 140);
  doc.text("\u258C PATIENT DETAILS", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.setDrawColor(40, 60, 140);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const patFields = [
    [`Report ID: ${test.testId}`, `Patient Name: ${test.patientName}`],
    [`Patient ID: ${test.patientId || "\u2014"}`, `Gender: ${test.patientGender || "\u2014"}`],
    [`Profile: ${test.testName}`, `Category: ${test.category}`],
    [`Priority: ${test.priority}`, `Status: ${test.status}`],
    [`Ordered By: Dr. ${test.requestedBy}`, `Request Date: ${test.requestDate}`],
    [`Result Date: ${test.resultDate || "\u2014"}`, `Sample Type: ${profileDef?.sampleType || test.sampleType || "\u2014"}`],
  ];
  patFields.forEach(([left, right]) => {
    doc.text(left, 14, y);
    doc.text(right, 110, y);
    y += 7;
  });

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 60, 140);
  doc.text("\u258C SAMPLE INFORMATION", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.line(14, y, pageW - 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Sample Type: ${profileDef?.sampleType || "\u2014"}`, 14, y);
  doc.text(`Barcode: ${test.sampleBarcode || "\u2014"}`, 90, y);
  y += 7;
  doc.text(`Collected: ${test.sampleCollectedAt || "\u2014"}`, 14, y);
  doc.text(`Received: ${test.sampleReceivedAt || "\u2014"}`, 90, y);
  y += 7;
  doc.text(`Processed: ${test.sampleProcessedAt || "\u2014"}`, 14, y);
  doc.text(`Lab Technician: ${test.labTechnicianName || "\u2014"}`, 90, y);
  y += 10;

  if (test.profileResults && Object.keys(test.profileResults).length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 60, 140);
    doc.text("\u258C PROFILE RESULTS", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    doc.line(14, y, pageW - 14, y);
    y += 6;
    doc.setFillColor(230, 235, 255);
    doc.rect(14, y - 4, pageW - 28, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 60, 140);
    doc.text("TEST NAME", 16, y);
    doc.text("VALUE", 80, y);
    doc.text("UNIT", 100, y);
    doc.text("STATUS", 120, y);
    doc.text("REFERENCE", 155, y);
    doc.text("TREND", 185, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    doc.setLineWidth(0.3);
    doc.line(14, y, pageW - 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    Object.entries(test.profileResults).forEach(([testName, result]) => {
      if (result?.value == null || result?.value === "") return;
      const status = result.status || "\u2014";
      const isCrit = status === "Critical Low" || status === "Critical High";
      const isAbn = isAbnormal(result);
      if (isCrit) doc.setTextColor(160, 0, 0);
      else if (isAbn) doc.setTextColor(180, 90, 0);
      const prof = LAB_MASTER_LIBRARY[test.testName]?.tests?.[testName];
      doc.text(prof?.professionalName || testName, 16, y, { maxWidth:60 });
      doc.text(String(result.value), 80, y);
      doc.text(result.unit || "\u2014", 100, y);
      doc.text(status, 120, y, { maxWidth:32 });
      doc.text(result.referenceRange || "\u2014", 155, y, { maxWidth:28 });
      if (result._trend) {
        const arrow = result._trend.direction === "up" ? "\u2191" : result._trend.direction === "down" ? "\u2193" : "\u2192";
        doc.text(`${arrow}${result._trend.percentChange}%`, 185, y);
      } else { doc.text("\u2014", 185, y); }
      doc.setTextColor(0, 0, 0);
      y += 7;
      if (y > 265) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
    });

    const summary = generateProfileSummary(test.testName, test.profileResults, test.previousProfileResults || {});
    if (summary.clinicalPatterns.length > 0) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 60, 140);
      doc.text("\u258C CLINICAL INTERPRETATION", 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
      doc.line(14, y, pageW - 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      summary.clinicalPatterns.forEach(({ pattern }) => {
        const lines = doc.splitTextToSize(`\u2022 ${pattern}`, 175);
        doc.text(lines, 16, y);
        y += lines.length * 5 + 3;
        if (y > 265) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
      });
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Clinical correlation is recommended for all pattern-based interpretations.", 16, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 8;
    }

    if (summary.lines.length > 0) {
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 60, 140);
      doc.text("\u258C OVERALL LABORATORY IMPRESSION", 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
      doc.line(14, y, pageW - 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const impLines = doc.splitTextToSize(summary.overallImpression, 175);
      doc.text(impLines, 16, y);
      y += impLines.length * 5 + 6;
    }
  } else {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("\u258C RESULT", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const rLines = doc.splitTextToSize(test.result || "No result entered.", 175);
    doc.text(rLines, 14, y);
    y += rLines.length * 5 + 8;
  }

  if (test.notes) {
    if (y > 240) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 60, 140);
    doc.text("\u258C DOCTOR NOTES", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(test.notes, 175);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 8;
  }

  if (y > 235) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
  y = Math.max(y + 12, 230);
  doc.setLineWidth(0.4);
  doc.setDrawColor(100, 100, 100);
  doc.line(14, y, 75, y);
  doc.line(90, y, 150, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Lab Technician", 14, y + 5);
  doc.text(test.labTechnicianName || "_________________________", 14, y + 11);
  doc.text("Verifying Doctor / Pathologist", 90, y + 5);
  doc.text(test.verifyingDoctor || "_________________________", 90, y + 11);
  doc.setDrawColor(40, 60, 140);
  doc.setLineWidth(1);
  doc.circle(180, y - 8, 12, "S");
  doc.setFontSize(6);
  doc.setTextColor(40, 60, 140);
  doc.text("LAB", 176.5, y - 10);
  doc.text("SEAL", 175.5, y - 5);
  doc.text("[Placeholder]", 172, y);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.rect(155, y - 22, 18, 18, "S");
  doc.setFontSize(5.5);
  doc.setTextColor(130, 130, 130);
  doc.text("QR Verify", 156, y - 7);
  doc.setTextColor(0, 0, 0);

  y += 20;
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  doc.line(14, y, pageW - 14, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "italic");
  const disclaimer =
    "LABORATORY DISCLAIMER: This report is system-assisted and has been generated for informational purposes only. " +
    "All results must be interpreted in clinical context and reviewed by a qualified medical professional before any clinical decision is made. " +
    "Reference ranges are general guidelines and may vary by laboratory. Clinical correlation is recommended.";
  const discLines = doc.splitTextToSize(disclaimer, pageW - 28);
  doc.text(discLines, 14, y);

  addPageNumber();
  doc.save(`${test.testId}_${test.testName.replace(/\s+/g, "_")}_lab_report.pdf`);
}
