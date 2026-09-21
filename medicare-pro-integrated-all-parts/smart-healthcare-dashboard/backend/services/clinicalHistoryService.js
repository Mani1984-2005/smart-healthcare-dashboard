// backend/services/clinicalHistoryService.js
//
// Team 1 — Canonical ClinicalHistory assembly + provenance/certainty
// safety enforcement (Phase 2 Final Design, sections 3 & 4).
//
// HARD RULE enforced here, in code, not just by convention:
//   A fact with provenance.source === "AI_DERIVED" may NEVER be stored
//   with certainty === "CONFIRMED". Any attempt to do so is rejected.
//
// This module performs no I/O — it is a pure transformation from a flat
// answers map to the nested ClinicalHistory JSON contract, plus the
// validation guard above. Persistence lives in models/ClinicalHistory.js.

import { computeCompletion } from "./questionEngine.js";
import { AYUSH_QUESTIONS } from "./questionRegistry/index.js";

const VALID_SOURCES = [
  "PATIENT_TEXT",
  "PATIENT_VOICE",
  "OCR_DOCUMENT",
  "CLINICIAN_ENTERED",
  "SYSTEM_STRUCTURED",
  "AI_DERIVED",
];
const VALID_CERTAINTY = ["CONFIRMED", "UNCERTAIN", "UNKNOWN", "DENIED"];
const SOURCES_ALLOWED_TO_CONFIRM = ["PATIENT_TEXT", "PATIENT_VOICE", "CLINICIAN_ENTERED"];

export class ClinicalDataSafetyError extends Error {}

/**
 * Validates a single fact's provenance/certainty combination BEFORE it
 * is allowed anywhere near the ClinicalHistory document. Throws
 * ClinicalDataSafetyError on violation — callers must not swallow this.
 */
export function assertSafeFact({ source, certainty }) {
  if (!VALID_SOURCES.includes(source)) {
    throw new ClinicalDataSafetyError(`Unknown provenance source: ${source}`);
  }
  if (!VALID_CERTAINTY.includes(certainty)) {
    throw new ClinicalDataSafetyError(`Unknown certainty value: ${certainty}`);
  }
  if (certainty === "CONFIRMED" && !SOURCES_ALLOWED_TO_CONFIRM.includes(source)) {
    throw new ClinicalDataSafetyError(
      `Source "${source}" may never be stored with certainty CONFIRMED. ` +
        `AI_DERIVED and other non-patient/clinician sources must be UNCERTAIN, UNKNOWN, or DENIED.`
    );
  }
  return true;
}

function fact(answer) {
  assertSafeFact({ source: answer.source, certainty: answer.certainty });
  return {
    value: answer.rawValue,
    certainty: answer.certainty,
    provenance: {
      source: answer.source,
      sourceMessageId: answer.sourceMessageId ?? null,
      sourceDocumentId: answer.sourceDocumentId ?? null,
      capturedAt: answer.capturedAt,
      ...(answer.confidence !== undefined ? { confidence: answer.confidence } : {}),
    },
  };
}

// Section -> assembly strategy. "single": one fact object.
// "array": list of fact objects. "allergies": special {status, items} shape.
const SECTION_SHAPE = {
  chiefComplaint: "single",
  historyOfPresentIllness: "keyed", // keyed by a friendly sub-field derived from questionId
  pastMedicalHistory: "array",
  pastSurgicalHistory: "array",
  medications: "array",
  familyHistory: "array",
  personalSocialHistory: "keyed",
  reviewOfSystems: "array",
};

function hpiSubKey(questionId) {
  // e.g. "hpi.chestpain.onset" -> "onset", "hpi.generic.associated" -> "associated"
  const parts = questionId.split(".");
  return parts[parts.length - 1];
}

/**
 * Builds the full canonical ClinicalHistory JSON from the flat set of
 * stored answers for a session (Phase 2 Final Design, section 3).
 * @param {Array<{questionId:string, section:string, rawValue:any, certainty:string, source:string, sourceMessageId?:string, capturedAt:string}>} answers
 * @param {"STANDARD"|"AYUSH"} intakeMode
 */
export function assembleClinicalHistory(answers, intakeMode = "STANDARD") {
  const history = {
    chiefComplaint: null,
    historyOfPresentIllness: {},
    pastMedicalHistory: [],
    pastSurgicalHistory: [],
    medications: [],
    allergies: { status: "UNKNOWN", items: [] },
    familyHistory: [],
    personalSocialHistory: {},
    reviewOfSystems: [],
    ayushHistory: { fields: [] },
    patientReportedFacts: [],
    uncertainties: [],
    provenance: { compiledAt: new Date().toISOString() },
    completion: { status: "INCOMPLETE", missingRequiredFields: [], percentComplete: 0 },
  };

  const answersByQuestionId = {};
  for (const answer of answers) {
    answersByQuestionId[answer.questionId] = answer;

    if (answer.questionId === "allergies.status") {
      const raw = String(answer.rawValue).toLowerCase();
      history.allergies.status =
        answer.certainty === "DENIED" || raw === "no" ? "DENIED" : answer.certainty === "UNKNOWN" ? "UNKNOWN" : "REPORTED";
      continue;
    }
    if (answer.questionId === "allergies.details") {
      history.allergies.items.push({ substance: answer.rawValue, ...fact(answer) });
      continue;
    }

    const ayushQ = AYUSH_QUESTIONS.find((q) => q.questionId === answer.questionId);
    if (ayushQ) {
      history.ayushHistory.fields.push({ key: ayushQ.key, label: ayushQ.label, ...fact(answer) });
      continue;
    }

    const shape = SECTION_SHAPE[answer.section];
    if (shape === "single") {
      history[answer.section] = fact(answer);
    } else if (shape === "array") {
      history[answer.section].push(fact(answer));
    } else if (shape === "keyed") {
      const key = answer.section === "historyOfPresentIllness" ? hpiSubKey(answer.questionId) : answer.questionId;
      history[answer.section][key] = fact(answer);
    } else {
      // Unrecognized section: preserve as a patient-reported fact rather
      // than silently dropping it.
      history.patientReportedFacts.push({ questionId: answer.questionId, ...fact(answer) });
    }

    if (answer.certainty === "UNCERTAIN") {
      history.uncertainties.push({ field: `${answer.section}.${answer.questionId}`, reason: "Patient expressed uncertainty." });
    }
  }

  history.completion = computeCompletion(answersByQuestionId, intakeMode);
  return history;
}
