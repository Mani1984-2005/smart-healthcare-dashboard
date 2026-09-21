// backend/part6/tests/realRecordSource.test.js
//
// Tests for the Part 1 -> Part 6 RecordSource bridge
// (backend/part6/adapters/realRecordSource.js).
//
// This environment has no live Postgres (see backend/models/IntakeSession.js
// and every other Part 1 Postgres-access test/comment for the same,
// already-documented caveat), so the "real patient" / "real clinical
// record" paths cannot be exercised end-to-end here. What IS verified:
// composite delegation to the base (demo) source is unbroken (Test 11:
// existing Part 6 behavior must survive this bridge), and the real-data
// paths fail closed to "not found" / "no extra records" rather than
// throwing or fabricating data when no database is reachable — the same
// contract every other Part 1 data-access path in this codebase already
// has, exercised here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRepository } from "../store/repository.js";
import { createDemoRecordSource } from "../adapters/recordSource.js";
import { createRealRecordSource } from "../adapters/realRecordSource.js";
import { Part3Store } from "../../part3/models/store.js";
import { seedIfEmpty } from "../seed/seed.js";
import { createClock } from "../clock.js";
import { createAuditService } from "../audit/auditService.js";

function mkComposite() {
  const repo = createRepository({ mode: "memory" });
  const clock = createClock(repo);
  const audit = createAuditService({ repo, clock });
  seedIfEmpty({ repo, clock, audit });
  const demo = createDemoRecordSource(repo);
  return { demo, real: createRealRecordSource(demo) };
}

test("Test 11 (regression): demo patient lookup is unchanged through the composite source", async () => {
  const { demo, real } = mkComposite();
  const viaReal = await real.getPatient("MCP-DEMO-001");
  const viaDemo = demo.getPatient("MCP-DEMO-001");
  assert.deepEqual(viaReal, viaDemo);
});

test("Test 11 (regression): demo clinical records for a demo patient are unchanged (no real records mixed in for a demo-only id)", async () => {
  const { demo, real } = mkComposite();
  const viaReal = await real.getClinicalRecords("MCP-DEMO-001");
  const viaDemo = demo.getClinicalRecords("MCP-DEMO-001");
  // Same demo records present; any additional entries would only be real
  // DOC-INTAKE-* records, none of which exist for this id without a DB.
  for (const rec of viaDemo) {
    assert.ok(viaReal.some((r) => r.id === rec.id));
  }
});

test("Test 11 (regression): organizations/practitioners/identity links still delegate to the base source unchanged", async () => {
  const { demo, real } = mkComposite();
  assert.deepEqual(await real.getOrganization("ORG-DEMO-001"), demo.getOrganization("ORG-DEMO-001"));
  assert.deepEqual(real.listOrganizations(), demo.listOrganizations());
  assert.deepEqual(await real.getPractitioner("PRAC-DEMO-001"), demo.getPractitioner("PRAC-DEMO-001"));
  assert.deepEqual(await real.getIdentityLink("MCP-DEMO-001"), demo.getIdentityLink("MCP-DEMO-001"));
});

test("Part 3 -> Part 6: a document with completed OCR is bridged as a document-type record", async () => {
  const { demo } = mkComposite();
  const part3Store = new Part3Store();
  const real = createRealRecordSource(demo, { part3Store });
  part3Store.insertDocument(
    {
      id: "doc_test01",
      patientId: "MCP-DEMO-001",
      docType: "lab_report",
      originalFilename: "labs.png",
      mimeType: "image/png",
      sizeBytes: 10,
      sha256: "abc",
      uploadedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      uploadedBy: { id: "u1", role: "DOCTOR" },
      origin: "USER_UPLOAD",
      synthetic: false,
      fixtureId: null,
      status: "OCR_COMPLETED",
    },
    Buffer.from("x")
  );
  part3Store.setOcrResult({ documentId: "doc_test01", text: "Haemoglobin 13.2 g/dL" });

  const records = await real.getClinicalRecords("MCP-DEMO-001");
  const bridged = records.find((r) => r.id === "DOC-P3-doc_test01");
  assert.ok(bridged, "expected the completed-OCR document to be bridged");
  assert.match(bridged.text, /Haemoglobin 13\.2 g\/dL/);
});

test("Part 3 -> Part 6: a document with no completed OCR (uploaded/failed/empty) is never bridged", async () => {
  const { demo } = mkComposite();
  const part3Store = new Part3Store();
  const real = createRealRecordSource(demo, { part3Store });
  for (const [id, status] of [["doc_a", "UPLOADED"], ["doc_b", "OCR_FAILED"], ["doc_c", "OCR_EMPTY"]]) {
    part3Store.insertDocument(
      {
        id, patientId: "MCP-DEMO-001", docType: "lab_report", originalFilename: "x.png", mimeType: "image/png",
        sizeBytes: 1, sha256: id, uploadedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
        uploadedBy: { id: "u1", role: "DOCTOR" }, origin: "USER_UPLOAD", synthetic: false, fixtureId: null, status,
      },
      Buffer.from("x")
    );
  }
  const records = await real.getClinicalRecords("MCP-DEMO-001");
  assert.equal(records.some((r) => r.id.startsWith("DOC-P3-")), false);
});

test("Part 3 -> Part 6: without a part3Store passed in, getClinicalRecords behaves exactly as before (no crash, no P3 records)", async () => {
  const { demo } = mkComposite();
  const real = createRealRecordSource(demo); // no options — matches the Part 1 -> Part 6 bridge's own existing tests
  const records = await real.getClinicalRecords("MCP-DEMO-001");
  assert.equal(records.some((r) => r.id.startsWith("DOC-P3-")), false);
});

test("an unknown (non-demo, non-DB-backed) patient id fails closed to null rather than fabricating a record", async () => {
  const { real } = mkComposite();
  // No live Postgres in this environment -> the real-patient lookup itself
  // fails and is caught, matching every other Part 1 Postgres-access path's
  // documented "no live DB here" behavior; the composite must not throw.
  const patient = await real.getPatient("some-real-patient-id-not-in-demo-seed");
  assert.equal(patient, null);
});

test("clinical records for an unknown patient id return only demo records for that id (none, here), never throwing", async () => {
  const { real } = mkComposite();
  const records = await real.getClinicalRecords("some-real-patient-id-not-in-demo-seed");
  assert.deepEqual(records, []);
});
