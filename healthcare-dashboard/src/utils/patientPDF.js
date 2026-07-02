import { createEnterprisePDF } from "./enterprisePDF";

export function generatePatientPDF(patient) {
  const pdf = createEnterprisePDF("Patient Medical Report");
  const { doc, sectionTitle, infoTable, divider, disclaimer, save, ph } = pdf;
  let y = 45;

  y = sectionTitle("Patient Information", y);
  y = infoTable([
    { label: "Patient ID", value: patient.id },
    { label: "Name", value: patient.name },
    { label: "Age", value: patient.age },
    { label: "Gender", value: patient.gender },
    { label: "Blood Group", value: patient.bloodGroup || "\u2014" },
    { label: "Phone", value: patient.phone || "\u2014" },
    { label: "Email", value: patient.email || "\u2014" },
    { label: "Disease", value: patient.disease || "\u2014" },
  ], y);

  y = divider(y + 8);
  y = infoTable([
    { label: "Weight", value: patient.weight ? `${patient.weight} kg` : "\u2014" },
    { label: "Height", value: patient.height ? `${patient.height} cm` : "\u2014" },
    { label: "BMI", value: patient.bmi || "\u2014" },
    { label: "Allergies", value: patient.allergies || "None" },
    { label: "Address", value: patient.address || "\u2014" },
  ], y);

  if (patient.emergencyContact) {
    y = divider(y + 8);
    y = sectionTitle("Emergency Contact", y);
    y = infoTable([
      { label: "Name", value: patient.emergencyContact.name || "\u2014" },
      { label: "Phone", value: patient.emergencyContact.phone || "\u2014" },
      { label: "Relation", value: patient.emergencyContact.relation || "\u2014" },
    ], y);
  }

  if (patient.timeline?.length > 0) {
    y = divider(y + 4);
    y = sectionTitle("Medical Timeline", y);
    const recentEvents = patient.timeline.slice(-10);
    y = infoTable(recentEvents.map((e) => ({ label: e.date || "\u2014", value: `${e.type}: ${e.title}` })), y, 1);
  }

  y = disclaimer(Math.max(y + 4, ph - 40));
  save(`${patient.name || "Patient"}_Medical_Report.pdf`);
}

export function generatePatientSummary(patients) {
  const pdf = createEnterprisePDF("Patient Summary Report");
  const { doc, sectionTitle, table, disclaimer, save, ph } = pdf;
  let y = 45;

  y = sectionTitle("Patient Summary", y);
  const headers = ["ID", "Name", "Age", "Gender", "Blood Group", "Status"];
  const rows = patients.slice(0, 50).map((p) => [
    p.id || "\u2014", p.name || "\u2014", String(p.age || "\u2014"),
    p.gender || "\u2014", p.bloodGroup || "\u2014", p.status || "\u2014",
  ]);
  y = table(headers, rows, y + 4);

  disclaimer(Math.max(y + 4, ph - 40));
  save("Patient_Summary_Report.pdf");
}
