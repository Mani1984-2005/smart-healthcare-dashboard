// backend/services/questionRegistry/baseQuestions.js
//
// Team 1 — AI Clinical Intake Engine
// Static, code-defined question registry. NOT stored in the database
// (see Phase 2 design section B — question registry stays code-defined).
//
// Each question is a plain data object. The engine (questionEngine.js)
// is the only place that interprets this data; nothing here makes any
// clinical decision — it only describes what can be asked and when.

/** @typedef {"TEXT"|"LONG_TEXT"|"YES_NO"|"SINGLE_SELECT"|"MULTI_SELECT"|"NUMBER"|"SCALE"|"DATE"|"DURATION"} AnswerType */

/**
 * @typedef {Object} Question
 * @property {string} questionId
 * @property {string} section
 * @property {string} questionText
 * @property {AnswerType} answerType
 * @property {string[]} [options]
 * @property {boolean} required
 * @property {string} clinicalPurpose
 * @property {{questionId: string, valueMatches: (string|RegExp)[]}[]} [dependsOn]
 * @property {number} priority
 */

/** Chief complaint — always the very first question of every session. */
export const CHIEF_COMPLAINT_QUESTION = {
  questionId: "chiefComplaint.text",
  section: "chiefComplaint",
  questionText: "What brings you to the hospital today?",
  answerType: "LONG_TEXT",
  required: true,
  clinicalPurpose: "Establish the chief complaint that drives adaptive question-set selection.",
  priority: 0,
};

/** Always-required base sections, asked after the symptom-specific set. */
export const BASE_QUESTIONS = [
  {
    questionId: "pmh.conditions",
    section: "pastMedicalHistory",
    questionText: "Do you have any ongoing or past medical conditions?",
    answerType: "LONG_TEXT",
    required: true,
    clinicalPurpose: "Capture past medical history.",
    priority: 100,
  },
  {
    questionId: "psh.procedures",
    section: "pastSurgicalHistory",
    questionText: "Have you had any surgeries in the past?",
    answerType: "LONG_TEXT",
    required: false,
    clinicalPurpose: "Capture past surgical history.",
    priority: 110,
  },
  {
    questionId: "medications.current",
    section: "medications",
    questionText: "Are you currently taking any medications?",
    answerType: "LONG_TEXT",
    required: true,
    clinicalPurpose: "Capture current medications.",
    priority: 120,
  },
  {
    questionId: "allergies.status",
    section: "allergies",
    questionText: "Do you have any known drug or food allergies?",
    answerType: "YES_NO",
    required: true,
    clinicalPurpose: "Establish allergy status (denied/unknown/reported).",
    priority: 130,
  },
  {
    questionId: "allergies.details",
    section: "allergies",
    questionText: "Please list the allergy and what reaction it causes.",
    answerType: "LONG_TEXT",
    required: false,
    clinicalPurpose: "Capture allergy detail when the patient reports having one.",
    dependsOn: [{ questionId: "allergies.status", valueMatches: ["yes", "YES", true] }],
    priority: 131,
  },
  {
    questionId: "familyHistory.conditions",
    section: "familyHistory",
    questionText: "Does any illness run in your immediate family?",
    answerType: "LONG_TEXT",
    required: false,
    clinicalPurpose: "Capture family history.",
    priority: 140,
  },
  {
    questionId: "personalSocial.smoking",
    section: "personalSocialHistory",
    questionText: "Do you smoke or use tobacco?",
    answerType: "YES_NO",
    required: false,
    clinicalPurpose: "Capture personal/social history — tobacco use.",
    priority: 150,
  },
  {
    questionId: "personalSocial.alcohol",
    section: "personalSocialHistory",
    questionText: "Do you drink alcohol?",
    answerType: "YES_NO",
    required: false,
    clinicalPurpose: "Capture personal/social history — alcohol use.",
    priority: 151,
  },
  {
    questionId: "ros.general",
    section: "reviewOfSystems",
    questionText: "Have you noticed any other symptoms recently — fever, weight change, fatigue?",
    answerType: "LONG_TEXT",
    required: false,
    clinicalPurpose: "General review of systems capture.",
    priority: 160,
  },
];
