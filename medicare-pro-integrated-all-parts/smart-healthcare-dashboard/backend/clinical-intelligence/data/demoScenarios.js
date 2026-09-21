// Part 4 — SYNTHETIC demonstration patients. Every person, value and date below is fictional.
// No real patient data is used anywhere in this module. Reference ranges are supplied per result
// (as a lab would report them) because the engine never invents ranges.

const NORMAL_VITALS = { temperature: { value: 36.8, unit: "°C" }, heartRate: { value: 76, unit: "bpm" }, systolicBp: { value: 118, unit: "mmHg" }, diastolicBp: { value: 76, unit: "mmHg" }, respiratoryRate: { value: 14, unit: "breaths/min" }, spo2: { value: 98, unit: "%" } };
const range = (low, high) => ({ low, high, source: "lab_reported" });

export const DEMO_NOTICE = "Synthetic demonstration data. Not a real patient.";

export const DEMO_SCENARIOS = [
  {
    id: "CI-DEMO-001",
    label: "Asha Verma (Demo)",
    scenario: "Normal / low-risk case",
    description: "Mild self-limiting illness with normal vitals and results. Shows that the system stays quiet when there is nothing to flag.",
    context: {
      schemaVersion: "1",
      patient: { id: "CI-DEMO-001", displayName: "Asha Verma (Demo)", ageYears: 28, sex: "female" },
      encounters: [{
        id: "E1", date: "2026-09-15", type: "Outpatient visit", chiefComplaint: "Mild cold symptoms for three days",
        symptoms: [
          { name: "Cough", present: true, severity: "mild", duration: "3 days" },
          { name: "Runny nose", present: true, severity: "mild", duration: "3 days" },
          { name: "Fever", present: false },
          { name: "Shortness of breath", present: false },
        ],
        vitals: NORMAL_VITALS,
        examination: [
          { system: "Throat", finding: "Mild pharyngeal erythema, no exudate", abnormal: true },
          { system: "Chest", finding: "Clear on auscultation", abnormal: false },
        ],
        notes: "Advised rest and fluids. Return if symptoms worsen.",
        followUp: { instruction: "Review if symptoms persist beyond 7 days" },
      }],
      allergies: { status: "none_known", items: [] },
      medications: { status: "documented", items: [{ name: "Paracetamol", dose: "500 mg", frequency: "as needed", route: "oral", startDate: "2026-09-15", status: "active" }] },
      history: { status: "none_known", items: [] },
      investigations: [
        { name: "Hemoglobin", value: 13.2, unit: "g/dL", referenceRange: range(12.0, 15.5), collectedAt: "2026-09-15", status: "final" },
        { name: "WBC", value: 6.8, unit: "x10^3/µL", referenceRange: range(4.0, 11.0), collectedAt: "2026-09-15", status: "final" },
      ],
    },
  },
  {
    id: "CI-DEMO-002",
    label: "Rohan Iyer (Demo)",
    scenario: "Abnormal investigations",
    description: "Diabetic patient on metformin with rising creatinine, falling eGFR and raised HbA1c. Shows range comparison, trends and a renal/medication check.",
    context: {
      schemaVersion: "1",
      patient: { id: "CI-DEMO-002", displayName: "Rohan Iyer (Demo)", ageYears: 52, sex: "male" },
      encounters: [
        { id: "E1", date: "2026-05-20", type: "Diabetes follow-up", chiefComplaint: "Routine diabetes review",
          symptoms: [{ name: "Fatigue", present: true, severity: "mild" }],
          vitals: { ...NORMAL_VITALS, systolicBp: { value: 138, unit: "mmHg" }, diastolicBp: { value: 86, unit: "mmHg" } },
          examination: [] },
        { id: "E2", date: "2026-09-10", type: "Outpatient visit", chiefComplaint: "Increased thirst, frequent urination and tiredness for two weeks",
          symptoms: [
            { name: "Excessive thirst", present: true, duration: "2 weeks" },
            { name: "Frequent urination", present: true, duration: "2 weeks" },
            { name: "Polyuria", present: true, duration: "2 weeks" },
            { name: "Tiredness", present: true, duration: "2 weeks" },
            { name: "Blurred vision", present: false },
          ],
          vitals: { temperature: { value: 36.9, unit: "°C" }, heartRate: { value: 84, unit: "bpm" }, systolicBp: { value: 142, unit: "mmHg" }, diastolicBp: { value: 88, unit: "mmHg" }, respiratoryRate: { value: 16, unit: "breaths/min" }, spo2: { value: 97, unit: "%" } },
          examination: [{ system: "Abdomen", finding: "Soft, non-tender", abnormal: false }],
          followUp: { instruction: "Repeat renal function and review medications within one week" } },
      ],
      allergies: { status: "none_known", items: [] },
      medications: { status: "documented", items: [
        { name: "Metformin", dose: "500 mg", frequency: "twice daily", route: "oral", startDate: "2019-03-01", status: "active" },
        { name: "Amlodipine", dose: "5 mg", frequency: "once daily", route: "oral", startDate: "2021-06-10", status: "active" },
      ] },
      history: { status: "documented", items: [
        { kind: "condition", text: "Type 2 diabetes mellitus", since: "2016" },
        { kind: "condition", text: "Hypertension", since: "2019" },
      ] },
      investigations: [
        { name: "HbA1c", value: 8.1, unit: "%", referenceRange: range(4.0, 5.6), collectedAt: "2026-05-20", status: "final" },
        { name: "HbA1c", value: 8.9, unit: "%", referenceRange: range(4.0, 5.6), collectedAt: "2026-09-10", status: "final" },
        { name: "Fasting glucose", value: 182, unit: "mg/dL", referenceRange: range(70, 99), collectedAt: "2026-09-10", status: "final" },
        { name: "Creatinine", value: 1.3, unit: "mg/dL", referenceRange: range(0.7, 1.3), collectedAt: "2026-05-20", status: "final" },
        { name: "Creatinine", value: 1.9, unit: "mg/dL", referenceRange: range(0.7, 1.3), collectedAt: "2026-09-10", status: "final" },
        { name: "eGFR", value: 48, unit: "mL/min/1.73 m²", referenceRange: { low: 60, source: "lab_reported" }, collectedAt: "2026-05-20", status: "final" },
        { name: "eGFR", value: 26, unit: "mL/min/1.73 m²", referenceRange: { low: 60, source: "lab_reported" }, collectedAt: "2026-09-10", status: "final" },
        { name: "Potassium", value: 5.4, unit: "mmol/L", referenceRange: range(3.5, 5.1), collectedAt: "2026-09-10", status: "final" },
      ],
    },
  },
  {
    id: "CI-DEMO-003",
    label: "Meera Nair (Demo)",
    scenario: "Medication / allergy conflict",
    description: "Documented penicillin allergy with amoxicillin prescribed, warfarin plus two NSAIDs, and an incomplete paracetamol entry. Shows the safety checks.",
    context: {
      schemaVersion: "1",
      patient: { id: "CI-DEMO-003", displayName: "Meera Nair (Demo)", ageYears: 41, sex: "female" },
      encounters: [{
        id: "E1", date: "2026-09-17", type: "Dental clinic visit", chiefComplaint: "Dental abscess with post-procedure pain",
        symptoms: [
          { name: "Dental pain", present: true, severity: "severe", duration: "2 days" },
          { name: "Fever", present: true, duration: "1 day" },
        ],
        vitals: { temperature: { value: 37.9, unit: "°C" }, heartRate: { value: 88, unit: "bpm" }, systolicBp: { value: 126, unit: "mmHg" }, diastolicBp: { value: 80, unit: "mmHg" }, respiratoryRate: { value: 16, unit: "breaths/min" }, spo2: { value: 98, unit: "%" } },
        examination: [{ system: "Oral", finding: "Swelling and tenderness over lower left molar", abnormal: true }],
      }],
      allergies: { status: "documented", items: [{ substance: "Penicillin", reaction: "Urticaria and lip swelling", severity: "moderate", category: "drug" }] },
      medications: { status: "documented", items: [
        { name: "Amoxicillin", dose: "500 mg", frequency: "three times daily", route: "oral", startDate: "2026-09-17", status: "active" },
        { name: "Warfarin", dose: "3 mg", frequency: "once daily", route: "oral", startDate: "2023-06-01", status: "active" },
        { name: "Ibuprofen", dose: "400 mg", frequency: "three times daily", route: "oral", startDate: "2026-09-17", status: "active" },
        { name: "Diclofenac", dose: "50 mg", frequency: "twice daily", route: "oral", startDate: "2026-09-17", status: "active" },
        { name: "Paracetamol", status: "unknown" },
      ] },
      history: { status: "documented", items: [{ kind: "condition", text: "Atrial fibrillation", since: "2023" }] },
      investigations: [
        { name: "INR", value: 2.6, unit: "ratio", referenceRange: range(2.0, 3.0), collectedAt: "2026-08-20", status: "final" },
        { name: "INR", value: 3.8, unit: "ratio", referenceRange: range(2.0, 3.0), collectedAt: "2026-09-17", status: "final" },
      ],
    },
  },
  {
    id: "CI-DEMO-004",
    label: "Vikram Rao (Demo)",
    scenario: "Incomplete clinical record",
    description: "Sparse record: no age, no vitals, allergy/medication status not provided, a result with no unit or range, and contradictory entries. Shows refusal to guess.",
    context: {
      schemaVersion: "1",
      patient: { id: "CI-DEMO-004", displayName: "Vikram Rao (Demo)" },
      encounters: [{
        id: "E1", date: "2026-09-12", type: "Outpatient visit", chiefComplaint: "Feeling tired",
        symptoms: [
          { name: "Fatigue", present: true },
          { name: "Fatigue", present: true },
          { name: "Fever", present: true },
          { name: "Fever", present: false },
        ],
        examination: [],
      }],
      allergies: { status: "not_provided", items: [] },
      medications: { status: "not_provided", items: [] },
      history: { status: "not_provided", items: [] },
      investigations: [{ name: "Hemoglobin", value: 9.8, collectedAt: "2026-09-12" }],
    },
  },
  {
    id: "CI-DEMO-005",
    label: "Sunita Patil (Demo)",
    scenario: "Multiple encounters (timeline)",
    description: "Hypertension managed over four visits with staged medication changes and follow-up results. Shows the timeline, trends and a late interaction/electrolyte finding.",
    context: {
      schemaVersion: "1",
      patient: { id: "CI-DEMO-005", displayName: "Sunita Patil (Demo)", ageYears: 60, sex: "female" },
      encounters: [
        { id: "E1", date: "2026-01-12", type: "Outpatient visit", chiefComplaint: "Headache and elevated blood pressure on home monitoring",
          symptoms: [{ name: "Headache", present: true, severity: "moderate", duration: "1 week" }],
          vitals: { temperature: { value: 36.7, unit: "°C" }, heartRate: { value: 78, unit: "bpm" }, systolicBp: { value: 152, unit: "mmHg" }, diastolicBp: { value: 94, unit: "mmHg" }, respiratoryRate: { value: 16, unit: "breaths/min" }, spo2: { value: 98, unit: "%" } },
          examination: [], followUp: { instruction: "Recheck blood pressure in 8 weeks; lifestyle advice given" } },
        { id: "E2", date: "2026-03-09", type: "Follow-up", chiefComplaint: "Blood pressure review",
          symptoms: [{ name: "Headache", present: false }],
          vitals: { heartRate: { value: 76, unit: "bpm" }, systolicBp: { value: 148, unit: "mmHg" }, diastolicBp: { value: 92, unit: "mmHg" }, spo2: { value: 98, unit: "%" } },
          examination: [], notes: "Amlodipine started.", followUp: { instruction: "Review in 10 weeks with renal function and electrolytes" } },
        { id: "E3", date: "2026-05-18", type: "Follow-up", chiefComplaint: "Blood pressure review",
          symptoms: [{ name: "Ankle swelling", present: true, severity: "mild" }],
          vitals: { heartRate: { value: 74, unit: "bpm" }, systolicBp: { value: 158, unit: "mmHg" }, diastolicBp: { value: 96, unit: "mmHg" }, spo2: { value: 98, unit: "%" } },
          examination: [{ system: "Extremities", finding: "Mild bilateral ankle oedema", abnormal: true }], notes: "Lisinopril added; renal function and potassium requested." },
        { id: "E4", date: "2026-08-24", type: "Follow-up", chiefComplaint: "Blood pressure review",
          symptoms: [],
          vitals: { heartRate: { value: 72, unit: "bpm" }, systolicBp: { value: 136, unit: "mmHg" }, diastolicBp: { value: 84, unit: "mmHg" }, spo2: { value: 99, unit: "%" } },
          examination: [], notes: "Spironolactone added for persistently elevated readings.",
          followUp: { date: "2026-08-31", instruction: "Repeat potassium and creatinine" } },
      ],
      allergies: { status: "none_known", items: [] },
      medications: { status: "documented", items: [
        { name: "Amlodipine", dose: "5 mg", frequency: "once daily", route: "oral", startDate: "2026-03-09", status: "active" },
        { name: "Lisinopril", dose: "10 mg", frequency: "once daily", route: "oral", startDate: "2026-05-18", status: "active" },
        { name: "Spironolactone", dose: "25 mg", frequency: "once daily", route: "oral", startDate: "2026-08-24", status: "active" },
      ] },
      history: { status: "documented", items: [
        { kind: "condition", text: "Hypertension", since: "2024" },
        { kind: "family", text: "Family history of stroke" },
      ] },
      investigations: [
        { name: "Creatinine", value: 0.9, unit: "mg/dL", referenceRange: range(0.6, 1.1), collectedAt: "2026-03-09", status: "final" },
        { name: "Creatinine", value: 1.0, unit: "mg/dL", referenceRange: range(0.6, 1.1), collectedAt: "2026-05-18", status: "final" },
        { name: "Creatinine", value: 1.3, unit: "mg/dL", referenceRange: range(0.6, 1.1), collectedAt: "2026-08-31", status: "final" },
        { name: "Potassium", value: 4.4, unit: "mmol/L", referenceRange: range(3.5, 5.1), collectedAt: "2026-05-18", status: "final" },
        { name: "Potassium", value: 5.3, unit: "mmol/L", referenceRange: range(3.5, 5.1), collectedAt: "2026-08-31", status: "final" },
      ],
    },
  },
  {
    id: "CI-DEMO-006",
    label: "Imran Sheikh (Demo)",
    scenario: "Potential red flags",
    description: "Severe chest pain with associated features and abnormal vital signs, with no investigations yet recorded. Shows red-flag alerts and what is missing.",
    context: {
      schemaVersion: "1",
      patient: { id: "CI-DEMO-006", displayName: "Imran Sheikh (Demo)", ageYears: 58, sex: "male" },
      encounters: [{
        id: "E1", date: "2026-09-19", type: "Emergency presentation",
        chiefComplaint: "Severe central chest pain for 40 minutes with sweating and breathlessness",
        symptoms: [
          { name: "Chest pain", present: true, severity: "severe", duration: "40 minutes" },
          { name: "Pain radiating to left arm", present: true, duration: "40 minutes" },
          { name: "Sweating", present: true },
          { name: "Breathlessness", present: true, severity: "severe", duration: "40 minutes" },
          { name: "Nausea", present: true },
          { name: "Fever", present: false },
        ],
        vitals: { temperature: { value: 36.9, unit: "°C" }, heartRate: { value: 112, unit: "bpm" }, systolicBp: { value: 88, unit: "mmHg" }, diastolicBp: { value: 54, unit: "mmHg" }, respiratoryRate: { value: 26, unit: "breaths/min" }, spo2: { value: 90, unit: "%" } },
        examination: [{ system: "General", finding: "Diaphoretic and distressed", abnormal: true }],
        notes: "No investigations recorded at the time of entry.",
      }],
      allergies: { status: "none_known", items: [] },
      medications: { status: "documented", items: [
        { name: "Metformin", dose: "500 mg", frequency: "twice daily", route: "oral", status: "active" },
        { name: "Atorvastatin", dose: "20 mg", frequency: "once daily at night", route: "oral", status: "active" },
        { name: "Aspirin", dose: "75 mg", frequency: "once daily", route: "oral", status: "active" },
      ] },
      history: { status: "documented", items: [
        { kind: "condition", text: "Type 2 diabetes mellitus", since: "2015" },
        { kind: "condition", text: "Hypertension" },
        { kind: "risk_factor", text: "Current smoker" },
        { kind: "family", text: "Father had a myocardial infarction at age 55" },
      ] },
      investigations: [],
    },
  },
];

export function listDemoScenarios() {
  return DEMO_SCENARIOS.map(({ id, label, scenario, description }) => ({ id, label, scenario, description, synthetic: true }));
}

export function getDemoContext(patientId) {
  const found = DEMO_SCENARIOS.find((s) => s.id === patientId);
  return found ? structuredClone(found.context) : null;
}
