import api from "./api.js";

export async function fetchDoctors() {
  return api.get("/doctors").then((res) => res.data);
}

export async function createDoctor(payload) {
  return api.post("/doctors", payload).then((res) => res.data);
}

export async function fetchDoctorById(id) {
  return api.get(`/doctors/${id}`).then((res) => res.data);
}

export async function updateDoctor(id, payload) {
  return api.put(`/doctors/${id}`, payload).then((res) => res.data);
}

export async function deleteDoctor(id) {
  return api.delete(`/doctors/${id}`).then((res) => res.data);
}
