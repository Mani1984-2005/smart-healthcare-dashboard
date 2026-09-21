// backend/services/physicianWorkspace/aiSummaryGenerator.js
//
// Part 5 — Physician AI Workspace
// ---------------------------------------------------------------------------
// SIMULATED / DEMO AI ONLY.
//
// This generator does NOT call any external AI provider or model. It is a
// deterministic, rule-based text composer that turns structured clinical
// fields already present on a case into an organised, physician-readable
// draft. It never invents facts: any field that is missing on the source
// case is explicitly reported as "Not available" rather than guessed.
//
// This is intentionally self-contained (no import from backend/utils/
// mlEngineStub.js or any other module) so Part 5 has no dependency on
// infrastructure that may belong to another SIH part.
//
// The output is always labelled as an AI-generated draft that requires
// physician review — it is decision support only, never an autonomous
// diagnosis, prescription, or clinical order.
// ---------------------------------------------------------------------------

export const AI_MODEL_ID = "demo-deterministic-v1";
export const AI_DISCLAIMER =
  "AI-GENERATED DRAFT (Demo / Simulated AI). Not a diagnosis. Requires physician review before any clinical use.";

const URGENT_KEYWORDS = [
  { pattern: /chest pain/i, flag: "Chest pain reported — consider urgent cardiac evaluation." },
  { pattern: /breathless|shortness of breath/i, flag: "Breathlessness reported — assess respiratory and cardiac status." },
  { pattern: /severe|crushing/i, flag: "Severe symptom intensity described — prioritise timely review." },
  { pattern: /sweating/i, flag: "Diaphoresis reported alongside other symptoms — correlate with cardiac risk." },
  { pattern: /unconscious|seizure/i, flag: "Neurological red flag reported — urgent assessment recommended." },
  { pattern: /bleeding/i, flag: "Bleeding reported — assess haemodynamic stability." },
];

function notAvailable() {
  return "Not available";
}

function joinOrFallback(list, fallbackWhenEmpty, fallbackWhenMissing) {
  if (list === undefined || list === null) return fallbackWhenMissing;
  if (Array.isArray(list) && list.length === 0) return fallbackWhenEmpty;
  if (Array.isArray(list)) return list.join("; ");
  return String(list);
}

function formatVitals(vitals) {
  if (!vitals || vitals.length === 0) return notAvailable();
  return vitals.map((v) => `${v.label}: ${v.value}`).join("; ");
}

function formatLabResults(labResults) {
  if (!labResults || labResults.length === 0) return "No laboratory investigations on file.";
  return labResults.map((l) => `${l.test}: ${l.value}${l.flag ? ` (${l.flag})` : ""}`).join("; ");
}

function collectMissingInformation(clinicalCase) {
  const missing = [];
  if (!clinicalCase.familyHistory || /not documented/i.test(clinicalCase.familyHistory)) {
    missing.push("Family history not documented.");
  }
  if (!clinicalCase.socialHistory || /not documented/i.test(clinicalCase.socialHistory)) {
    missing.push("Social history not documented.");
  }
  if (!clinicalCase.vitals || clinicalCase.vitals.length === 0) {
    missing.push("No vital signs recorded for this visit.");
  }
  if (!clinicalCase.labResults || clinicalCase.labResults.length === 0) {
    missing.push("No laboratory investigations available yet.");
  }
  if (!clinicalCase.allergies || clinicalCase.allergies.length === 0) {
    missing.push("No known drug allergy has been explicitly confirmed — verify with patient.");
  }
  return missing;
}

function collectFlags(clinicalCase) {
  const text = [clinicalCase.presentingComplaint, clinicalCase.historyOfPresentIllness]
    .filter(Boolean)
    .join(" ");
  const flags = URGENT_KEYWORDS.filter((rule) => rule.pattern.test(text)).map((rule) => rule.flag);
  return flags;
}

/**
 * Builds a deterministic, physician-ready draft summary from a structured
 * clinical case. Never fabricates values; every section either reflects the
 * source data or explicitly states that information is unavailable.
 *
 * @param {import('./demoData.js').ClinicalCase} clinicalCase
 * @returns {{ model: string, disclaimer: string, generatedAt: string, sections: Record<string,string>, flags: string[] }}
 */
export function generateClinicalSummary(clinicalCase) {
  if (!clinicalCase || typeof clinicalCase !== "object") {
    throw new Error("generateClinicalSummary requires a clinical case object");
  }

  const sections = {
    chiefComplaint: clinicalCase.presentingComplaint || notAvailable(),
    historyOfPresentIllness: clinicalCase.historyOfPresentIllness || notAvailable(),
    pastMedicalHistory: joinOrFallback(
      clinicalCase.pastMedicalHistory,
      "No significant past medical history documented.",
      notAvailable()
    ),
    medications: joinOrFallback(clinicalCase.medications, "No current medications documented.", notAvailable()),
    allergies: joinOrFallback(clinicalCase.allergies, "No known drug allergies documented.", notAvailable()),
    familyHistory: clinicalCase.familyHistory || notAvailable(),
    socialHistory: clinicalCase.socialHistory || notAvailable(),
    vitals: formatVitals(clinicalCase.vitals),
    investigations: formatLabResults(clinicalCase.labResults),
    missingInformation: collectMissingInformation(clinicalCase).join(" ") || "None identified.",
  };

  return {
    model: AI_MODEL_ID,
    disclaimer: AI_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    sections,
    flags: collectFlags(clinicalCase),
  };
}
