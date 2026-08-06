import { PatientRecord } from "../../stores/patientStore.ts";

export type PatientRisk = "Low" | "Moderate" | "High" | "Critical";
export type PatientPresentation = { doctor: string; department: string; patientType: "Outpatient" | "Inpatient" | "Emergency"; risk: PatientRisk };

const presentationById: Record<string, PatientPresentation> = {
  "P-1001": { doctor: "Dr. Kavya Shah", department: "Cardiology", patientType: "Outpatient", risk: "Moderate" },
  "P-1002": { doctor: "Dr. Anil Kumar", department: "Internal Medicine", patientType: "Inpatient", risk: "High" },
  "P-1003": { doctor: "Dr. Meera Iyer", department: "Pulmonology", patientType: "Outpatient", risk: "Low" },
  "P-1004": { doctor: "Dr. Kavya Shah", department: "Cardiology", patientType: "Emergency", risk: "Critical" },
};

export function getPatientPresentation(patient: PatientRecord): PatientPresentation {
  return presentationById[patient.id] ?? { doctor: "Care team pending", department: "General Medicine", patientType: "Outpatient", risk: patient.status === "Critical" ? "Critical" : "Low" };
}

export function statusVariant(status: PatientRecord["status"]): "success" | "warning" | "critical" | "neutral" {
  if (status === "Active") return "success";
  if (status === "Critical") return "critical";
  if (status === "Under Observation") return "warning";
  return "neutral";
}

export function riskVariant(risk: PatientRisk): "success" | "warning" | "critical" | "info" {
  if (risk === "Critical") return "critical";
  if (risk === "High") return "warning";
  if (risk === "Moderate") return "info";
  return "success";
}
