// src/services/physicianWorkspace/physicianWorkspaceService.ts
//
// Part 5 — Physician AI Workspace — frontend service boundary.
//
// Calls the isolated backend API mounted at /physician-workspace/* (see
// backend/routes/physicianWorkspaceRoutes.js) through the app's shared
// axios instance (src/services/api.js), attaching the demo identity
// headers the backend's demo auth adapter expects.
//
// If the backend is unreachable (e.g. this module is being demonstrated on
// its own, or the rest of MediCare Pro's backend isn't running), every
// method here transparently falls back to a local, in-browser demo engine
// so the Physician AI Workspace remains fully usable. Callers do not need
// to know which path served the request; the returned data always carries
// the same shape.

import api from "../api.js";
import type {
  ClinicalCase,
  ClinicalCaseListItem,
  ClinicalSummary,
  SummaryVersion,
  AuditEntry,
  SummarySections,
  PatientDocument,
  ClinicalIntelligenceAnalysis,
} from "../../types/physicianWorkspace";
import {
  localListCases,
  localGetCase,
  localGenerateSummary,
  localGetSummary,
  localEditSummary,
  localApproveSummary,
  localRejectSummary,
  localRegenerateSummary,
  localListVersions,
  localListAudit,
} from "./localDemoStore";

export type DemoIdentity = { id: string; name: string; role: string };

function authHeaders(actor: DemoIdentity) {
  return {
    "x-demo-user-id": actor.id,
    "x-demo-user-name": actor.name,
    "x-demo-user-role": actor.role,
  };
}

/** True once we've detected the backend is unreachable, so we don't retry a
 * live network call on every single interaction within one session. */
let backendKnownUnreachable = false;

async function tryBackend<T>(fn: () => Promise<T>): Promise<T | null> {
  if (backendKnownUnreachable) return null;
  try {
    return await fn();
  } catch (err) {
    // Only fall back for network-level failures, not for the backend
    // legitimately rejecting the request (validation, auth, conflict).
    const isNetworkFailure = !(err as { response?: unknown })?.response;
    if (isNetworkFailure) {
      backendKnownUnreachable = true;
      return null;
    }
    throw err;
  }
}

export async function fetchCases(actor: DemoIdentity): Promise<{ data: ClinicalCaseListItem[]; source: "api" | "local" }> {
  const result = await tryBackend(() =>
    api.get("/physician-workspace/cases", { headers: authHeaders(actor) }).then((res) => res.data.data)
  );
  if (result) return { data: result, source: "api" };
  return { data: localListCases(), source: "local" };
}

export async function fetchCase(
  actor: DemoIdentity,
  caseId: string
): Promise<{ data: ClinicalCase; source: "api" | "local" }> {
  const result = await tryBackend(() =>
    api.get(`/physician-workspace/cases/${caseId}`, { headers: authHeaders(actor) }).then((res) => res.data.data)
  );
  if (result) return { data: result, source: "api" };

  const local = localGetCase(caseId);
  if (!local) throw new Error(`Case ${caseId} was not found`);
  return { data: local, source: "local" };
}

/**
 * Part 1 -> Part 5 bridge. Opens/refreshes a real, completed Part 1 intake
 * session as a case in this workspace (backend:
 * GET /physician-workspace/cases/from-intake/:intakeSessionId). Unlike
 * every other method here, this one has no local-demo fallback: a bridged
 * real intake session doesn't exist in the local demo engine, so if the
 * backend can't be reached the caller gets a clear error instead of
 * silently substituting unrelated demo data.
 */
export async function openFromIntakeSession(
  actor: DemoIdentity,
  intakeSessionId: string
): Promise<{ data: ClinicalCase; source: "api" }> {
  const data = await api
    .get(`/physician-workspace/cases/from-intake/${intakeSessionId}`, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
  return { data, source: "api" };
}

export async function generateSummary(
  actor: DemoIdentity,
  caseId: string
): Promise<{ data: ClinicalSummary; source: "api" | "local" }> {
  const result = await tryBackend(() =>
    api
      .post("/physician-workspace/summaries/generate", { caseId }, { headers: authHeaders(actor) })
      .then((res) => res.data.data)
  );
  if (result) return { data: result, source: "api" };
  return { data: localGenerateSummary(caseId, actor), source: "local" };
}

export async function fetchSummary(
  actor: DemoIdentity,
  summaryId: string,
  source: "api" | "local"
): Promise<ClinicalSummary> {
  if (source === "local") {
    const local = localGetSummary(summaryId);
    if (!local) throw new Error(`Summary ${summaryId} was not found`);
    return local;
  }
  return api.get(`/physician-workspace/summaries/${summaryId}`, { headers: authHeaders(actor) }).then((res) => res.data.data);
}

export async function editSummary(
  actor: DemoIdentity,
  summaryId: string,
  source: "api" | "local",
  sections: Partial<SummarySections>
): Promise<ClinicalSummary> {
  if (source === "local") {
    return localEditSummary(summaryId, actor, sections);
  }
  return api
    .put(`/physician-workspace/summaries/${summaryId}`, { sections }, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

export async function approveSummary(actor: DemoIdentity, summaryId: string, source: "api" | "local"): Promise<ClinicalSummary> {
  if (source === "local") return localApproveSummary(summaryId, actor);
  return api
    .post(`/physician-workspace/summaries/${summaryId}/approve`, {}, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

export async function rejectSummary(
  actor: DemoIdentity,
  summaryId: string,
  source: "api" | "local",
  reason: string
): Promise<ClinicalSummary> {
  if (source === "local") return localRejectSummary(summaryId, actor, reason);
  return api
    .post(`/physician-workspace/summaries/${summaryId}/reject`, { reason }, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

export async function reviseSummary(
  actor: DemoIdentity,
  summaryId: string,
  source: "api" | "local",
  note?: string
): Promise<ClinicalSummary> {
  if (source === "local") return localRegenerateSummary(summaryId, actor, note);
  return api
    .post(`/physician-workspace/summaries/${summaryId}/revise`, { note }, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

export async function fetchVersions(actor: DemoIdentity, summaryId: string, source: "api" | "local"): Promise<SummaryVersion[]> {
  if (source === "local") return localListVersions(summaryId);
  return api
    .get(`/physician-workspace/summaries/${summaryId}/versions`, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

export async function fetchAudit(actor: DemoIdentity, summaryId: string, source: "api" | "local"): Promise<AuditEntry[]> {
  if (source === "local") return localListAudit(summaryId);
  return api
    .get(`/physician-workspace/summaries/${summaryId}/audit`, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

/**
 * Part 3 -> Part 5 bridge (backend/services/physicianWorkspace/part3DocumentsAdapter.js).
 * No local-demo fallback: there is no local equivalent of real Part 3
 * documents, so an unreachable backend surfaces as an error rather than
 * silently substituting unrelated demo data (same reasoning as
 * openFromIntakeSession above).
 */
export async function fetchCaseDocuments(actor: DemoIdentity, caseId: string): Promise<PatientDocument[]> {
  return api
    .get(`/physician-workspace/cases/${caseId}/documents`, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

/**
 * Part 4 -> Part 5 bridge (backend/services/physicianWorkspace/clinicalIntelligenceAdapter.js).
 * Same no-local-fallback reasoning as fetchCaseDocuments above.
 */
export async function fetchCaseClinicalIntelligence(actor: DemoIdentity, caseId: string): Promise<ClinicalIntelligenceAnalysis[]> {
  return api
    .get(`/physician-workspace/cases/${caseId}/clinical-intelligence`, { headers: authHeaders(actor) })
    .then((res) => res.data.data);
}

/** Exposed for tests only. */
export function __resetBackendReachabilityForTests() {
  backendKnownUnreachable = false;
}
