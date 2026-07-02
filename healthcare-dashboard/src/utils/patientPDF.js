import jsPDF from "jspdf";

export function generatePatientPDF(patient) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("MediCare Pro", 20, 20);

  doc.setFontSize(14);
  doc.text("Patient Report", 20, 35);

  doc.setFontSize(11);

  doc.text(`Patient ID: ${patient.id || "-"}`, 20, 50);
  doc.text(`Name: ${patient.name || "-"}`, 20, 60);
  doc.text(`Age: ${patient.age || "-"}`, 20, 70);
  doc.text(`Gender: ${patient.gender || "-"}`, 20, 80);
  doc.text(`Blood Group: ${patient.bloodGroup || "-"}`, 20, 90);
  doc.text(`Phone: ${patient.phone || "-"}`, 20, 100);
  doc.text(`Disease: ${patient.disease || "-"}`, 20, 110);
  doc.text(`Address: ${patient.address || "-"}`, 20, 120);
  doc.text(`Allergies: ${patient.allergies || "None"}`, 20, 130);

  doc.save(`${patient.name}_Report.pdf`);
}