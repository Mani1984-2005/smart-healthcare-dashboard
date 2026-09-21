import { test } from "node:test";
import assert from "node:assert/strict";
import { contextSchema, analyzeRequestSchema, reviewRequestSchema, isValidClinicalDate } from "../contracts/schemas.js";
import { DEMO_SCENARIOS } from "../data/demoScenarios.js";
import { scenario } from "./helpers.js";

const base = () => ({ patient: { id: "T-1" } });

test("all six synthetic demo scenarios satisfy the data contract", () => {
  assert.equal(DEMO_SCENARIOS.length, 6);
  for (const s of DEMO_SCENARIOS) assert.ok(contextSchema.safeParse(s.context).success, s.id);
});

test("minimal context defaults every section to 'not_provided' (never to 'none')", () => {
  const r = contextSchema.parse(base());
  for (const k of ["allergies", "medications", "history"]) assert.deepEqual(r[k], { status: "not_provided", items: [] });
  assert.deepEqual(r.encounters, []);
});

test("empty / non-object input is rejected", () => {
  for (const bad of [undefined, null, "", 5, [], {}]) assert.equal(contextSchema.safeParse(bad).success, false);
});

test("unknown keys are rejected, including smuggled review fields", () => {
  for (const extra of [{ reviewStatus: "approved" }, { approvedBy: "Dr X" }, { reviewedBy: "x" }]) {
    assert.equal(contextSchema.safeParse({ ...base(), ...extra }).success, false);
  }
  const c = scenario("CI-DEMO-001"); c.encounters[0].reviewed = true;
  assert.equal(contextSchema.safeParse(c).success, false);
});

test("invalid dates are rejected (impossible day, wrong format, bad time)", () => {
  for (const d of ["2026-02-31", "2026-13-01", "20260101", "yesterday", "2026-01-01T25:00", "1800-01-01", ""]) assert.equal(isValidClinicalDate(d), false, d);
  for (const d of ["2026-02-28", "2024-02-29", "2026-09-15T10:30", "2026-09-15T10:30:00Z", "2026-09-15T10:30:00+05:30"]) assert.equal(isValidClinicalDate(d), true, d);
  const c = scenario("CI-DEMO-001"); c.encounters[0].date = "2026-02-31";
  assert.equal(contextSchema.safeParse(c).success, false);
});

test("malformed values are rejected (string where number expected, NaN, Infinity)", () => {
  const c = scenario("CI-DEMO-001"); c.encounters[0].vitals.heartRate.value = "seventy";
  assert.equal(contextSchema.safeParse(c).success, false);
  const d = scenario("CI-DEMO-001"); d.encounters[0].vitals.heartRate.value = Infinity;
  assert.equal(contextSchema.safeParse(d).success, false);
  const e = scenario("CI-DEMO-001"); e.patient.ageYears = -3;
  assert.equal(contextSchema.safeParse(e).success, false);
});

test("symptom 'present' must be stated explicitly", () => {
  const c = scenario("CI-DEMO-001"); delete c.encounters[0].symptoms[0].present;
  assert.equal(contextSchema.safeParse(c).success, false);
});

test("record lists cannot contradict their own status", () => {
  const a = base(); a.allergies = { status: "documented", items: [] };
  const b = base(); b.allergies = { status: "none_known", items: [{ substance: "Penicillin" }] };
  const c = base(); c.medications = { status: "not_provided", items: [{ name: "X", status: "active" }] };
  for (const bad of [a, b, c]) assert.equal(contextSchema.safeParse(bad).success, false);
});

test("extremely long free text is rejected", () => {
  const c = scenario("CI-DEMO-001"); c.encounters[0].notes = "x".repeat(5001);
  assert.equal(contextSchema.safeParse(c).success, false);
  const d = scenario("CI-DEMO-001"); d.encounters[0].chiefComplaint = "y".repeat(501);
  assert.equal(contextSchema.safeParse(d).success, false);
});

test("duplicate encounter ids are rejected", () => {
  const c = scenario("CI-DEMO-002"); c.encounters[1].id = c.encounters[0].id;
  assert.equal(contextSchema.safeParse(c).success, false);
});

test("reference ranges: needs a bound, low must not exceed high, source must be lab_reported", () => {
  const mk = (r) => { const c = scenario("CI-DEMO-001"); c.investigations[0].referenceRange = r; return contextSchema.safeParse(c).success; };
  assert.equal(mk({ source: "lab_reported" }), false);
  assert.equal(mk({ low: 10, high: 5, source: "lab_reported" }), false);
  assert.equal(mk({ low: 1, high: 5, source: "assumed" }), false);
  assert.equal(mk({ low: 1, high: 5, source: "lab_reported" }), true);
});

test("analyze request: exactly one of patientId / context", () => {
  assert.equal(analyzeRequestSchema.safeParse({}).success, false);
  assert.equal(analyzeRequestSchema.safeParse({ patientId: "A", context: base() }).success, false);
  assert.equal(analyzeRequestSchema.safeParse({ patientId: "A" }).success, true);
  assert.equal(analyzeRequestSchema.safeParse({ context: base() }).success, true);
  assert.equal(analyzeRequestSchema.safeParse({ patientId: "../etc/passwd" }).success, false);
});

test("review request: reviewer identity is not accepted from the client; rejection needs a note; modify needs text", () => {
  assert.equal(reviewRequestSchema.safeParse({ itemId: "summary", decision: "accepted", reviewer: "Dr Fake" }).success, false);
  assert.equal(reviewRequestSchema.safeParse({ itemId: "summary", decision: "accepted", reviewedAt: "2026-01-01" }).success, false);
  assert.equal(reviewRequestSchema.safeParse({ itemId: "summary", decision: "rejected" }).success, false);
  assert.equal(reviewRequestSchema.safeParse({ itemId: "summary", decision: "modified" }).success, false);
  assert.equal(reviewRequestSchema.safeParse({ itemId: "summary", decision: "accepted", modifiedText: "x" }).success, false);
  assert.equal(reviewRequestSchema.safeParse({ itemId: "summary", decision: "rejected", note: "not relevant" }).success, true);
  assert.equal(reviewRequestSchema.safeParse({ itemId: "summary", decision: "approved" }).success, false);
});
