// backend/services/questionEngine.js
//
// Team 1 — Deterministic Adaptive Question Engine.
//
// Hard boundaries (Phase 2 Final Design, sections 5 & 11):
//   - This module NEVER diagnoses. classifySymptom() only selects which
//     QUESTION SET to ask next — it never produces or stores a diagnosis.
//   - This module has NO red-flag / clinical-risk logic. It does not
//     decide anything is urgent. That belongs entirely to Team 4.
//   - This module has NO dependency on any AI provider. It must return
//     correct results with aiAdapter absent, failing, or never called.
//   - This module performs NO I/O (no DB, no network, no fs). It is a
//     pure function library over plain data, which is what makes it
//     unit-testable without any live infrastructure.

import {
  CHIEF_COMPLAINT_QUESTION,
  BASE_QUESTIONS,
  SYMPTOM_SETS,
  GENERIC_HPI_SET,
  AYUSH_QUESTIONS,
} from "./questionRegistry/index.js";

const CHIEF_COMPLAINT_ID = CHIEF_COMPLAINT_QUESTION.questionId;

/**
 * Deterministic keyword classification. Selects a QUESTION SET only —
 * never a diagnosis. Case-insensitive substring match against each
 * symptom set's matchKeywords list, first match wins; no match -> GENERIC.
 * @param {string} chiefComplaintText
 * @returns {{category: string, questions: object[]}}
 */
export function classifySymptom(chiefComplaintText) {
  const text = String(chiefComplaintText || "").toLowerCase();
  for (const set of SYMPTOM_SETS) {
    if (set.matchKeywords.some((kw) => text.includes(kw))) {
      return { category: set.category, questions: set.questions };
    }
  }
  return { category: GENERIC_HPI_SET.category, questions: GENERIC_HPI_SET.questions };
}

/**
 * Builds the full ordered list of questions that MAY apply to this
 * session, given the current answers (needed only to know the chief
 * complaint, which determines the symptom-specific set) and intake mode.
 * @param {Record<string, {rawValue: any, certainty?: string}>} answers
 * @param {"STANDARD"|"AYUSH"} intakeMode
 */
export function buildActiveQuestionSet(answers, intakeMode = "STANDARD") {
  const chiefComplaintAnswer = answers[CHIEF_COMPLAINT_ID];
  const symptomQuestions = chiefComplaintAnswer
    ? classifySymptom(chiefComplaintAnswer.rawValue).questions
    : [];
  const ayushQuestions = intakeMode === "AYUSH" ? AYUSH_QUESTIONS : [];
  return [...symptomQuestions, ...BASE_QUESTIONS, ...ayushQuestions];
}

/**
 * Evaluates a question's dependsOn conditions against current answers.
 * A question with no dependsOn is always eligible.
 */
function dependenciesSatisfied(question, answers) {
  if (!question.dependsOn || question.dependsOn.length === 0) return true;
  return question.dependsOn.every((dep) => {
    const dependency = answers[dep.questionId];
    if (!dependency) return false;
    const raw = dependency.rawValue;
    return dep.valueMatches.some((expected) => {
      if (expected instanceof RegExp) return expected.test(String(raw));
      if (typeof expected === "boolean") return raw === expected || String(raw).toLowerCase() === String(expected);
      return String(raw).toLowerCase() === String(expected).toLowerCase();
    });
  });
}

/**
 * Returns the next question to ask, or null if the interview is
 * complete (all eligible questions have been answered).
 * @param {Record<string, {rawValue: any, certainty?: string}>} answers
 * @param {"STANDARD"|"AYUSH"} intakeMode
 * @returns {object|null}
 */
export function getNextQuestion(answers, intakeMode = "STANDARD") {
  if (!answers[CHIEF_COMPLAINT_ID]) {
    return CHIEF_COMPLAINT_QUESTION;
  }

  const activeSet = buildActiveQuestionSet(answers, intakeMode);
  const eligible = activeSet.filter(
    (q) => !answers[q.questionId] && dependenciesSatisfied(q, answers)
  );

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.priority - b.priority;
  });

  return eligible[0];
}

/**
 * Computes completion status. An answer counts as "answered" regardless
 * of certainty — UNKNOWN/DENIED both count, per the approved design
 * ("required questions left UNKNOWN are surfaced as missing, not
 * blocked outright").
 */
export function computeCompletion(answers, intakeMode = "STANDARD") {
  const activeSet = [CHIEF_COMPLAINT_QUESTION, ...buildActiveQuestionSet(answers, intakeMode)];
  const requiredEligible = activeSet.filter(
    (q) => q.required && dependenciesSatisfied(q, answers)
  );
  const missingRequiredFields = requiredEligible
    .filter((q) => !answers[q.questionId])
    .map((q) => q.questionId);

  const totalEligible = activeSet.filter((q) => dependenciesSatisfied(q, answers));
  const answeredCount = totalEligible.filter((q) => answers[q.questionId]).length;
  const percentComplete = totalEligible.length === 0 ? 0 : answeredCount / totalEligible.length;

  return {
    status: missingRequiredFields.length === 0 && getNextQuestion(answers, intakeMode) === null
      ? "COMPLETE"
      : "INCOMPLETE",
    missingRequiredFields,
    percentComplete: Math.round(percentComplete * 100) / 100,
  };
}

/**
 * Maps a raw patient response to a certainty tag. This is the one place
 * "I don't know" / "no" / "I think" phrasing gets normalized — kept
 * separate from provenance rules (clinicalHistoryService.js), which
 * enforce what certainty a given SOURCE is allowed to claim.
 */
export function inferCertaintyFromText(rawText) {
  const text = String(rawText || "").trim().toLowerCase();
  if (!text) return "UNKNOWN";
  if (/\b(don'?t know|not sure|no idea|unsure)\b/.test(text)) return "UNKNOWN";
  if (/\b(no|none|never|not that i know)\b/.test(text)) return "DENIED";
  if (/\b(i think|maybe|possibly|might have|i believe)\b/.test(text)) return "UNCERTAIN";
  return "CONFIRMED";
}

/**
 * Looks up a question definition by ID across the full registry
 * (chief complaint + all symptom sets + base questions + AYUSH),
 * regardless of whether it's currently "active" for a given session.
 * Used by intakeService to validate incoming answers.
 */
export function findQuestionById(questionId) {
  if (questionId === CHIEF_COMPLAINT_ID) return CHIEF_COMPLAINT_QUESTION;
  const all = [
    ...BASE_QUESTIONS,
    ...SYMPTOM_SETS.flatMap((s) => s.questions),
    ...GENERIC_HPI_SET.questions,
    ...AYUSH_QUESTIONS,
  ];
  return all.find((q) => q.questionId === questionId) ?? null;
}

export const CHIEF_COMPLAINT_QUESTION_ID = CHIEF_COMPLAINT_ID;
