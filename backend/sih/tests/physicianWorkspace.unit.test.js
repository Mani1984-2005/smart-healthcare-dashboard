// backend/tests/physicianWorkspace.unit.test.js
//
// Part 5 — Physician AI Workspace — unit tests.
// Uses Node's built-in test runner (node:test) so Part 5 needs no new test
// dependency. Run with: node --test backend/tests

import test from "node:test";
import assert from "node:assert/strict";

import { generateClinicalSummary, AI_MODEL_ID } from "../services/physicianWorkspace/aiSummaryGenerator.js";
import * as store from "../services/physicianWorkspace/store.js";

const DOCTOR = { id: "doc-1", name: "Dr. Demo", role: "DOCTOR" };

test("aiSummaryGenerator: never fabricates missing fields", () => {
  const summary = generateClinicalSummary({
    presentingComplaint: "Headache",
    historyOfPresentIllness: "3 days of headache.",
    pastMedicalHistory: [],
    medications: [],
    allergies: [],
    // familyHistory, socialHistory, vitals, labResults intentionally omitted
  });

  assert.equal(summary.model, AI_MODEL_ID);
  assert.equal(summary.sections.familyHistory, "Not available");
  assert.equal(summary.sections.socialHistory, "Not available");
  assert.equal(summary.sections.vitals, "Not available");
  assert.match(summary.sections.investigations, /No laboratory investigations/);
  assert.match(summary.disclaimer, /Demo \/ Simulated AI/);
});

test("aiSummaryGenerator: flags urgent keywords without diagnosing", () => {
  const summary = generateClinicalSummary({
    presentingComplaint: "Sudden severe chest pain with breathlessness",
    historyOfPresentIllness: "Started 40 minutes ago.",
  });
  assert.ok(summary.flags.length > 0);
  assert.ok(summary.flags.some((f) => /chest pain/i.test(f)));
  // Must never claim a confirmed diagnosis.
  assert.ok(!Object.values(summary.sections).some((v) => /confirmed diagnosis/i.test(v)));
});

test("store: full physician workflow — generate, edit, approve", () => {
  store.resetStore();
  const cases = store.listCases();
  assert.ok(cases.length > 0);

  const caseId = cases[0].id;
  const summary = store.generateSummaryForCase(caseId, DOCTOR);
  assert.equal(summary.status, "AI_GENERATED");
  assert.equal(summary.currentVersion, 1);

  const edited = store.editSummary(summary.id, DOCTOR, { chiefComplaint: "Edited chief complaint." });
  assert.equal(edited.status, "PHYSICIAN_EDITED");
  assert.equal(edited.sections.chiefComplaint, "Edited chief complaint.");
  assert.equal(edited.currentVersion, 2);

  const approved = store.approveSummary(summary.id, DOCTOR);
  assert.equal(approved.status, "APPROVED");

  const versions = store.listVersions(summary.id);
  assert.equal(versions.length, 3); // generated, edited, approved
  assert.equal(versions[0].changeType, "AI_GENERATED");

  const audit = store.listAudit(summary.id);
  const actions = audit.map((a) => a.action);
  assert.deepEqual(actions, ["SUMMARY_GENERATED", "SUMMARY_EDITED", "SUMMARY_APPROVED"]);
});

test("store: rejection requires a reason", () => {
  store.resetStore();
  const caseId = store.listCases()[0].id;
  const summary = store.generateSummaryForCase(caseId, DOCTOR);

  assert.throws(() => store.rejectSummary(summary.id, DOCTOR, ""), /reason is required/);

  const rejected = store.rejectSummary(summary.id, DOCTOR, "Missing key history, please redo.");
  assert.equal(rejected.status, "REJECTED");
  assert.equal(rejected.revisionNote, "Missing key history, please redo.");
});

test("store: invalid transitions are rejected", () => {
  store.resetStore();
  const caseId = store.listCases()[0].id;
  const summary = store.generateSummaryForCase(caseId, DOCTOR);
  store.approveSummary(summary.id, DOCTOR);

  assert.throws(() => store.approveSummary(summary.id, DOCTOR), (err) => err.code === "INVALID_TRANSITION");
  assert.throws(() => store.editSummary(summary.id, DOCTOR, { chiefComplaint: "x" }), (err) => err.code === "INVALID_TRANSITION");
});

test("store: unknown case/summary ids raise not-found errors", () => {
  store.resetStore();
  assert.throws(() => store.generateSummaryForCase("CASE-DOES-NOT-EXIST", DOCTOR), (err) => err.code === "CASE_NOT_FOUND");
  assert.throws(() => store.editSummary("SUM-9999", DOCTOR, { chiefComplaint: "x" }), (err) => err.code === "SUMMARY_NOT_FOUND");
});

test("store: revise/regenerate produces a new version and resets decision fields", () => {
  store.resetStore();
  const caseId = store.listCases()[0].id;
  const summary = store.generateSummaryForCase(caseId, DOCTOR);
  store.editSummary(summary.id, DOCTOR, { chiefComplaint: "Edited." });

  const regenerated = store.regenerateSummary(summary.id, DOCTOR, "Please redo with fresh data.");
  assert.equal(regenerated.status, "AI_GENERATED");
  assert.equal(regenerated.editedBy, null);
  assert.equal(regenerated.currentVersion, 3);
});
