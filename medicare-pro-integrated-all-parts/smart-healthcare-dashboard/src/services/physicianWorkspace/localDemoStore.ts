// src/services/physicianWorkspace/localDemoStore.ts
//
// Part 5 — Physician AI Workspace — local (offline) workflow store.
// Mirrors backend/services/physicianWorkspace/store.js so the same
// generate → review → edit → approve/reject workflow can be demonstrated
// entirely in the browser when the backend API is unreachable.

import type { ClinicalSummary, SummaryVersion, AuditEntry, SummarySections } from "../../types/physicianWorkspace";
import { getLocalDemoCases } from "./localDemoData";
import { generateLocalSummary } from "./localDemoEngine";

const EDITABLE = new Set(["AI_GENERATED", "PHYSICIAN_EDITED", "REVISION_REQUESTED"]);
const DECIDABLE = new Set(["AI_GENERATED", "PHYSICIAN_EDITED"]);
const REGENERATABLE = new Set(["AI_GENERATED", "PHYSICIAN_EDITED", "REJECTED", "REVISION_REQUESTED"]);

type Actor = { id: string; name: string; role: string };

let cases = getLocalDemoCases();
let summaries = new Map<string, ClinicalSummary>();
let versions = new Map<string, SummaryVersion[]>();
let audit = new Map<string, AuditEntry[]>();
let seq = 1;

export function resetLocalStore() {
  cases = getLocalDemoCases();
  summaries = new Map();
  versions = new Map();
  audit = new Map();
  seq = 1;
}

function recordAudit(summaryId: string, caseId: string, actor: Actor, action: string, details: unknown = null) {
  const list = audit.get(summaryId) || [];
  list.push({
    id: `AUDIT-${summaryId}-${list.length + 1}`,
    summaryId,
    caseId,
    actor,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
  audit.set(summaryId, list);
}

function pushVersion(summaryId: string, entry: Omit<SummaryVersion, "version">) {
  const list = versions.get(summaryId) || [];
  list.push({ version: list.length + 1, ...entry });
  versions.set(summaryId, list);
}

export function localListCases() {
  return cases;
}

export function localGetCase(caseId: string) {
  return cases.find((c) => c.id === caseId) || null;
}

export function localGetSummary(summaryId: string) {
  return summaries.get(summaryId) || null;
}

export function localListVersions(summaryId: string) {
  return versions.get(summaryId) || [];
}

export function localListAudit(summaryId: string) {
  return audit.get(summaryId) || [];
}

export function localGenerateSummary(caseId: string, actor: Actor): ClinicalSummary {
  const clinicalCase = localGetCase(caseId);
  if (!clinicalCase) throw new Error(`Case ${caseId} was not found`);

  const ai = generateLocalSummary(clinicalCase);
  const id = `LOCAL-SUM-${String(seq++).padStart(4, "0")}`;
  const timestamp = new Date().toISOString();

  const summary: ClinicalSummary = {
    id,
    caseId,
    status: "AI_GENERATED",
    sections: ai.sections,
    flags: ai.flags,
    aiMeta: { model: ai.model, disclaimer: ai.disclaimer, generatedAt: ai.generatedAt },
    editedBy: null,
    approvedBy: null,
    rejectedBy: null,
    revisionNote: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    currentVersion: 1,
  };

  summaries.set(id, summary);
  pushVersion(id, { changeType: "AI_GENERATED", status: summary.status, sections: summary.sections, actor, timestamp });
  recordAudit(id, caseId, actor, "SUMMARY_GENERATED", { model: ai.model });
  return summary;
}

export function localEditSummary(summaryId: string, actor: Actor, newSections: Partial<SummarySections>): ClinicalSummary {
  const summary = summaries.get(summaryId);
  if (!summary) throw new Error(`Summary ${summaryId} was not found`);
  if (!EDITABLE.has(summary.status)) throw new Error(`Summary in status ${summary.status} cannot be edited`);

  const timestamp = new Date().toISOString();
  summary.sections = { ...summary.sections, ...newSections };
  summary.status = "PHYSICIAN_EDITED";
  summary.editedBy = actor;
  summary.updatedAt = timestamp;
  summary.currentVersion += 1;

  pushVersion(summaryId, { changeType: "PHYSICIAN_EDITED", status: summary.status, sections: summary.sections, actor, timestamp });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_EDITED");
  return summary;
}

export function localApproveSummary(summaryId: string, actor: Actor): ClinicalSummary {
  const summary = summaries.get(summaryId);
  if (!summary) throw new Error(`Summary ${summaryId} was not found`);
  if (!DECIDABLE.has(summary.status)) throw new Error(`Summary in status ${summary.status} cannot be approved`);

  summary.status = "APPROVED";
  summary.approvedBy = actor;
  summary.updatedAt = new Date().toISOString();
  summary.currentVersion += 1;

  pushVersion(summaryId, { changeType: "APPROVED", status: summary.status, sections: summary.sections, actor, timestamp: summary.updatedAt });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_APPROVED");
  return summary;
}

export function localRejectSummary(summaryId: string, actor: Actor, reason: string): ClinicalSummary {
  const summary = summaries.get(summaryId);
  if (!summary) throw new Error(`Summary ${summaryId} was not found`);
  if (!DECIDABLE.has(summary.status)) throw new Error(`Summary in status ${summary.status} cannot be rejected`);
  if (!reason || !reason.trim()) throw new Error("A rejection reason is required");

  summary.status = "REJECTED";
  summary.rejectedBy = actor;
  summary.revisionNote = reason;
  summary.updatedAt = new Date().toISOString();
  summary.currentVersion += 1;

  pushVersion(summaryId, {
    changeType: "REJECTED",
    status: summary.status,
    sections: summary.sections,
    actor,
    timestamp: summary.updatedAt,
    note: reason,
  });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_REJECTED", { reason });
  return summary;
}

export function localRegenerateSummary(summaryId: string, actor: Actor, note?: string): ClinicalSummary {
  const summary = summaries.get(summaryId);
  if (!summary) throw new Error(`Summary ${summaryId} was not found`);
  if (!REGENERATABLE.has(summary.status)) throw new Error(`Summary in status ${summary.status} cannot be regenerated`);

  const clinicalCase = localGetCase(summary.caseId)!;
  const ai = generateLocalSummary(clinicalCase);
  const timestamp = new Date().toISOString();

  summary.status = "AI_GENERATED";
  summary.sections = ai.sections;
  summary.flags = ai.flags;
  summary.aiMeta = { model: ai.model, disclaimer: ai.disclaimer, generatedAt: ai.generatedAt };
  summary.editedBy = null;
  summary.approvedBy = null;
  summary.rejectedBy = null;
  summary.revisionNote = note || null;
  summary.updatedAt = timestamp;
  summary.currentVersion += 1;

  pushVersion(summaryId, { changeType: "REGENERATED", status: summary.status, sections: summary.sections, actor, timestamp, note: note || null });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_REGENERATED", { note: note || null });
  return summary;
}
