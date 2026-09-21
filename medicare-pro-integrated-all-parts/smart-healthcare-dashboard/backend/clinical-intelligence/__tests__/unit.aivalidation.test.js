import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAIResponse, AI_REJECTION as R } from "../safety/aiValidation.js";
import { deidentifyForAI } from "../safety/deidentify.js";
import { scenario, runEngines } from "./helpers.js";

const { parsed, ctx } = runEngines(scenario("CI-DEMO-002"));
const context = deidentifyForAI(parsed);
const allowedRefs = new Set(ctx.refIndex.keys());
const good = { narrative: "HbA1c was 8.9 on 2026-09-10 and the patient reports increased thirst.", citedRefs: ["inv:inv-2"], considerations: [] };
const check = (raw) => validateAIResponse(raw, { allowedRefs, context });
const withNarrative = (n) => ({ ...good, narrative: n });

test("accepts a well-formed, grounded, hedged response (object or JSON string, with code fences)", () => {
  assert.equal(check(good).ok, true);
  assert.equal(check(JSON.stringify(good)).ok, true);
  assert.equal(check("```json\n" + JSON.stringify(good) + "\n```").ok, true);
});

test("rejects malformed output: non-JSON, arrays, null, empty, oversized", () => {
  for (const bad of ["not json", "[]", null, "", "{", "x".repeat(20001), 42]) assert.equal(check(bad).code, R.MALFORMED, String(bad).slice(0, 12));
});

test("rejects schema violations and any unknown key (approval/review fields cannot ride along)", () => {
  assert.equal(check({ ...good, reviewStatus: "approved" }).code, R.SCHEMA);
  assert.equal(check({ ...good, approvedBy: "Dr Rao" }).code, R.SCHEMA);
  assert.equal(check({ ...good, decision: "accepted" }).code, R.SCHEMA);
  assert.equal(check({ narrative: "", citedRefs: ["inv:inv-2"] }).code, R.SCHEMA);
  assert.equal(check({ narrative: "ok", citedRefs: [] }).code, R.SCHEMA);
  assert.equal(check({ narrative: "ok" }).code, R.SCHEMA);
});

test("rejects citations that do not exist in the record", () => {
  assert.equal(check({ ...good, citedRefs: ["inv:made-up"] }).code, R.UNKNOWN_REF);
  assert.equal(check({ ...good, considerations: [{ condition: "X", supportingRefs: ["nope"], reasoning: "r" }] }).code, R.UNKNOWN_REF);
});

test("rejects definitive-diagnosis language", () => {
  for (const t of ["The patient definitely has renal failure.", "This is certainly diabetes.", "The diagnosis is confirmed.", "Patient has diabetic nephropathy.", "Diagnosed as CKD stage 4."]) {
    assert.equal(check(withNarrative(t)).code, R.DEFINITIVE_LANGUAGE, t);
  }
});

test("rejects prescriptive language", () => {
  for (const t of ["Prescribe insulin now.", "Start the patient on insulin.", "Discontinue metformin.", "Increase the dose of amlodipine.", "Administer fluids."]) {
    assert.equal(check(withNarrative(t)).code, R.PRESCRIPTIVE_LANGUAGE, t);
  }
});

test("rejects any claim of clinician approval or clinical validation", () => {
  for (const t of ["This summary is physician-approved.", "Approved by Dr Rao.", "Verified by a doctor.", "This has been clinically validated."]) {
    assert.equal(check(withNarrative(t)).code, R.APPROVAL_CLAIM, t);
  }
});

test("rejects fabricated numbers that are not in the record", () => {
  assert.equal(check(withNarrative("HbA1c was 11.4 on 2026-09-10.")).code, R.UNGROUNDED_NUMBER);
  assert.equal(check({ ...good, considerations: [{ condition: "Kidney disease", supportingRefs: ["inv:inv-2"], reasoning: "Creatinine of 7.7 is high." }] }).code, R.UNGROUNDED_NUMBER);
});

test("numbers that ARE in the record pass grounding", () => {
  assert.equal(check(withNarrative("Creatinine 1.9 and eGFR 26 were recorded.")).ok, true);
});

test("de-identification removes name, replaces the id, and keeps clinical facts", () => {
  const d = deidentifyForAI(parsed);
  assert.equal(d.patient.displayName, undefined);
  assert.match(d.patient.id, /^P-[0-9a-f]{10}$/);
  assert.notEqual(d.patient.id, parsed.patient.id);
  assert.doesNotMatch(JSON.stringify(d), /Rohan|Iyer|CI-DEMO/);
  assert.equal(d.investigations.length, parsed.investigations.length);
  assert.equal(parsed.patient.displayName, "Rohan Iyer (Demo)", "original object is not mutated");
});
