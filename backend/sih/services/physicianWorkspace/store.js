// backend/services/physicianWorkspace/store.js
//
// Part 5 — Physician AI Workspace
// ---------------------------------------------------------------------------
// Self-contained in-memory data store + workflow engine.
//
// Design choice: Part 5 intentionally does NOT require PostgreSQL, MongoDB,
// or any other database to be configured. The rest of the repository mixes
// several database technologies inconsistently (see backend/db.js vs
// backend/config/db.js vs Mongoose models), some of which throw at import
// time when environment variables are absent (e.g. Firebase Admin). Relying
// on any of that would break "independently runnable" for Part 5. An
// in-memory store keeps this module demonstrable with zero configuration,
// while still modelling a realistic workflow, versioning and audit trail.
//
// If a future integration wires this module to a real database, only this
// file needs to change — the controller/route layer is unaffected.
// ---------------------------------------------------------------------------

import { getSeedCases } from "./demoData.js";
import { generateClinicalSummary } from "./aiSummaryGenerator.js";
import { logAuditEvent } from "../../utils/logger.js";

export const SUMMARY_STATUS = Object.freeze({
  AI_GENERATED: "AI_GENERATED",
  PHYSICIAN_EDITED: "PHYSICIAN_EDITED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
});

const EDITABLE_STATUSES = new Set([
  SUMMARY_STATUS.AI_GENERATED,
  SUMMARY_STATUS.PHYSICIAN_EDITED,
  SUMMARY_STATUS.REVISION_REQUESTED,
]);

const DECIDABLE_STATUSES = new Set([
  SUMMARY_STATUS.AI_GENERATED,
  SUMMARY_STATUS.PHYSICIAN_EDITED,
]);

const REGENERATABLE_STATUSES = new Set([
  SUMMARY_STATUS.AI_GENERATED,
  SUMMARY_STATUS.PHYSICIAN_EDITED,
  SUMMARY_STATUS.REJECTED,
  SUMMARY_STATUS.REVISION_REQUESTED,
]);

/** In-memory tables. Reset on process restart — this is a demo store. */
let cases = new Map();
let summaries = new Map();
let versionsBySummary = new Map();
let auditBySummary = new Map();
let nextSummarySeq = 1;

function seed() {
  cases = new Map(getSeedCases().map((c) => [c.id, c]));
  summaries = new Map();
  versionsBySummary = new Map();
  auditBySummary = new Map();
  nextSummarySeq = 1;
}
seed();

/** Resets all in-memory state to the original demo seed. Used by tests and
 * available for a "reset demo data" affordance if ever needed. */
export function resetStore() {
  seed();
}

function recordAudit(summaryId, caseId, actor, action, details) {
  const entry = {
    id: `AUDIT-${summaryId}-${(auditBySummary.get(summaryId)?.length || 0) + 1}`,
    summaryId,
    caseId,
    actor: { id: actor?.id || "unknown", name: actor?.name || "Unknown", role: actor?.role || "unknown" },
    action,
    details: details || null,
    timestamp: new Date().toISOString(),
  };
  const existing = auditBySummary.get(summaryId) || [];
  existing.push(entry);
  auditBySummary.set(summaryId, existing);

  // Also write through to the shared, file-backed audit logger so Part 5
  // events are captured alongside the rest of MediCare Pro's audit trail.
  logAuditEvent({
    module: "physician-ai-workspace",
    action,
    actor: entry.actor,
    resource: { type: "clinical-summary", id: summaryId, caseId },
    details: details || null,
    timestamp: entry.timestamp,
  });

  return entry;
}

function pushVersion(summaryId, snapshot) {
  const existing = versionsBySummary.get(summaryId) || [];
  const version = existing.length + 1;
  existing.push({ version, ...snapshot });
  versionsBySummary.set(summaryId, existing);
  return version;
}

export function listCases() {
  return Array.from(cases.values());
}

export function getCase(caseId) {
  return cases.get(caseId) || null;
}

/**
 * Part 1 -> Part 5 bridge entry point. Upserts a case built from a real,
 * completed intake session (see intakeRecordAdapter.js) into the SAME
 * `cases` map the rest of this store already reads from — so
 * generateSummaryForCase/editSummary/approveSummary/etc. all work on a
 * bridged case with zero changes below this point. Idempotent: opening the
 * same intake session again just refreshes the same case id
 * (`INTAKE-<sessionId>`), it never creates a duplicate. Never touches or
 * removes the seeded demo cases (see demoData.js) — both remain addressable
 * by their own ids, distinguished by `source`.
 */
export function ingestIntakeCase(caseData) {
  cases.set(caseData.id, caseData);
  return caseData;
}

export function findSummaryByCase(caseId) {
  return (
    Array.from(summaries.values())
      .filter((s) => s.caseId === caseId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null
  );
}

export function getSummary(summaryId) {
  return summaries.get(summaryId) || null;
}

export function listVersions(summaryId) {
  return versionsBySummary.get(summaryId) || [];
}

export function listAudit(summaryId) {
  return auditBySummary.get(summaryId) || [];
}

/**
 * Generates a brand-new AI draft summary for a case (or throws if the case
 * does not exist). If a summary already exists for the case, this creates a
 * fresh summary record — callers wanting to regenerate an existing summary
 * should use `regenerateSummary` instead.
 */
export function generateSummaryForCase(caseId, actor) {
  const clinicalCase = getCase(caseId);
  if (!clinicalCase) {
    const err = new Error(`Case ${caseId} was not found`);
    err.code = "CASE_NOT_FOUND";
    throw err;
  }

  const ai = generateClinicalSummary(clinicalCase);
  const id = `SUM-${String(nextSummarySeq++).padStart(4, "0")}`;
  const timestamp = new Date().toISOString();

  const summary = {
    id,
    caseId,
    status: SUMMARY_STATUS.AI_GENERATED,
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

/**
 * Regenerates the AI draft for an existing summary (used by the
 * "revise"/"request revision" workflow). Only allowed from states where the
 * physician has not already given a final decision that should be preserved
 * without an explicit new request.
 */
export function regenerateSummary(summaryId, actor, revisionNote) {
  const summary = getSummary(summaryId);
  if (!summary) {
    const err = new Error(`Summary ${summaryId} was not found`);
    err.code = "SUMMARY_NOT_FOUND";
    throw err;
  }
  if (!REGENERATABLE_STATUSES.has(summary.status)) {
    const err = new Error(`Summary in status ${summary.status} cannot be regenerated`);
    err.code = "INVALID_TRANSITION";
    throw err;
  }

  const clinicalCase = getCase(summary.caseId);
  const ai = generateClinicalSummary(clinicalCase);
  const timestamp = new Date().toISOString();

  summary.status = SUMMARY_STATUS.AI_GENERATED;
  summary.sections = ai.sections;
  summary.flags = ai.flags;
  summary.aiMeta = { model: ai.model, disclaimer: ai.disclaimer, generatedAt: ai.generatedAt };
  summary.editedBy = null;
  summary.approvedBy = null;
  summary.rejectedBy = null;
  summary.revisionNote = revisionNote || null;
  summary.updatedAt = timestamp;
  summary.currentVersion += 1;

  pushVersion(summaryId, {
    changeType: "REGENERATED",
    status: summary.status,
    sections: summary.sections,
    actor,
    timestamp,
    note: revisionNote || null,
  });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_REGENERATED", { note: revisionNote || null });

  return summary;
}

/**
 * Applies a physician edit to a summary's content. Physician edits always
 * move the summary to PHYSICIAN_EDITED and are preserved as a new version so
 * the original AI draft is never silently lost.
 */
export function editSummary(summaryId, actor, newSections) {
  const summary = getSummary(summaryId);
  if (!summary) {
    const err = new Error(`Summary ${summaryId} was not found`);
    err.code = "SUMMARY_NOT_FOUND";
    throw err;
  }
  if (!EDITABLE_STATUSES.has(summary.status)) {
    const err = new Error(`Summary in status ${summary.status} cannot be edited`);
    err.code = "INVALID_TRANSITION";
    throw err;
  }

  const timestamp = new Date().toISOString();
  summary.sections = { ...summary.sections, ...newSections };
  summary.status = SUMMARY_STATUS.PHYSICIAN_EDITED;
  summary.editedBy = actor;
  summary.updatedAt = timestamp;
  summary.currentVersion += 1;

  pushVersion(summaryId, {
    changeType: "PHYSICIAN_EDITED",
    status: summary.status,
    sections: summary.sections,
    actor,
    timestamp,
  });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_EDITED", null);

  return summary;
}

export function approveSummary(summaryId, actor) {
  const summary = getSummary(summaryId);
  if (!summary) {
    const err = new Error(`Summary ${summaryId} was not found`);
    err.code = "SUMMARY_NOT_FOUND";
    throw err;
  }
  if (!DECIDABLE_STATUSES.has(summary.status)) {
    const err = new Error(`Summary in status ${summary.status} cannot be approved`);
    err.code = "INVALID_TRANSITION";
    throw err;
  }

  const timestamp = new Date().toISOString();
  summary.status = SUMMARY_STATUS.APPROVED;
  summary.approvedBy = actor;
  summary.updatedAt = timestamp;
  summary.currentVersion += 1;

  pushVersion(summaryId, { changeType: "APPROVED", status: summary.status, sections: summary.sections, actor, timestamp });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_APPROVED", null);

  return summary;
}

export function rejectSummary(summaryId, actor, reason) {
  const summary = getSummary(summaryId);
  if (!summary) {
    const err = new Error(`Summary ${summaryId} was not found`);
    err.code = "SUMMARY_NOT_FOUND";
    throw err;
  }
  if (!DECIDABLE_STATUSES.has(summary.status)) {
    const err = new Error(`Summary in status ${summary.status} cannot be rejected`);
    err.code = "INVALID_TRANSITION";
    throw err;
  }
  if (!reason || !String(reason).trim()) {
    const err = new Error("A rejection reason is required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const timestamp = new Date().toISOString();
  summary.status = SUMMARY_STATUS.REJECTED;
  summary.rejectedBy = actor;
  summary.revisionNote = reason;
  summary.updatedAt = timestamp;
  summary.currentVersion += 1;

  pushVersion(summaryId, {
    changeType: "REJECTED",
    status: summary.status,
    sections: summary.sections,
    actor,
    timestamp,
    note: reason,
  });
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_REJECTED", { reason });

  return summary;
}

export function markUnderReview(summaryId, actor) {
  const summary = getSummary(summaryId);
  if (!summary) {
    const err = new Error(`Summary ${summaryId} was not found`);
    err.code = "SUMMARY_NOT_FOUND";
    throw err;
  }
  recordAudit(summaryId, summary.caseId, actor, "SUMMARY_VIEWED", null);
  return summary;
}
