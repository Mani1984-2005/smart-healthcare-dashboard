// backend/services/physicianWorkspace/intakeRecordAdapter.js
//
// Part 1 -> Part 5 integration boundary.
// ---------------------------------------------------------------------------
// This is the ONLY file that knows both Part 1's ClinicalHistory shape and
// Part 5's ClinicalCase view model. It does not duplicate Part 1's data
// access: it calls Part 1's own `intakeService.exportSession`, already
// documented in that file as "Staff-authenticated read for Teams 4/5/6" —
// i.e. this seam was already built for exactly this purpose. No new
// database query, no new HTTP round-trip, no duplicated persistence code.
//
// Source of truth stays Part 1's ClinicalHistory. This module never invents
// a second clinical-history schema — it produces a read-only, additive VIEW
// over it, shaped so Part 5's existing store/controller/aiSummaryGenerator
// keep working completely unmodified (see generateClinicalSummary, which
// only reads the flat string/array fields this adapter fills in).
//
// Provenance/certainty are carried through unmodified (see
// `provenanceBySection` and `uncertainties` below) rather than flattened
// away, so a physician-facing UI can later distinguish PATIENT_TEXT /
// PATIENT_VOICE / CLINICIAN_ENTERED / AI_DERIVED / SYSTEM_STRUCTURED and
// CONFIRMED / UNCERTAIN / UNKNOWN / DENIED. This adapter performs no
// certainty upgrades: assembleClinicalHistory + assertSafeFact (Part 1)
// already reject AI_DERIVED+CONFIRMED before this file ever sees the data,
// and nothing here re-labels UNCERTAIN/UNKNOWN as CONFIRMED.

import * as intakeService from "../intakeService.js";
import { IntakeNotFoundError } from "../intakeService.js";
import pool from "../../db.js";

export class IntakeSessionNotFoundError extends Error {}
export class IntakeSessionNotCompleteError extends Error {}

/** Marks a case as sourced from a real Part 1 session vs. Part 5's own seed data (see demoData.js). */
export const CASE_SOURCE = Object.freeze({
  INTAKE_SESSION: "INTAKE_SESSION",
  DEMO: "DEMO",
});

function factValue(fact) {
  if (fact === null || fact === undefined) return undefined;
  return fact.value;
}

function factsToStringList(facts) {
  if (!Array.isArray(facts) || facts.length === 0) return undefined;
  return facts.map((f) => String(f.value));
}

/**
 * historyOfPresentIllness / personalSocialHistory are "keyed" sections in
 * Part 1's ClinicalHistory (an object of sub-field -> fact). Part 5's
 * ClinicalCase expects a single readable string for each. Flattening here
 * only changes presentation, never the underlying value, and any missing
 * sub-field is simply absent (never invented).
 */
function flattenKeyedSection(keyedFacts) {
  if (!keyedFacts || typeof keyedFacts !== "object") return undefined;
  const entries = Object.entries(keyedFacts);
  if (entries.length === 0) return undefined;
  return entries.map(([key, fact]) => `${key}: ${factValue(fact)}`).join("; ");
}

/**
 * Allergies is Part 1's special {status, items} shape. Turning "no items"
 * into "no known allergies" would misrepresent UNKNOWN as a confirmed
 * absence, so an empty result is only produced when the patient explicitly
 * DENIED allergies; otherwise an unconfirmed absence is left `undefined` so
 * Part 5's own fallback text reads "Not available" rather than a false
 * negative.
 */
function mapAllergies(allergies) {
  if (!allergies) return undefined;
  const items = factsToStringList((allergies.items || []).map((i) => ({ value: i.substance })));
  if (allergies.status === "DENIED") return items ?? [];
  if (items) return items;
  return undefined; // REPORTED-but-empty or UNKNOWN: do not claim confirmed absence.
}

/**
 * Best-effort patient identity lookup against the SAME `patients` table
 * Part 1 already validates `patientId` against (see intakeService.js
 * `defaultPatientRepo.exists`, and routes/patients.js for the exact column
 * names used below: name, age, gender). Never fabricated: any failure
 * (including "no live database in this environment", the same caveat
 * already documented for the rest of Part 1's Postgres access) yields
 * `null`, and the case is still built — the workspace shows the identifier
 * that IS known (patientId) without inventing a name.
 */
async function lookupPatientIdentity(patientId) {
  try {
    const { rows } = await pool.query("SELECT name, age, gender FROM patients WHERE id = $1", [patientId]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Transforms one completed Part 1 ClinicalHistory (+ its session envelope)
 * into Part 5's existing ClinicalCase shape. Additive-only: every field
 * aiSummaryGenerator.js already reads is filled from real data or left
 * absent (never invented); fields it doesn't read (provenanceBySection,
 * uncertainties, completion, intakeSessionId, encounterId, source) are
 * carried alongside for a future provenance-aware UI, without changing the
 * shape the existing generator/store code depends on.
 */
export function mapClinicalHistoryToCase({ session, history, patientIdentity }) {
  return {
    id: `INTAKE-${session.id}`,
    intakeSessionId: session.id,
    patientId: session.patientId,
    encounterId: session.encounterId ?? null,
    patientName: patientIdentity?.name ?? null,
    age: patientIdentity?.age ?? null,
    gender: patientIdentity?.gender ?? null,

    presentingComplaint: factValue(history.chiefComplaint) ?? undefined,
    historyOfPresentIllness: flattenKeyedSection(history.historyOfPresentIllness),
    pastMedicalHistory: factsToStringList(history.pastMedicalHistory),
    medications: factsToStringList(history.medications),
    allergies: mapAllergies(history.allergies),
    familyHistory: factsToStringList(history.familyHistory)?.join("; "),
    socialHistory: flattenKeyedSection(history.personalSocialHistory),
    // Part 1 does not capture vitals or lab results (patient self-report
    // intake only) — left absent rather than invented; aiSummaryGenerator
    // already renders absent vitals/labResults as "Not available".
    vitals: undefined,
    labResults: undefined,

    assignedRole: "DOCTOR",
    createdAt: session.startedAt,

    source: CASE_SOURCE.INTAKE_SESSION,
    completedAt: session.completedAt,
    completion: history.completion,
    uncertainties: history.uncertainties,
    provenanceBySection: {
      chiefComplaint: history.chiefComplaint ?? null,
      historyOfPresentIllness: history.historyOfPresentIllness,
      pastMedicalHistory: history.pastMedicalHistory,
      medications: history.medications,
      allergies: history.allergies,
      familyHistory: history.familyHistory,
      personalSocialHistory: history.personalSocialHistory,
      reviewOfSystems: history.reviewOfSystems,
      ayushHistory: history.ayushHistory,
      patientReportedFacts: history.patientReportedFacts,
    },
  };
}

/**
 * Loads a real Part 1 intake session + its ClinicalHistory and returns a
 * Part 5 ClinicalCase-shaped object. Only a COMPLETED session may be
 * bridged (Phase 2 requirement: incomplete interviews are never exposed as
 * completed clinical records) — an in-progress session throws
 * IntakeSessionNotCompleteError rather than returning partial data.
 */
export async function loadCaseFromIntakeSession(intakeSessionId, deps) {
  let exported;
  try {
    exported = await intakeService.exportSession(intakeSessionId, deps);
  } catch (err) {
    if (err instanceof IntakeNotFoundError) {
      throw new IntakeSessionNotFoundError(`Intake session ${intakeSessionId} was not found`);
    }
    throw err;
  }

  const { session, history } = exported;
  if (!session) {
    throw new IntakeSessionNotFoundError(`Intake session ${intakeSessionId} was not found`);
  }
  if (session.status !== "COMPLETED" || !history) {
    throw new IntakeSessionNotCompleteError(
      `Intake session ${intakeSessionId} is not yet completed (status: ${session.status}); it cannot be opened in the Physician Workspace.`
    );
  }

  const patientIdentity = await lookupPatientIdentity(session.patientId);
  return mapClinicalHistoryToCase({ session, history, patientIdentity });
}
