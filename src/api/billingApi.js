// src/api/billingApi.js
// Phase 2D — routed through the shared apiClient so these calls carry the
// backend-issued Bearer token and inherit its 401 (session invalidated) and
// 403 (access denied) handling. They previously used bare `fetch`, so the
// backend rejected every one of them with 401. Return shapes are unchanged:
// each function still resolves to the parsed response body.

import { apiClient } from "./client.js";

export const fetchInvoices = async (filters) => {
  const { data } = await apiClient.get("/billing/invoices", { params: filters });
  return data;
};

export const fetchBillingSummary = async () => {
  const { data } = await apiClient.get("/billing/summary");
  return data;
};

export const createInvoice = async (payload) => {
  const { data } = await apiClient.post("/billing/invoices", payload);
  return data;
};
