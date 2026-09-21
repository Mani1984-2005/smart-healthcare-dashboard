import api from "./api.js";

export async function fetchAppointments() {
  return api.get("/appointments").then((res) => res.data);
}

export async function createAppointment(payload) {
  return api.post("/appointments", payload).then((res) => res.data);
}

export async function updateAppointment(id, payload) {
  return api.put(`/appointments/${id}`, payload).then((res) => res.data);
}

export async function deleteAppointment(id) {
  return api.delete(`/appointments/${id}`).then((res) => res.data);
}
