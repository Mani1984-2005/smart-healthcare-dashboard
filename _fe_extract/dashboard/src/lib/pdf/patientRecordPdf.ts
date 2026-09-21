import { PatientRecord } from "../../stores/patientStore.ts";
import { InvoiceRecord } from "../../stores/billingStore.ts";
import { JsPdfInstance, loadJsPdf } from "./jspdfLoader.ts";

const BRAND = { primary: [11, 110, 153] as [number, number, number], text: [30, 41, 59] as [number, number, number], muted: [100, 116, 139] as [number, number, number] };
const MARGIN = 40;

export type PatientRecordPdfInput = {
  patient: PatientRecord;
  invoices: InvoiceRecord[];
  generatedBy: string;
};

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function buildRecordReferenceId(patient: PatientRecord) {
  return `REC-${patient.id}-${Date.now().toString(36).toUpperCase()}`;
}

function drawHeader(doc: JsPdfInstance, pageWidth: number) {
  doc.setTextColor(...BRAND.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MediCare Pro Hospital", MARGIN, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text("Registration No. MCP-HOSP-0042  ·  Emergency: +91 1800 200 1000", MARGIN, 60);
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, 70, pageWidth - MARGIN, 70);
}

function drawFooter(doc: JsPdfInstance, pageWidth: number, pageHeight: number, pageNum: number, pageCount: number, referenceId: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Reference: ${referenceId}`, MARGIN, pageHeight - 24);
  doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 24, { align: "right" });
  doc.text("Confidential patient medical record — for authorized use only.", pageWidth / 2, pageHeight - 24, { align: "center" });
}

/**
 * Generates a Patient Medical Record PDF from data already present in the
 * app's stores. It deliberately does NOT invent doctor visits, lab results,
 * or prescriptions — modules for those (Doctors, Appointments, Laboratory,
 * Pharmacy) are not yet wired to real per-patient data in this build, so
 * those sections are rendered as explicit "not on file" notices instead of
 * fabricated content.
 */
export async function generatePatientRecordPdf({ patient, invoices, generatedBy }: PatientRecordPdfInput) {
  const jsPDFCtor = await loadJsPdf();
  const doc = new jsPDFCtor({ unit: "pt", format: "a4" }) as JsPdfInstance;
  const pageWidth = doc.internal.pageSize.getWidth();
  const referenceId = buildRecordReferenceId(patient);
  const generatedAt = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  let cursorY = 92;

  drawHeader(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.text);
  doc.text("Patient Medical Record", MARGIN, cursorY);
  cursorY += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Generated ${generatedAt} by ${generatedBy}`, MARGIN, cursorY);
  cursorY += 24;

  // Patient identity
  doc.autoTable({
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
    theme: "plain",
    styles: { fontSize: 9, textColor: BRAND.text, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 }, 1: { cellWidth: "auto" }, 2: { fontStyle: "bold", cellWidth: 110 }, 3: { cellWidth: "auto" } },
    head: [["Patient identity", "", "", ""]],
    headStyles: { fontStyle: "bold", fontSize: 10, textColor: BRAND.primary, fillColor: [240, 249, 251] },
    body: [
      ["Patient ID", patient.id, "Registered", patient.registrationDate],
      ["Full name", patient.fullName, "Status", patient.status],
      ["Age / Gender", `${patient.age} / ${patient.gender}`, "Blood group", patient.bloodGroup || "Not on file"],
      ["Phone", patient.phone || "Not on file", "Email", patient.email || "Not on file"],
      ["Address", patient.address || "Not on file", "", ""],
    ],
  });
  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 20;

  // Medical history — real data only
  doc.autoTable({
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
    theme: "striped",
    styles: { fontSize: 9, textColor: BRAND.text, cellPadding: 4 },
    headStyles: { fontStyle: "bold", fontSize: 10, textColor: [255, 255, 255], fillColor: BRAND.primary },
    head: [["Medical history"]],
    body: patient.medicalHistory.length > 0 ? patient.medicalHistory.map((entry) => [entry]) : [["No medical history recorded."]],
  });
  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 20;

  // Billing — real invoices linked to this patient
  const patientInvoices = invoices.filter((invoice) => invoice.patientId === patient.id);
  doc.autoTable({
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
    theme: "striped",
    styles: { fontSize: 8.5, textColor: BRAND.text, cellPadding: 4 },
    headStyles: { fontStyle: "bold", fontSize: 10, textColor: [255, 255, 255], fillColor: BRAND.primary },
    head: [["Invoice #", "Date", "Doctor", "Department", "Status", "Amount (₹)", "Balance due (₹)"]],
    body: patientInvoices.length > 0
      ? patientInvoices.map((invoice) => [invoice.invoiceNumber, invoice.billingDate, invoice.doctorName || "—", invoice.department || "—", invoice.status, invoice.grandTotal.toLocaleString("en-IN"), invoice.balanceDue.toLocaleString("en-IN")])
      : [["No billing records on file for this patient.", "", "", "", "", "", ""]],
  });
  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 20;

  // Sections not yet backed by real per-patient data in this build
  const pendingSections: [string, string][] = [
    ["Appointments", "The Appointments module is not yet connected to per-patient records in this build — no appointment history is available to include."],
    ["Doctors / consultations", "Consultation notes, diagnoses, and treatment plans are not yet tracked per patient in this build."],
    ["Laboratory", "The Laboratory module is not yet connected to per-patient records in this build — no test results are available to include."],
    ["Prescriptions", "The Pharmacy/prescriptions module is not yet connected to per-patient records in this build — no prescription history is available to include."],
  ];

  for (const [title, note] of pendingSections) {
    doc.autoTable({
      startY: cursorY,
      margin: { left: MARGIN, right: MARGIN },
      theme: "plain",
      styles: { fontSize: 9, textColor: BRAND.muted, cellPadding: 4 },
      headStyles: { fontStyle: "bold", fontSize: 10, textColor: BRAND.primary, fillColor: [240, 249, 251] },
      head: [[title]],
      body: [[note]],
    });
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 16;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, doc.internal.pageSize.getHeight(), i, pageCount, referenceId);
  }

  const filename = `MediCarePro_Patient_${sanitizeFilenamePart(patient.id)}_${sanitizeFilenamePart(patient.fullName)}.pdf`;
  return { doc, filename, referenceId, generatedAt };
}
