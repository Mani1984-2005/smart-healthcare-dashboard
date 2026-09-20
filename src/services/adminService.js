import api from "./api.js";

export async function fetchHospitalProfile() {
  return api.get("/hospital/profile").then((res) => res.data);
}

export async function updateHospitalProfile(payload) {
  return api.put("/hospital/profile", payload).then((res) => res.data);
}

export async function fetchDepartments() {
  return api.get("/hospital/departments").then((res) => res.data);
}

export async function createDepartment(payload) {
  return api.post("/hospital/departments", payload).then((res) => res.data);
}

export async function updateDepartment(id, payload) {
  return api.put(`/hospital/departments/${id}`, payload).then((res) => res.data);
}

export async function deleteDepartment(id) {
  return api.delete(`/hospital/departments/${id}`).then((res) => res.data);
}

export async function fetchServiceCharges() {
  return api.get("/hospital/service-charges").then((res) => res.data);
}

export async function createServiceCharge(payload) {
  return api.post("/hospital/service-charges", payload).then((res) => res.data);
}

export async function updateServiceCharge(id, payload) {
  return api.put(`/hospital/service-charges/${id}`, payload).then((res) => res.data);
}

export async function deleteServiceCharge(id) {
  return api.delete(`/hospital/service-charges/${id}`).then((res) => res.data);
}

export async function fetchStaff() {
  return api.get("/staff").then((res) => res.data);
}

export async function createStaff(payload) {
  return api.post("/staff", payload).then((res) => res.data);
}

export async function updateStaff(id, payload) {
  return api.put(`/staff/${id}`, payload).then((res) => res.data);
}

export async function deleteStaff(id) {
  return api.delete(`/staff/${id}`).then((res) => res.data);
}
