import { describe, it, expect } from "vitest";
import { assembleClinicalHistory, assertSafeFact, ClinicalDataSafetyError } from "../services/clinicalHistoryService.js";

function baseAnswer(overrides = {}) {
  return {
    questionId: "hpi.generic.onset",
    section: "historyOfPresentIllness",
    rawValue: "yesterday",
    certainty: "CONFIRMED",
    source: "PATIENT_TEXT",
    sourceMessageId: "msg-1",
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("assertSafeFact — the hard AI_DERIVED != CONFIRMED rule", () => {
  it("rejects AI_DERIVED + CONFIRMED", () => {
    expect(() => assertSafeFact({ source: "AI_DERIVED", certainty: "CONFIRMED" })).toThrow(ClinicalDataSafetyError);
  });

  it("allows AI_DERIVED + UNCERTAIN", () => {
    expect(() => assertSafeFact({ source: "AI_DERIVED", certainty: "UNCERTAIN" })).not.toThrow();
  });

  it("allows PATIENT_TEXT + CONFIRMED", () => {
    expect(() => assertSafeFact({ source: "PATIENT_TEXT", certainty: "CONFIRMED" })).not.toThrow();
  });

  it("allows CLINICIAN_ENTERED + CONFIRMED", () => {
    expect(() => assertSafeFact({ source: "CLINICIAN_ENTERED", certainty: "CONFIRMED" })).not.toThrow();
  });

  it("rejects SYSTEM_STRUCTURED + CONFIRMED (only patient/clinician sources may confirm)", () => {
    expect(() => assertSafeFact({ source: "SYSTEM_STRUCTURED", certainty: "CONFIRMED" })).toThrow(ClinicalDataSafetyError);
  });

  it("rejects an unknown source outright", () => {
    expect(() => assertSafeFact({ source: "GUESS", certainty: "UNCERTAIN" })).toThrow(ClinicalDataSafetyError);
  });

  it("rejects an unknown certainty outright", () => {
    expect(() => assertSafeFact({ source: "PATIENT_TEXT", certainty: "PROBABLY" })).toThrow(ClinicalDataSafetyError);
  });
});

describe("assembleClinicalHistory", () => {
  it("throws rather than silently storing an unsafe fact", () => {
    const answers = [baseAnswer({ source: "AI_DERIVED", certainty: "CONFIRMED" })];
    expect(() => assembleClinicalHistory(answers)).toThrow(ClinicalDataSafetyError);
  });

  it("preserves UNCERTAIN patient statements without upgrading them to CONFIRMED", () => {
    const answers = [
      { ...baseAnswer(), questionId: "pmh.conditions", section: "pastMedicalHistory", rawValue: "I think I had diabetes 5 years ago", certainty: "UNCERTAIN" },
    ];
    const history = assembleClinicalHistory(answers);
    expect(history.pastMedicalHistory[0].certainty).toBe("UNCERTAIN");
    expect(history.uncertainties.length).toBeGreaterThan(0);
  });

  it("keeps UNKNOWN and DENIED distinguishable, never collapsed together", () => {
    const answers = [
      { ...baseAnswer(), questionId: "allergies.status", section: "allergies", rawValue: "no", certainty: "DENIED" },
    ];
    const history = assembleClinicalHistory(answers);
    expect(history.allergies.status).toBe("DENIED");

    const answersUnknown = [
      { ...baseAnswer(), questionId: "allergies.status", section: "allergies", rawValue: "not sure", certainty: "UNKNOWN" },
    ];
    const historyUnknown = assembleClinicalHistory(answersUnknown);
    expect(historyUnknown.allergies.status).toBe("UNKNOWN");
  });

  it("builds a keyed historyOfPresentIllness object rather than a text blob", () => {
    const answers = [
      { ...baseAnswer(), questionId: "hpi.chestpain.onset", rawValue: "two days ago" },
      { ...baseAnswer(), questionId: "hpi.chestpain.severity", rawValue: 7 },
    ];
    const history = assembleClinicalHistory(answers);
    expect(typeof history.historyOfPresentIllness).toBe("object");
    expect(history.historyOfPresentIllness.onset.value).toBe("two days ago");
    expect(history.historyOfPresentIllness.severity.value).toBe(7);
  });

  it("stores AYUSH facts as an extensible array, not hard-coded object keys", () => {
    const answers = [
      { ...baseAnswer(), questionId: "ayush.prakriti", rawValue: "Vata-Pitta leaning" },
    ];
    const history = assembleClinicalHistory(answers, "AYUSH");
    expect(Array.isArray(history.ayushHistory.fields)).toBe(true);
    expect(history.ayushHistory.fields[0].key).toBe("prakriti");
    expect(history.ayushHistory.fields[0].certainty).toBe("CONFIRMED");
  });

  it("every provenance object carries source and capturedAt", () => {
    const answers = [baseAnswer({ questionId: "hpi.generic.onset" })];
    const history = assembleClinicalHistory(answers);
    const fact = history.historyOfPresentIllness.onset;
    expect(fact.provenance.source).toBe("PATIENT_TEXT");
    expect(fact.provenance.capturedAt).toBeTruthy();
  });
});
