import api from "./api.js";

function normalizeGender(value) {
  return value === "Female" || value === "Male" || value === "Other" ? value : "Other";
}

function normalizeStatus(value) {
  const allowed = ["Active", "Inactive", "Discharged", "Under Observation", "Critical"];
  return allowed.includes(value) ? value : "Active";
}

function mapPatient(patient) {
  return {
    id: String(patient.id),
    fullName: patient.fullName || patient.name || "Unnamed Patient",
    age: Number(patient.age ?? 0),
    gender: normalizeGender(patient.gender),
    phone: patient.phone || "",
    email: patient.email || "",
    bloodGroup: patient.bloodGroup || patient.blood_group || "",
    address: patient.address || "",
    medicalHistory: Array.isArray(patient.medicalHistory)
      ? patient.medicalHistory
      : Array.isArray(patient.medical_history)
        ? patient.medical_history
        : [],
    registrationDate: patient.registrationDate || (patient.created_at ? patient.created_at.split("T")[0] : new Date().toISOString().split("T")[0]),
    status: normalizeStatus(patient.status),
  };
}

export async function fetchPatients() {
  const response = await api.get("/patients");
  return response.data.map(mapPatient);
}

export async function fetchPatientById(patientId) {
  const response = await api.get(`/patients/${patientId}`);
  return mapPatient(response.data);
}

export async function createPatient(patient) {
  const response = await api.post("/patients", patient);
  return mapPatient(response.data);
}

export async function updatePatient(patientId, patient) {
  const response = await api.put(`/patients/${patientId}`, patient);
  return mapPatient(response.data);
}

export async function deletePatient(patientId) {
  await api.delete(`/patients/${patientId}`);
  return true;
}
