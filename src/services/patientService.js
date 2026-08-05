import api from "./api.js";

export async function fetchPatients() {
  return api.get("/patients").then((res) => res.data);
}

export async function fetchPatientById(patientId) {
  return api.get(`/patients/${patientId}`).then((res) => res.data);
}

export async function createPatient(patient) {
  return api.post("/patients", patient).then((res) => res.data);
}

export async function updatePatient(patientId, patient) {
  return api.put(`/patients/${patientId}`, patient).then((res) => res.data);
}
