import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePatientReceipt(patient) {
  const doc = new jsPDF();

  const receiptId = `REC-${Date.now()}`;
  const date = new Date().toLocaleString();

  doc.setFontSize(18);
  doc.text("MediCare Pro - Patient Receipt", 14, 20);

  doc.setFontSize(11);
  doc.text(`Receipt ID: ${receiptId}`, 14, 30);
  doc.text(`Date: ${date}`, 14, 37);

  autoTable(doc, {
    startY: 50,
    head: [["Field", "Details"]],
    body: [
      ["Patient Name", patient.name || "-"],
      ["Age", patient.age || "-"],
      ["Gender", patient.gender || "-"],
      ["Phone", patient.phone || "-"],
      ["Disease / Reason", patient.disease || "-"],
      ["Address", patient.address || "-"],
      ["Registered Date", patient.registeredDate || "-"],
      ["Amount Paid", patient.amount ? `Rs. ${patient.amount}` : "Rs. 0"],
    ],
  });

  doc.text("Authorized Signature", 140, 270);
  doc.save(`${receiptId}.pdf`);
}