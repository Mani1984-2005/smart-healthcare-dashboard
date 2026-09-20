import api from "./api.js";

export async function fetchMedicines() {
  return api.get("/pharmacy/medicines").then((res) => res.data);
}

export async function fetchMedicineById(id) {
  return api.get(`/pharmacy/medicines/${id}`).then((res) => res.data);
}

export async function createMedicine(payload) {
  return api.post("/pharmacy/medicines", payload).then((res) => res.data);
}

export async function updateMedicine(id, payload) {
  return api.put(`/pharmacy/medicines/${id}`, payload).then((res) => res.data);
}

export async function deleteMedicine(id) {
  return api.delete(`/pharmacy/medicines/${id}`).then((res) => res.data);
}

export async function fetchPrescriptions() {
  return api.get("/pharmacy/prescriptions").then((res) => res.data);
}

export async function createPrescription(payload) {
  return api.post("/pharmacy/prescriptions", payload).then((res) => res.data);
}

export async function updatePrescription(id, payload) {
  return api.put(`/pharmacy/prescriptions/${id}`, payload).then((res) => res.data);
}

export async function deletePrescription(id) {
  return api.delete(`/pharmacy/prescriptions/${id}`).then((res) => res.data);
}
