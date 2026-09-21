// backend/tests/intakeRecordAdapter.test.js
//
// Integration tests for the Part 1 -> Part 5 bridge
// (backend/services/physicianWorkspace/intakeRecordAdapter.js).
// Uses Part 1's own in-memory test fixture (backend/tests/fixtures/
// inMemoryStore.js) via intakeService.__setDepsForTesting, exactly as
// Part 1's own test suite does — no live database required, matching the
// documented environment limitation.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as intakeService from "../services/intakeService.js";
import * as store from "../services/physicianWorkspace/store.js";
import {
  loadCaseFromIntakeSession,
  mapClinicalHistoryToCase,
  IntakeSessionNotCompleteError,
  IntakeSessionNotFoundError,
} from "../services/physicianWorkspace/intakeRecordAdapter.js";
import { createInMemoryStore } from "./fixtures/inMemoryStore.js";

describe("Part 1 -> Part 5 intake record adapter", () => {
  let deps;

  beforeEach(() => {
    deps = createInMemoryStore({ existingPatientIds: ["patient-bridge-1"] });
    intakeService.__setDepsForTesting(deps);
    store.resetStore();
  });

  afterEach(() => {
    intakeService.__setDepsForTesting(undefined);
    store.resetStore();
  });

  async function createAndAnswerSession({ complete = true } = {}) {
    const { session } = await intakeService.createSession({ patientId: "patient-bridge-1", staffUid: "staff-test-1" }, deps);
    await intakeService.submitAnswer(
      session.id,
      { questionId: "chiefComplaint.text", rawValue: "Chest pain for two days" },
      deps
    );
    // "I think" triggers UNCERTAIN inference (questionEngine.inferCertaintyFromText).
    await intakeService.submitAnswer(
      session.id,
      { questionId: "pmh.conditions", rawValue: "I think I have hypertension" },
      deps
    );
    await intakeService.submitAnswer(
      session.id,
      { questionId: "medications.current", rawValue: "Amlodipine 5mg", inputMode: "VOICE" },
      deps
    );
    await intakeService.submitAnswer(session.id, { questionId: "allergies.status", rawValue: "no" }, deps);
    if (complete) {
      await intakeService.completeSession(session.id, deps);
    }
    return session;
  }

  // Test 1: Create/seed a completed Part 1 ClinicalHistory. Part 5 retrieves it successfully.
  it("Test 1: loads a real completed intake session as a Part 5 case", async () => {
    const session = await createAndAnswerSession();
    const clinicalCase = await loadCaseFromIntakeSession(session.id, deps);
    expect(clinicalCase.id).toBe(`INTAKE-${session.id}`);
    expect(clinicalCase.intakeSessionId).toBe(session.id);
    expect(clinicalCase.source).toBe("INTAKE_SESSION");
  });

  // Test 2: Part 5 displays the correct patient/intake information.
  it("Test 2: carries real presenting complaint, medications and patient id through", async () => {
    const session = await createAndAnswerSession();
    const clinicalCase = await loadCaseFromIntakeSession(session.id, deps);
    expect(clinicalCase.patientId).toBe("patient-bridge-1");
    expect(clinicalCase.presentingComplaint).toBe("Chest pain for two days");
    expect(clinicalCase.medications).toContain("Amlodipine 5mg");
    // Explicitly denied allergies -> a real, confirmed empty list (not "Not available").
    expect(clinicalCase.allergies).toEqual([]);
  });

  // Test 3: Part 5 does not use demo data when a valid real intakeSessionId is supplied.
  it("Test 3: a bridged case never falls back to seeded demo content", async () => {
    const session = await createAndAnswerSession();
    const clinicalCase = await loadCaseFromIntakeSession(session.id, deps);
    const demoPatientIds = new Set(["P-1001", "P-1002", "P-1004"]);
    expect(demoPatientIds.has(clinicalCase.patientId)).toBe(false);
    expect(clinicalCase.presentingComplaint).not.toMatch(/chest tightness and mild breathlessness/i); // CASE-2001's demo text
  });

  // Test 4: Incomplete intake cannot be treated as completed clinical history.
  it("Test 4: an in-progress session is refused, not silently returned as complete", async () => {
    const session = await createAndAnswerSession({ complete: false });
    await expect(loadCaseFromIntakeSession(session.id, deps)).rejects.toBeInstanceOf(IntakeSessionNotCompleteError);
  });

  it("an unknown session id is refused clearly", async () => {
    await expect(loadCaseFromIntakeSession("no-such-session", deps)).rejects.toBeInstanceOf(
      IntakeSessionNotFoundError
    );
  });

  // Test 5: Provenance survives Part 1 -> Part 5.
  it("Test 5: per-fact provenance (source, sourceMessageId, capturedAt) survives into the case", async () => {
    const session = await createAndAnswerSession();
    const clinicalCase = await loadCaseFromIntakeSession(session.id, deps);
    // medications.current was submitted with inputMode: "VOICE" -> source PATIENT_VOICE.
    const medFacts = clinicalCase.provenanceBySection.medications;
    expect(medFacts[0].provenance.source).toBe("PATIENT_VOICE");
    const chiefFact = clinicalCase.provenanceBySection.chiefComplaint;
    expect(chiefFact.provenance.source).toBe("PATIENT_TEXT");
  });

  // Test 6: Uncertain information remains uncertain.
  it("Test 6: a patient's expressed uncertainty is preserved, not resolved to CONFIRMED", async () => {
    const session = await createAndAnswerSession();
    const clinicalCase = await loadCaseFromIntakeSession(session.id, deps);
    const pmhFacts = clinicalCase.provenanceBySection.pastMedicalHistory;
    expect(pmhFacts[0].certainty).toBe("UNCERTAIN");
    expect(clinicalCase.uncertainties.some((u) => u.field.includes("pastMedicalHistory"))).toBe(true);
    // The flattened display string still carries the patient's actual words, not a sanitized "confirmed" claim.
    expect(clinicalCase.pastMedicalHistory[0]).toMatch(/i think i have hypertension/i);
  });

  // Test 7: AI_DERIVED information cannot become CONFIRMED through the adapter.
  it("Test 7: AI_DERIVED + CONFIRMED is rejected before the adapter ever sees it", async () => {
    const { session } = await intakeService.createSession({ patientId: "patient-bridge-1", staffUid: "staff-test-1" }, deps);
    await expect(
      intakeService.submitAnswer(
        session.id,
        { questionId: "chiefComplaint.text", rawValue: "x", source: "AI_DERIVED", certainty: "CONFIRMED" },
        deps
      )
    ).rejects.toThrow(/AI-derived answers can never be stored as CONFIRMED/);
  });

  it("Test 7b: AI_DERIVED + UNCERTAIN is accepted and stays UNCERTAIN through the bridge, never upgraded", async () => {
    const { session } = await intakeService.createSession({ patientId: "patient-bridge-1", staffUid: "staff-test-1" }, deps);
    await intakeService.submitAnswer(
      session.id,
      { questionId: "chiefComplaint.text", rawValue: "Possible chest pain", source: "AI_DERIVED", certainty: "UNCERTAIN" },
      deps
    );
    await intakeService.completeSession(session.id, deps);
    const clinicalCase = await loadCaseFromIntakeSession(session.id, deps);
    expect(clinicalCase.provenanceBySection.chiefComplaint.provenance.source).toBe("AI_DERIVED");
    expect(clinicalCase.provenanceBySection.chiefComplaint.certainty).toBe("UNCERTAIN");
  });

  it("mapClinicalHistoryToCase is a pure, additive view: unknown patient identity is left absent, never fabricated", () => {
    const clinicalCase = mapClinicalHistoryToCase({
      session: { id: "S-1", patientId: "P-X", encounterId: null, startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:10:00Z" },
      history: {
        chiefComplaint: null,
        historyOfPresentIllness: {},
        pastMedicalHistory: [],
        medications: [],
        allergies: { status: "UNKNOWN", items: [] },
        familyHistory: [],
        personalSocialHistory: {},
        reviewOfSystems: [],
        ayushHistory: { fields: [] },
        patientReportedFacts: [],
        uncertainties: [],
        completion: { status: "INCOMPLETE" },
      },
      patientIdentity: null,
    });
    expect(clinicalCase.patientName).toBeNull();
    expect(clinicalCase.age).toBeNull();
    expect(clinicalCase.allergies).toBeUndefined(); // UNKNOWN status, no items -> not a confirmed "no allergies"
  });

  // Real case ingests into the same store the seeded demo cases live in, and coexists with them.
  it("ingestIntakeCase upserts into the same case store the demo cases use, without removing them", async () => {
    const session = await createAndAnswerSession();
    const clinicalCase = await loadCaseFromIntakeSession(session.id, deps);
    store.ingestIntakeCase(clinicalCase);
    expect(store.getCase(clinicalCase.id)).toEqual(clinicalCase);
    expect(store.getCase("CASE-2001")).not.toBeNull(); // seeded demo case, untouched

    const summary = store.generateSummaryForCase(clinicalCase.id, { id: "doc-1", name: "Dr Test", role: "DOCTOR" });
    expect(summary.sections.chiefComplaint).toBe("Chest pain for two days");
  });
});
