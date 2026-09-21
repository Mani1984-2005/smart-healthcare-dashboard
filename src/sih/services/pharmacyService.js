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
