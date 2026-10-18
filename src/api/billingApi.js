// src/api/billingApi.js

export const fetchInvoices = async (filters) => {
  const params = new URLSearchParams(filters);

  const res = await fetch(`/api/billing/invoices?${params}`);
  if (!res.ok) throw new Error("Failed to fetch invoices");

  return res.json();
};

export const fetchBillingSummary = async () => {
  const res = await fetch(`/api/billing/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");

  return res.json();
};

export const createInvoice = async (data) => {
  const res = await fetch(`/api/billing/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Invoice creation failed");

  return res.json();
};