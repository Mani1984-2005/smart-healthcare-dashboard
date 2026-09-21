// backend/services/physicianWorkspace/demoData.js
//
// Part 5 — Physician AI Workspace
// ---------------------------------------------------------------------------
// Self-contained DEMO clinical case data used so this module can be run,
// tested and demonstrated without any other SIH part, without a database,
// and without any other MediCare Pro module having created data first.
//
// IMPORTANT: Every record below is synthetic demo data. None of it
// represents a real patient. It exists purely so the Physician AI
// Workspace has structured clinical information to summarise.
// ---------------------------------------------------------------------------

export const DATA_LABEL = "DEMO_DATA";

/**
 * @typedef {Object} ClinicalCase
 * @property {string} id
 * @property {string} patientId
 * @property {string} patientName
 * @property {number} age
 * @property {string} gender
 * @property {string} presentingComplaint
 * @property {string} historyOfPresentIllness
 * @property {string[]} pastMedicalHistory
 * @property {string[]} medications
 * @property {string[]} allergies
 * @property {string} [familyHistory]
 * @property {string} [socialHistory]
 * @property {{ label: string, value: string }[]} [vitals]
 * @property {{ test: string, value: string, flag: string }[]} [labResults]
 * @property {string} assignedRole   // role permitted to work this case (demo scoping only)
 * @property {string} createdAt
 */

const now = () => new Date().toISOString();

/** @type {ClinicalCase[]} */
export const demoCases = [
  {
    id: "CASE-2001",
    patientId: "P-1001",
    patientName: "Amrita Singh",
    age: 34,
    gender: "Female",
    presentingComplaint: "Intermittent chest tightness and mild breathlessness for 3 days",
    historyOfPresentIllness:
      "Reports episodic retrosternal chest tightness, lasting 5-10 minutes, occasionally radiating to the left shoulder. Denies syncope. Mild breathlessness on exertion. No fever.",
    pastMedicalHistory: ["Hypertension (diagnosed 2022)", "Seasonal allergic rhinitis"],
    medications: ["Amlodipine 5mg once daily"],
    allergies: ["Penicillin (rash)"],
    familyHistory: "Father: coronary artery disease diagnosed at age 58.",
    socialHistory: "Non-smoker. Occasional alcohol use. Works a sedentary office job.",
    vitals: [
      { label: "Blood pressure", value: "138/86 mmHg" },
      { label: "Heart rate", value: "88 bpm" },
      { label: "Temperature", value: "98.4°F" },
      { label: "SpO2", value: "97%" },
    ],
    labResults: [
      { test: "Troponin I", value: "0.02 ng/mL", flag: "Normal" },
      { test: "ECG", value: "Sinus rhythm, no acute ST changes", flag: "Normal" },
    ],
    assignedRole: "DOCTOR",
    createdAt: now(),
  },
  {
    id: "CASE-2002",
    patientId: "P-1002",
    patientName: "Rahul Mehra",
    age: 47,
    gender: "Male",
    presentingComplaint: "Fatigue, increased thirst and blurred vision for 2 weeks",
    historyOfPresentIllness:
      "Progressive fatigue and polyuria over two weeks. Reports blurred vision, worse by evening. No known trauma. No chest pain or breathlessness.",
    pastMedicalHistory: ["Type 2 diabetes mellitus (2019)", "Dyslipidaemia"],
    medications: ["Metformin 500mg twice daily", "Atorvastatin 10mg at night"],
    allergies: [],
    familyHistory: "Mother: type 2 diabetes. Sister: hypothyroidism.",
    socialHistory: "Former smoker (quit 2020). Sedentary lifestyle, irregular meal timing.",
    vitals: [
      { label: "Blood pressure", value: "128/82 mmHg" },
      { label: "Heart rate", value: "76 bpm" },
    ],
    // Intentionally sparse — demonstrates graceful "Not available" handling.
    labResults: [],
    assignedRole: "DOCTOR",
    createdAt: now(),
  },
  {
    id: "CASE-2003",
    patientId: "P-1004",
    patientName: "Sanjay Kapoor",
    age: 62,
    gender: "Male",
    presentingComplaint: "Sudden onset severe chest pain radiating to the left arm",
    historyOfPresentIllness:
      "Sudden-onset crushing central chest pain approximately 40 minutes ago, radiating to the left arm and jaw, associated with sweating and breathlessness. Known coronary artery disease with prior bypass surgery.",
    pastMedicalHistory: ["Coronary artery disease", "Prior coronary artery bypass graft (2021)", "Hyperlipidaemia"],
    medications: ["Aspirin 75mg once daily", "Atorvastatin 40mg at night", "Metoprolol 25mg twice daily"],
    allergies: ["Sulfa drugs (hives)"],
    familyHistory: "Not documented.",
    socialHistory: "Not documented.",
    vitals: [
      { label: "Blood pressure", value: "96/60 mmHg" },
      { label: "Heart rate", value: "112 bpm" },
      { label: "SpO2", value: "93%" },
    ],
    labResults: [{ test: "Troponin I", value: "1.8 ng/mL", flag: "Critical" }],
    assignedRole: "DOCTOR",
    createdAt: now(),
  },
];

/**
 * Returns a deep copy of the demo case list so callers can never mutate the
 * seed data by reference.
 */
export function getSeedCases() {
  return demoCases.map((c) => ({
    ...c,
    source: "DEMO", // distinguishes seeded demo cases from real bridged intake sessions (see intakeRecordAdapter.js)
    pastMedicalHistory: [...c.pastMedicalHistory],
    medications: [...c.medications],
    allergies: [...c.allergies],
    vitals: c.vitals ? c.vitals.map((v) => ({ ...v })) : [],
    labResults: c.labResults ? c.labResults.map((l) => ({ ...l })) : [],
  }));
}
