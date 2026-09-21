// src/services/physicianWorkspace/localDemoEngine.ts
//
// Part 5 — Physician AI Workspace — local (offline) demo engine.
//
// This is a pure, dependency-free mirror of the backend's deterministic
// demo AI logic (backend/services/physicianWorkspace/aiSummaryGenerator.js).
// It exists so the Physician AI Workspace remains independently
// demonstrable in the browser even if the Express backend is not running —
// consistent with "Part 5 must be resilient if every other part / service
// is absent." It is used ONLY as a fallback when the real API call fails;
// whenever the backend is reachable, that is the source of truth.
//
// SIMULATED / DEMO AI ONLY — see AI_DISCLAIMER below.

import type { ClinicalCase, SummarySections } from "../../types/physicianWorkspace";

export const LOCAL_AI_MODEL_ID = "demo-deterministic-v1-local";
export const AI_DISCLAIMER =
  "AI-GENERATED DRAFT (Demo / Simulated AI, offline mode). Not a diagnosis. Requires physician review before any clinical use.";

const NOT_AVAILABLE = "Not available";

const URGENT_KEYWORDS: { pattern: RegExp; flag: string }[] = [
  { pattern: /chest pain/i, flag: "Chest pain reported — consider urgent cardiac evaluation." },
  { pattern: /breathless|shortness of breath/i, flag: "Breathlessness reported — assess respiratory and cardiac status." },
  { pattern: /severe|crushing/i, flag: "Severe symptom intensity described — prioritise timely review." },
  { pattern: /sweating/i, flag: "Diaphoresis reported alongside other symptoms — correlate with cardiac risk." },
  { pattern: /unconscious|seizure/i, flag: "Neurological red flag reported — urgent assessment recommended." },
  { pattern: /bleeding/i, flag: "Bleeding reported — assess haemodynamic stability." },
];

function joinOrFallback(list: string[] | undefined | null, whenEmpty: string, whenMissing: string): string {
  if (list === undefined || list === null) return whenMissing;
  if (list.length === 0) return whenEmpty;
  return list.join("; ");
}

function formatVitals(vitals?: { label: string; value: string }[]): string {
  if (!vitals || vitals.length === 0) return NOT_AVAILABLE;
  return vitals.map((v) => `${v.label}: ${v.value}`).join("; ");
}

function formatLabResults(labResults?: { test: string; value: string; flag: string }[]): string {
  if (!labResults || labResults.length === 0) return "No laboratory investigations on file.";
  return labResults.map((l) => `${l.test}: ${l.value}${l.flag ? ` (${l.flag})` : ""}`).join("; ");
}

function collectMissingInformation(c: ClinicalCase): string[] {
  const missing: string[] = [];
  if (!c.familyHistory || /not documented/i.test(c.familyHistory)) missing.push("Family history not documented.");
  if (!c.socialHistory || /not documented/i.test(c.socialHistory)) missing.push("Social history not documented.");
  if (!c.vitals || c.vitals.length === 0) missing.push("No vital signs recorded for this visit.");
  if (!c.labResults || c.labResults.length === 0) missing.push("No laboratory investigations available yet.");
  if (!c.allergies || c.allergies.length === 0) {
    missing.push("No known drug allergy has been explicitly confirmed — verify with patient.");
  }
  return missing;
}

export function collectFlags(c: Pick<ClinicalCase, "presentingComplaint" | "historyOfPresentIllness">): string[] {
  const text = [c.presentingComplaint, c.historyOfPresentIllness].filter(Boolean).join(" ");
  return URGENT_KEYWORDS.filter((rule) => rule.pattern.test(text)).map((rule) => rule.flag);
}

export function generateLocalSummary(clinicalCase: ClinicalCase): {
  model: string;
  disclaimer: string;
  generatedAt: string;
  sections: SummarySections;
  flags: string[];
} {
  const sections: SummarySections = {
    chiefComplaint: clinicalCase.presentingComplaint || NOT_AVAILABLE,
    historyOfPresentIllness: clinicalCase.historyOfPresentIllness || NOT_AVAILABLE,
    pastMedicalHistory: joinOrFallback(
      clinicalCase.pastMedicalHistory,
      "No significant past medical history documented.",
      NOT_AVAILABLE
    ),
    medications: joinOrFallback(clinicalCase.medications, "No current medications documented.", NOT_AVAILABLE),
    allergies: joinOrFallback(clinicalCase.allergies, "No known drug allergies documented.", NOT_AVAILABLE),
    familyHistory: clinicalCase.familyHistory || NOT_AVAILABLE,
    socialHistory: clinicalCase.socialHistory || NOT_AVAILABLE,
    vitals: formatVitals(clinicalCase.vitals),
    investigations: formatLabResults(clinicalCase.labResults),
    missingInformation: collectMissingInformation(clinicalCase).join(" ") || "None identified.",
  };

  return {
    model: LOCAL_AI_MODEL_ID,
    disclaimer: AI_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    sections,
    flags: collectFlags(clinicalCase),
  };
}
