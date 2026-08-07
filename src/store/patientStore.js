import api from "./api.js";

function mapPatient(patient) {
  return {
    id: String(patient.id),
    fullName: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email || "",
    bloodGroup: patient.blood_group || "",
    address: patient.address || "",
    medicalHistory: patient.medical_history || [],
    registrationDate: patient.created_at
      ? patient.created_at.split("T")[0]
      : new Date().toISOString().split("T")[0],
    status: patient.status || "Active",
  };
}

export async function fetchPatients() {
  const res = await api.get("/patients");
  return res.data.map(mapPatient);
}

export async function fetchPatientById(patientId) {
  const res = await api.get(`/patients/${patientId}`);
  return mapPatient(res.data);
}

export async function createPatient(patient) {
  const res = await api.post("/patients", patient);
  return mapPatient(res.data);
}

export async function updatePatient(patientId, patient) {
  const res = await api.put(`/patients/${patientId}`, patient);
  return mapPatient(res.data);
}