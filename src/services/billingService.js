import api from "./api.js";

export async function fetchInvoices() {
  return api.get("/billing/invoices").then((res) => res.data);
}

export async function fetchInvoiceById(id) {
  return api.get(`/billing/invoices/${id}`).then((res) => res.data);
}

export async function createInvoice(payload) {
  return api.post("/billing/invoices", payload).then((res) => res.data);
}

export async function updateInvoice(id, payload) {
  return api.put(`/billing/invoices/${id}`, payload).then((res) => res.data);
}
