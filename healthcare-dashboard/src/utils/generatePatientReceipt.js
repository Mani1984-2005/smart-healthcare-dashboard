import jsPDF from "jspdf";

export function generatePatientReceipt(patient) {
  const doc = new jsPDF();

  const receiptNo = `REC-${Date.now()}`;
  const today = new Date().toLocaleString();

  doc.setFontSize(18);
  doc.text("MediCare Pro", 20, 20);

  doc.setFontSize(11);
  doc.text("Smart Healthcare System", 20, 28);
  doc.text("Patient Registration Receipt", 20, 38);

  doc.line(20, 43, 190, 43);

  doc.setFontSize(10);
  doc.text(`Receipt No: ${receiptNo}`, 20, 52);
  doc.text(`Date: ${today}`, 120, 52);

  doc.setFontSize(12);
  doc.text("Patient Details", 20, 68);

  doc.setFontSize(10);
  doc.text(`Patient ID: ${patient.id || "-"}`, 20, 82);
  doc.text(`Name: ${patient.name || "-"}`, 20, 92);
  doc.text(`Age: ${patient.age || "-"}`, 20, 102);
  doc.text(`Gender: ${patient.gender || "-"}`, 20, 112);
  doc.text(`Blood Group: ${patient.bloodGroup || "-"}`, 20, 122);
  doc.text(`Phone: ${patient.phone || "-"}`, 20, 132);
  doc.text(`Disease / Reason: ${patient.disease || "-"}`, 20, 142);
  doc.text(`Address: ${patient.address || "-"}`, 20, 152);
  doc.text(`Registered Date: ${patient.registeredDate || "-"}`, 20, 162);

  doc.line(20, 175, 190, 175);

  doc.setFontSize(9);
  doc.text("This is a computer-generated receipt.", 20, 187);
  doc.text("Thank you for choosing MediCare Pro.", 20, 195);

  doc.save(`${patient.name || "patient"}-receipt.pdf`);
}