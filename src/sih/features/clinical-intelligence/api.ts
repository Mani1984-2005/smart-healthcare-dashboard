/// <reference types="vite/client" />
// SIH Part 4 — Clinical Intelligence API client.
// The session token is held in memory only (never localStorage). Authorisation is enforced by the server on every call.
import type { Analysis, ClinicalContext, PatientListItem, ReviewDecision, ServiceStatus } from "./types";

const ROOT = `${import.meta.env.VITE_API_BASE_URL || "/api"}/clinical-intelligence`;

export class ClinicalApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = "ClinicalApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function request<T>(method: "GET" | "POST", path: string, opts: { token?: string | null; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${ROOT}${path}`, {
      method,
      headers: { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ClinicalApiError(0, "NETWORK_ERROR", "The Clinical Intelligence service could not be reached.");
  }
  let json: { success?: boolean; error?: { code?: string; message?: string; requestId?: string } } | null = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok || json?.success === false) {
    throw new ClinicalApiError(res.status, json?.error?.code ?? `HTTP_${res.status}`, json?.error?.message ?? "The request could not be completed.", json?.error?.requestId);
  }
  return json as T;
}

export const clinicalApi = {
  status: () => request<ServiceStatus & { success: true }>("GET", "/status"),
  createSession: (body: { role: string; displayName?: string; hospitalId?: string }) =>
    request<{ token: string; user: { role: string; name: string } }>("POST", "/session", { body }),
  listPatients: (token: string) => request<{ patients: PatientListItem[] }>("GET", "/demo/patients", { token }),
  getContext: (token: string, patientId: string) => request<{ context: ClinicalContext }>("GET", `/patients/${encodeURIComponent(patientId)}/context`, { token }),
  analyze: (token: string, patientId: string, useAI: boolean) => request<{ analysis: Analysis }>("POST", "/analyze", { token, body: { patientId, options: { useAI } } }),
  review: (token: string, analysisId: string, body: { itemId: string; decision: ReviewDecision; note?: string; modifiedText?: string }) =>
    request<{ analysis: Analysis }>("POST", `/analyses/${analysisId}/review`, { token, body }),
};
