// backend/controllers/physicianWorkspaceController.js
//
// Part 5 — Physician AI Workspace controller.
// Translates HTTP requests into store operations, maps domain errors to
// meaningful HTTP status codes, and never leaks internal error detail.

import * as store from "../services/physicianWorkspace/store.js";
import {
  loadCaseFromIntakeSession,
  IntakeSessionNotFoundError,
  IntakeSessionNotCompleteError,
} from "../services/physicianWorkspace/intakeRecordAdapter.js";
import { listDocumentsForPatient } from "../services/physicianWorkspace/part3DocumentsAdapter.js";
import { listClinicalIntelligenceForPatient } from "../services/physicianWorkspace/clinicalIntelligenceAdapter.js";
import { logError } from "../utils/logger.js";
import {
  validateCaseId,
  validateSummaryId,
  validateEditPayload,
  validateRejectPayload,
  validateRevisePayload,
} from "../validations/physicianWorkspace.validation.js";

function handleDomainError(res, err) {
  if (err.code === "CASE_NOT_FOUND" || err.code === "SUMMARY_NOT_FOUND") {
    return res.status(404).json({ success: false, message: err.message });
  }
  if (err.code === "INVALID_TRANSITION") {
    return res.status(409).json({ success: false, message: err.message });
  }
  if (err.code === "VALIDATION_ERROR") {
    return res.status(400).json({ success: false, message: err.message });
  }
  logError("physician-workspace: unhandled error", { message: err.message, stack: err.stack });
  return res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
}

export function listCases(req, res) {
  const cases = store.listCases().map((c) => ({
    id: c.id,
    patientId: c.patientId,
    patientName: c.patientName,
    age: c.age,
    gender: c.gender,
    presentingComplaint: c.presentingComplaint,
    source: c.source || "DEMO",
  }));
  res.json({ success: true, data: cases });
}

export function getCase(req, res) {
  const validationError = validateCaseId(req.params.caseId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const clinicalCase = store.getCase(req.params.caseId);
  if (!clinicalCase) {
    return res.status(404).json({ success: false, message: `Case ${req.params.caseId} was not found.` });
  }
  const latestSummary = store.findSummaryByCase(clinicalCase.id);
  res.json({
    success: true,
    data: clinicalCase,
    latestSummaryId: latestSummary?.id || null,
    dataLabel: clinicalCase.source === "INTAKE_SESSION" ? "REAL_INTAKE_DATA" : "DEMO_DATA",
  });
}

/**
 * Part 1 -> Part 5 bridge entry point (Step 6 of the integration brief).
 * Opens/refreshes a real, completed Part 1 intake session as a Physician
 * Workspace case and returns it in the same shape `getCase` uses, so the
 * existing frontend case-detail view needs no special-casing.
 */
export async function openFromIntakeSession(req, res) {
  const { intakeSessionId } = req.params;
  if (!intakeSessionId || typeof intakeSessionId !== "string") {
    return res.status(400).json({ success: false, message: "A valid intakeSessionId is required." });
  }
  try {
    const clinicalCase = await loadCaseFromIntakeSession(intakeSessionId);
    store.ingestIntakeCase(clinicalCase);
    const latestSummary = store.findSummaryByCase(clinicalCase.id);
    return res.json({
      success: true,
      data: clinicalCase,
      latestSummaryId: latestSummary?.id || null,
      dataLabel: "REAL_INTAKE_DATA",
    });
  } catch (err) {
    if (err instanceof IntakeSessionNotFoundError) {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err instanceof IntakeSessionNotCompleteError) {
      return res.status(409).json({ success: false, message: err.message });
    }
    logError("physician-workspace: intake bridge error", { message: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: "Could not load the intake session." });
  }
}

/**
 * Part 3 -> Part 5 bridge. The physician-facing document list for the case's
 * patient — joined on patientId, since Part 3 has no encounterId (see
 * part3DocumentsAdapter.js). Read-only: never writes to Part 3's store.
 */
export function getCaseDocuments(req, res) {
  const validationError = validateCaseId(req.params.caseId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  const clinicalCase = store.getCase(req.params.caseId);
  if (!clinicalCase) {
    return res.status(404).json({ success: false, message: `Case ${req.params.caseId} was not found.` });
  }
  return res.json({ success: true, data: listDocumentsForPatient(clinicalCase.patientId) });
}

/**
 * Part 4 -> Part 5 bridge. Clinical-intelligence analyses generated for the
 * case's patient, most recent first, each finding still carrying its own
 * origin ("rules"|"ai") and reviewRequired flag exactly as Part 4 produced
 * it. Read-only: never writes to Part 4's store, never triggers a new
 * analysis.
 */
export function getCaseClinicalIntelligence(req, res) {
  const validationError = validateCaseId(req.params.caseId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  const clinicalCase = store.getCase(req.params.caseId);
  if (!clinicalCase) {
    return res.status(404).json({ success: false, message: `Case ${req.params.caseId} was not found.` });
  }
  return res.json({ success: true, data: listClinicalIntelligenceForPatient(clinicalCase.patientId) });
}

export function generateSummary(req, res) {
  const { caseId } = req.body || {};
  const validationError = validateCaseId(caseId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  try {
    const summary = store.generateSummaryForCase(caseId, req.user);
    res.status(201).json({ success: true, data: summary });
  } catch (err) {
    handleDomainError(res, err);
  }
}

export function getSummary(req, res) {
  const validationError = validateSummaryId(req.params.summaryId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const summary = store.getSummary(req.params.summaryId);
  if (!summary) {
    return res.status(404).json({ success: false, message: `Summary ${req.params.summaryId} was not found.` });
  }
  store.markUnderReview(summary.id, req.user);
  res.json({ success: true, data: summary });
}

export function editSummary(req, res) {
  const validationError = validateSummaryId(req.params.summaryId) || validateEditPayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  try {
    const summary = store.editSummary(req.params.summaryId, req.user, req.body.sections);
    res.json({ success: true, data: summary });
  } catch (err) {
    handleDomainError(res, err);
  }
}

export function approveSummary(req, res) {
  const validationError = validateSummaryId(req.params.summaryId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  try {
    const summary = store.approveSummary(req.params.summaryId, req.user);
    res.json({ success: true, data: summary });
  } catch (err) {
    handleDomainError(res, err);
  }
}

export function rejectSummary(req, res) {
  const validationError = validateSummaryId(req.params.summaryId) || validateRejectPayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  try {
    const summary = store.rejectSummary(req.params.summaryId, req.user, req.body.reason);
    res.json({ success: true, data: summary });
  } catch (err) {
    handleDomainError(res, err);
  }
}

export function reviseSummary(req, res) {
  const validationError = validateSummaryId(req.params.summaryId) || validateRevisePayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  try {
    const summary = store.regenerateSummary(req.params.summaryId, req.user, req.body?.note);
    res.json({ success: true, data: summary });
  } catch (err) {
    handleDomainError(res, err);
  }
}

export function listVersions(req, res) {
  const validationError = validateSummaryId(req.params.summaryId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const summary = store.getSummary(req.params.summaryId);
  if (!summary) {
    return res.status(404).json({ success: false, message: `Summary ${req.params.summaryId} was not found.` });
  }
  res.json({ success: true, data: store.listVersions(req.params.summaryId) });
}

export function listAudit(req, res) {
  const validationError = validateSummaryId(req.params.summaryId);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const summary = store.getSummary(req.params.summaryId);
  if (!summary) {
    return res.status(404).json({ success: false, message: `Summary ${req.params.summaryId} was not found.` });
  }
  res.json({ success: true, data: store.listAudit(req.params.summaryId) });
}
