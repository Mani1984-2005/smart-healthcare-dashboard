import api from "./api.js";

export async function fetchLaboratoryTests() {
  return api.get("/laboratory/tests").then((res) => res.data);
}

export async function createLaboratoryTest(payload) {
  return api.post("/laboratory/tests", payload).then((res) => res.data);
}

export async function updateLaboratoryTest(id, payload) {
  return api.put(`/laboratory/tests/${id}`, payload).then((res) => res.data);
}
