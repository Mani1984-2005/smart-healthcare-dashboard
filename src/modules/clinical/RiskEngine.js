// src/utils/riskEngine.js
// MediCare Pro — Clinical Risk Scoring Engine
// Pure functions, no side effects. Safe to call server-side or client-side.
// Compatible with PatientsPage.jsx patient object schema.

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_LEVELS = Object.freeze({
  CRITICAL: "Critical",
  HIGH:     "High",
  MEDIUM:   "Medium",
  LOW:      "Low",
});

// Weighted risk factors (points added to base score)
const RISK_WEIGHTS = {
  // Priority override
  priorityCritical: 100,
  priorityHigh:      40,
  priorityModerate:  10,

  // Status override
  statusCritical:    80,

  // Age brackets
  ageOver80:         30,
  ageOver70:         20,
  ageOver60:         10,
  ageUnder2:         15,

  // Chronic diseases (per keyword match)
  cancer:            50,
  icu:               50,
  heartFailure:      45,
  copd:              35,
  diabetes:          25,
  hypertension:      20,
  kidneyDisease:     30,
  liverDisease:      30,
  stroke:            35,
  epilepsy:          20,
  hiv:               25,
  autoimmune:        20,

  // Allergies
  allergyPresent:    15,
  penicillinAllergy: 20,
  multipleAllergies: 10,  // extra if 2+ known

  // Vitals out of range
  spo2Below90:       50,
  spo2Below94:       30,
  spo2Below96:       10,
  hrAbove120:        25,
  hrBelow50:         25,
  tempAbove103:      30,
  tempAbove101:      15,
  bpSystolicAbove160:25,
  bpSystolicAbove140:10,
  bpSystolicBelow90: 30,

  // Lifestyle
  smoking:           10,
  regularAlcohol:    10,

  // Special flags
  pregnancy:         15,
  organDonor:        0,   // informational only
  disability:        5,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a blood pressure string like "140/90" → { systolic: 140, diastolic: 90 }
 * Returns null if unparseable.
 */
export const parseBloodPressure = (bpString) => {
  if (!bpString) return null;
  const match = String(bpString).match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  return { systolic: parseInt(match[1], 10), diastolic: parseInt(match[2], 10) };
};

/**
 * Calculate age in years from DOB string (YYYY-MM-DD) or fallback integer/string.
 * Returns null if neither is available.
 */
export const resolveAge = (dob, fallbackAge) => {
  if (dob) {
    const birth = new Date(dob);
    if (!isNaN(birth)) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    }
  }
  const n = parseInt(fallbackAge, 10);
  return isNaN(n) ? null : n;
};

// ─── Core Scoring ─────────────────────────────────────────────────────────────

/**
 * Compute a numeric risk score (0–200+) and return a rich breakdown.
 *
 * @param {Object} patient - patient record conforming to MediCare Pro schema
 * @returns {Object} { score, level, factors, recommendations }
 */
export const computeRiskScore = (patient) => {
  let score   = 0;
  const factors = [];   // Array<{ label, weight, category }>

  const add = (label, weight, category) => {
    score += weight;
    factors.push({ label, weight, category });
  };

  // ── Priority ──────────────────────────────────────────────────────────────
  if (patient.priority === "Critical")
    add("Priority: Critical", RISK_WEIGHTS.priorityCritical, "priority");
  else if (patient.priority === "High")
    add("Priority: High",     RISK_WEIGHTS.priorityHigh,     "priority");
  else if (patient.priority === "Moderate")
    add("Priority: Moderate", RISK_WEIGHTS.priorityModerate, "priority");

  // ── Status ────────────────────────────────────────────────────────────────
  if (patient.status === "Critical")
    add("Status: Critical",   RISK_WEIGHTS.statusCritical, "status");

  // ── Age ───────────────────────────────────────────────────────────────────
  const age = resolveAge(patient.dob, patient.age);
  if (age !== null) {
    if      (age > 80)   add("Age > 80",     RISK_WEIGHTS.ageOver80,  "age");
    else if (age > 70)   add("Age > 70",     RISK_WEIGHTS.ageOver70,  "age");
    else if (age > 60)   add("Age > 60",     RISK_WEIGHTS.ageOver60,  "age");
    else if (age < 2)    add("Age < 2 yrs",  RISK_WEIGHTS.ageUnder2,  "age");
  }

  // ── Chronic diseases ──────────────────────────────────────────────────────
  const chronic = (patient.chronicDiseases || "").toLowerCase();
  if (chronic.includes("cancer"))                         add("Cancer",            RISK_WEIGHTS.cancer,       "chronic");
  if (chronic.includes("icu"))                            add("ICU History",       RISK_WEIGHTS.icu,          "chronic");
  if (chronic.includes("heart failure"))                  add("Heart Failure",     RISK_WEIGHTS.heartFailure, "chronic");
  if (chronic.includes("copd"))                           add("COPD",              RISK_WEIGHTS.copd,         "chronic");
  if (chronic.includes("diabetes"))                       add("Diabetes",          RISK_WEIGHTS.diabetes,     "chronic");
  if (chronic.includes("hypertension") || chronic.includes(" bp")) add("Hypertension", RISK_WEIGHTS.hypertension, "chronic");
  if (chronic.includes("kidney"))                         add("Kidney Disease",    RISK_WEIGHTS.kidneyDisease,"chronic");
  if (chronic.includes("liver"))                          add("Liver Disease",     RISK_WEIGHTS.liverDisease, "chronic");
  if (chronic.includes("stroke"))                         add("Stroke History",    RISK_WEIGHTS.stroke,       "chronic");
  if (chronic.includes("epilepsy") || chronic.includes("seizure")) add("Epilepsy", RISK_WEIGHTS.epilepsy,    "chronic");
  if (chronic.includes("hiv") || chronic.includes("aids"))         add("HIV/AIDS", RISK_WEIGHTS.hiv,         "chronic");
  if (chronic.includes("lupus") || chronic.includes("autoimmune")) add("Autoimmune", RISK_WEIGHTS.autoimmune,"chronic");

  // ── Allergies ─────────────────────────────────────────────────────────────
  const allergies = (patient.allergies || "").toLowerCase();
  if (allergies) {
    add("Known Allergies", RISK_WEIGHTS.allergyPresent, "allergy");
    if (allergies.includes("penicillin") || allergies.includes("sulfa"))
      add("Penicillin/Sulfa Allergy", RISK_WEIGHTS.penicillinAllergy, "allergy");
    // Count commas to detect multiple allergies
    if ((allergies.match(/,/g) || []).length >= 1)
      add("Multiple Allergies", RISK_WEIGHTS.multipleAllergies, "allergy");
  }

  // ── Vitals ────────────────────────────────────────────────────────────────
  const spo2 = parseFloat(patient.oxygenSaturation);
  if (!isNaN(spo2)) {
    if      (spo2 < 90) add("SpO₂ < 90%",  RISK_WEIGHTS.spo2Below90,  "vitals");
    else if (spo2 < 94) add("SpO₂ < 94%",  RISK_WEIGHTS.spo2Below94,  "vitals");
    else if (spo2 < 96) add("SpO₂ < 96%",  RISK_WEIGHTS.spo2Below96,  "vitals");
  }

  const hr = parseFloat(patient.pulse);
  if (!isNaN(hr)) {
    if      (hr > 120) add("Heart Rate > 120 bpm", RISK_WEIGHTS.hrAbove120, "vitals");
    else if (hr < 50)  add("Heart Rate < 50 bpm",  RISK_WEIGHTS.hrBelow50,  "vitals");
  }

  const temp = parseFloat(patient.temperature);
  if (!isNaN(temp)) {
    if      (temp >= 103) add("Temperature ≥ 103°F", RISK_WEIGHTS.tempAbove103, "vitals");
    else if (temp >= 101) add("Temperature ≥ 101°F", RISK_WEIGHTS.tempAbove101, "vitals");
  }

  const bp = parseBloodPressure(patient.bloodPressure);
  if (bp) {
    if      (bp.systolic >= 160) add("BP ≥ 160 systolic", RISK_WEIGHTS.bpSystolicAbove160, "vitals");
    else if (bp.systolic >= 140) add("BP ≥ 140 systolic", RISK_WEIGHTS.bpSystolicAbove140, "vitals");
    if      (bp.systolic < 90)   add("BP < 90 systolic",  RISK_WEIGHTS.bpSystolicBelow90,  "vitals");
  }

  // ── Lifestyle ─────────────────────────────────────────────────────────────
  if ((patient.smoking || "").toLowerCase() === "yes")
    add("Active Smoker", RISK_WEIGHTS.smoking, "lifestyle");
  if ((patient.alcohol || "").toLowerCase() === "regular")
    add("Regular Alcohol Use", RISK_WEIGHTS.regularAlcohol, "lifestyle");

  // ── Special ───────────────────────────────────────────────────────────────
  if ((patient.pregnancyStatus || "").toLowerCase() === "pregnant")
    add("Pregnancy", RISK_WEIGHTS.pregnancy, "special");
  if ((patient.disability || "").trim())
    add("Disability on Record", RISK_WEIGHTS.disability, "special");

  // ── Derive level ──────────────────────────────────────────────────────────
  let level;
  if      (score >= 80)  level = RISK_LEVELS.CRITICAL;
  else if (score >= 40)  level = RISK_LEVELS.HIGH;
  else if (score >= 15)  level = RISK_LEVELS.MEDIUM;
  else                   level = RISK_LEVELS.LOW;

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = buildRecommendations(level, factors, patient);

  return {
    score,
    level,
    factors: factors.sort((a, b) => b.weight - a.weight),
    recommendations,
  };
};

// ─── Recommendations ──────────────────────────────────────────────────────────

const buildRecommendations = (level, factors, patient) => {
  const recs = [];
  const cats = new Set(factors.map((f) => f.category));
  const labels = factors.map((f) => f.label.toLowerCase());

  if (level === RISK_LEVELS.CRITICAL) {
    recs.push({ priority: "urgent", text: "Immediate physician review required." });
    recs.push({ priority: "urgent", text: "Ensure crash cart and resuscitation equipment available nearby." });
  }

  if (labels.some((l) => l.includes("spo₂ < 90")))
    recs.push({ priority: "urgent", text: "Administer supplemental oxygen immediately. Target SpO₂ ≥ 94%." });
  if (labels.some((l) => l.includes("bp ≥ 160")))
    recs.push({ priority: "urgent", text: "Hypertensive urgency protocol — notify attending physician." });
  if (labels.some((l) => l.includes("temperature ≥ 103")))
    recs.push({ priority: "high", text: "High fever — check blood cultures, initiate cooling measures." });
  if (labels.some((l) => l.includes("heart rate > 120")))
    recs.push({ priority: "high", text: "Tachycardia detected — 12-lead ECG recommended." });
  if (labels.some((l) => l.includes("heart rate < 50")))
    recs.push({ priority: "high", text: "Bradycardia detected — cardiac monitoring advised." });
  if (cats.has("allergy"))
    recs.push({ priority: "high", text: "Review allergy list before prescribing. Confirm wristband tagged." });
  if (labels.some((l) => l.includes("diabetes")))
    recs.push({ priority: "medium", text: "Monitor blood glucose every 4–6 hours during admission." });
  if (labels.some((l) => l.includes("pregnancy")))
    recs.push({ priority: "medium", text: "Obstetrics consult recommended. Avoid teratogenic medications." });
  if (labels.some((l) => l.includes("kidney")))
    recs.push({ priority: "medium", text: "Adjust medication dosages for renal function. Monitor creatinine." });
  if (cats.has("lifestyle"))
    recs.push({ priority: "low", text: "Counsel patient on smoking/alcohol cessation. Consider referral." });
  if (level === RISK_LEVELS.LOW)
    recs.push({ priority: "low", text: "Routine monitoring. Schedule follow-up as clinically indicated." });

  return recs;
};

// ─── Batch scoring ────────────────────────────────────────────────────────────

/**
 * Score an array of patients and return them sorted by score descending.
 * Useful for risk triage dashboards.
 */
export const rankPatientsByRisk = (patients) => {
  return patients
    .map((p) => ({ ...p, _risk: computeRiskScore(p) }))
    .sort((a, b) => b._risk.score - a._risk.score);
};

/**
 * Return only patients above a given risk level.
 * level: "Critical" | "High" | "Medium" | "Low"
 */
export const filterByRiskLevel = (patients, level) => {
  const thresholds = { Critical: 80, High: 40, Medium: 15, Low: 0 };
  const min = thresholds[level] ?? 0;
  return patients.filter((p) => computeRiskScore(p).score >= min);
};

export { RISK_LEVELS, RISK_WEIGHTS };
export default computeRiskScore;
