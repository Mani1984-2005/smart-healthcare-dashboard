// backend/tests/intakeToClinicalIntelligenceProvider.test.js
//
// Tests for the Part 1 -> Part 4 bridge
// (backend/integration/intakeToClinicalIntelligenceProvider.js).
// Uses Part 1's own in-memory test fixture, exactly as the Part 1 -> Part 5
// bridge's tests do (backend/tests/intakeRecordAdapter.test.js), and runs
// under vitest like every other file in this directory.

import { describe, it, expect } from "vitest";
import * as intakeService from "../services/intakeService.js";
import { createInMemoryStore } from "./fixtures/inMemoryStore.js";
import {
  IntakeContextProvider,
  mapClinicalHistoryToContext,
} from "../integration/intakeToClinicalIntelligenceProvider.js";
import { DemoContextProvider } from "../clinical-intelligence/providers/contextProvider.js";
import { contextSchema } from "../clinical-intelligence/contracts/schemas.js";
import { Part3Store } from "../part3/models/store.js";

function deps() {
  return createInMemoryStore({ existingPatientIds: ["patient-ci-1"] });
}

async function completedSession(d) {
  const { session } = await intakeService.createSession({ patientId: "patient-ci-1", staffUid: "staff-1" }, d);
  await intakeService.submitAnswer(session.id, { questionId: "chiefComplaint.text", rawValue: "Fever for three days" }, d);
  await intakeService.submitAnswer(session.id, { questionId: "medications.current", rawValue: "Paracetamol 500mg" }, d);
  await intakeService.submitAnswer(session.id, { questionId: "allergies.status", rawValue: "no" }, d);
  await intakeService.completeSession(session.id, d);
  return session;
}

describe("Part 1 -> Part 4 intake context provider bridge", () => {
  it("mapClinicalHistoryToContext produces a context that passes Part 4's own strict schema", async () => {
    const d = deps();
    const created = await completedSession(d);
    const { session, history } = await intakeService.exportSession(created.id, d);
    const context = mapClinicalHistoryToContext({ session, history });
    const parsed = contextSchema.parse(context); // throws on any schema violation
    expect(parsed.patient.id).toBe("patient-ci-1");
    expect(parsed.encounters[0].chiefComplaint).toBe("Fever for three days");
    expect(parsed.medications.status).toBe("documented");
    expect(parsed.allergies.status).toBe("none_known"); // explicitly denied
    expect(parsed.investigations).toEqual([]); // never fabricated
  });

  it("get(): demo patients are delegated to the base provider unchanged", async () => {
    const base = new DemoContextProvider();
    const provider = new IntakeContextProvider(base);
    const demoList = await base.list();
    const demoId = demoList[0].id;
    expect(await provider.get(demoId)).toEqual(await base.get(demoId));
  });

  it("get(): a real completed intake session is reachable as INTAKE-<sessionId>", async () => {
    const d = deps();
    const session = await completedSession(d);
    intakeService.__setDepsForTesting(d);
    try {
      const provider = new IntakeContextProvider();
      const context = await provider.get(`INTAKE-${session.id}`);
      expect(context).toBeTruthy();
      contextSchema.parse(context); // must still be schema-valid through the provider path
      expect(context.patient.id).toBe("patient-ci-1");
    } finally {
      intakeService.__setDepsForTesting(undefined);
    }
  });

  it("get(): an in-progress (not completed) session is not exposed", async () => {
    const d = deps();
    const { session } = await intakeService.createSession({ patientId: "patient-ci-1", staffUid: "staff-1" }, d);
    await intakeService.submitAnswer(session.id, { questionId: "chiefComplaint.text", rawValue: "x" }, d);
    intakeService.__setDepsForTesting(d);
    try {
      const provider = new IntakeContextProvider();
      expect(await provider.get(`INTAKE-${session.id}`)).toBeNull();
    } finally {
      intakeService.__setDepsForTesting(undefined);
    }
  });

  it("get(): an unknown id (not demo, no live DB here) fails closed to null, never throws", async () => {
    const provider = new IntakeContextProvider();
    expect(await provider.get("INTAKE-does-not-exist")).toBeNull();
    expect(await provider.get("not-an-intake-id-either")).toBeNull();
  });

  it("list(): still lists exactly the demo scenarios (Part 4's baseline is unregressed)", async () => {
    const base = new DemoContextProvider();
    const provider = new IntakeContextProvider(base);
    expect(await provider.list()).toEqual(await base.list());
  });

  it("Part 3 -> Part 4: mapClinicalHistoryToContext appends labeled OCR document evidence to encounter notes, never as a coded investigation", async () => {
    const d = deps();
    const created = await completedSession(d);
    const { session, history } = await intakeService.exportSession(created.id, d);
    const context = mapClinicalHistoryToContext({ session, history }, [
      { title: "lab_report — labs.png", text: "Haemoglobin 13.2 g/dL" },
    ]);
    const parsed = contextSchema.parse(context);
    expect(parsed.encounters[0].notes).toMatch(/\[Document — OCR text, unverified: lab_report — labs\.png\] Haemoglobin 13\.2 g\/dL/);
    expect(parsed.investigations).toEqual([]); // never promoted to a coded investigation
  });

  it("Part 3 -> Part 4: get() pulls in only this patient's completed-OCR documents, none pending/failed/another patient's", async () => {
    const d = deps();
    const session = await completedSession(d);
    intakeService.__setDepsForTesting(d);
    const part3Store = new Part3Store();
    const baseDoc = (overrides) => ({
      id: "doc_1", patientId: "patient-ci-1", docType: "lab_report", originalFilename: "labs.png", mimeType: "image/png",
      sizeBytes: 1, sha256: "s1", uploadedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
      uploadedBy: { id: "u1", role: "DOCTOR" }, origin: "USER_UPLOAD", synthetic: false, fixtureId: null,
      status: "UPLOADED", ...overrides,
    });
    part3Store.insertDocument(baseDoc({ id: "doc_done", status: "OCR_COMPLETED" }), Buffer.from("x"));
    part3Store.setOcrResult({ documentId: "doc_done", text: "Haemoglobin 13.2 g/dL", provider: { id: "mock" } });
    part3Store.insertDocument(baseDoc({ id: "doc_pending", status: "UPLOADED" }), Buffer.from("x"));
    part3Store.insertDocument(baseDoc({ id: "doc_other_patient", patientId: "someone-else", status: "OCR_COMPLETED" }), Buffer.from("x"));
    part3Store.setOcrResult({ documentId: "doc_other_patient", text: "Should never appear", provider: { id: "mock" } });

    try {
      const provider = new IntakeContextProvider();
      provider.setPart3Store(part3Store);
      const context = await provider.get(`INTAKE-${session.id}`);
      expect(context.encounters[0].notes).toMatch(/Haemoglobin 13\.2 g\/dL/);
      expect(context.encounters[0].notes).not.toMatch(/Should never appear/);
    } finally {
      intakeService.__setDepsForTesting(undefined);
    }
  });

  it("Part 3 -> Part 4: without setPart3Store, context building is unchanged from before this bridge existed", async () => {
    const d = deps();
    const session = await completedSession(d);
    intakeService.__setDepsForTesting(d);
    try {
      const provider = new IntakeContextProvider(); // setPart3Store never called
      const context = await provider.get(`INTAKE-${session.id}`);
      expect(context.encounters[0].notes ?? null).toBeNull();
    } finally {
      intakeService.__setDepsForTesting(undefined);
    }
  });
});
