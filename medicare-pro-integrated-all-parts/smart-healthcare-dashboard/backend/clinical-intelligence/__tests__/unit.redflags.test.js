import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngines, scenario, ids } from "./helpers.js";

test("demo scenario 6 raises the expected deterministic red flags with urgency", () => {
  const { rf } = runEngines(scenario("CI-DEMO-006"));
  const got = ids(rf.findings);
  for (const r of ["rf-chest-pain", "rf-vital-spo2", "rf-vital-respiratoryRate", "rf-vital-systolicBp", "rf-qsofa-style", "rf-severe-dyspnea"]) assert.ok(got.includes(r), r);
  const chest = rf.findings.find((f) => f.ruleId === "rf-chest-pain");
  assert.equal(chest.urgency, "immediate_review");
  assert.equal(rf.findings.find((f) => f.ruleId === "rf-severe-dyspnea").urgency, "prompt_review");
});

test("heart rate 112 (below the extreme band) does NOT raise a flag", () => {
  assert.ok(!ids(runEngines(scenario("CI-DEMO-006")).rf.findings).includes("rf-vital-heartRate"));
});

test("normal case raises no red flags and nothing is 'not evaluated'", () => {
  const { rf } = runEngines(scenario("CI-DEMO-001"));
  assert.deepEqual(rf.findings, []);
  assert.deepEqual(rf.notEvaluated, []);
});

test("chest pain alone is 'prompt', with associated features it is 'immediate'", () => {
  const c = scenario("CI-DEMO-006");
  c.encounters[0].symptoms = [{ name: "Chest pain", present: true }];
  assert.equal(runEngines(c).rf.findings.find((f) => f.ruleId === "rf-chest-pain").urgency, "prompt_review");
});

test("absent / unknown symptoms never trigger rules", () => {
  const c = scenario("CI-DEMO-006");
  c.encounters[0].symptoms = [{ name: "Chest pain", present: false }, { name: "Syncope", present: "unknown" }];
  assert.ok(!ids(runEngines(c).rf.findings).some((r) => r === "rf-chest-pain" || r === "rf-syncope"));
});

test("free text is NOT keyword-scanned: 'no chest pain' in the complaint cannot fire a rule", () => {
  const c = scenario("CI-DEMO-001");
  c.encounters[0].chiefComplaint = "Denies chest pain and breathlessness";
  c.encounters[0].notes = "no chest pain, chest pain resolved";
  assert.deepEqual(runEngines(c).rf.findings, []);
});

test("free-text complaint without a structured symptom does not create a flag either", () => {
  const c = scenario("CI-DEMO-001");
  c.encounters[0].chiefComplaint = "Severe chest pain";
  assert.deepEqual(runEngines(c).rf.findings, []);
});

test("missing age: vital-sign rules are NOT evaluated and this is stated", () => {
  const c = scenario("CI-DEMO-006"); delete c.patient.ageYears;
  const { rf } = runEngines(c);
  assert.ok(!ids(rf.findings).some((r) => r.startsWith("rf-vital")));
  assert.ok(rf.notEvaluated.some((m) => /Age not provided/.test(m)));
  assert.ok(ids(rf.findings).includes("rf-chest-pain"), "symptom rules still run");
});

test("paediatric patient: adult vital thresholds are not applied", () => {
  const c = scenario("CI-DEMO-006"); c.patient.ageYears = 9;
  const { rf } = runEngines(c);
  assert.ok(!ids(rf.findings).some((r) => r.startsWith("rf-vital")));
  assert.ok(rf.notEvaluated.some((m) => /under 16/.test(m)));
});

test("no vitals in latest encounter: reported as not evaluated, never assumed normal", () => {
  const c = scenario("CI-DEMO-006"); delete c.encounters[0].vitals;
  assert.ok(runEngines(c).rf.notEvaluated.some((m) => /No vital signs recorded/.test(m)));
});

test("vital with missing unit is not evaluated and produces a data-quality finding", () => {
  const c = scenario("CI-DEMO-006"); delete c.encounters[0].vitals.spo2.unit;
  const { rf, ctx } = runEngines(c);
  assert.ok(!ids(rf.findings).includes("rf-vital-spo2"));
  assert.ok(ids(ctx.dataQuality).includes("dq-vital-not-evaluable"));
});

test("implausible vital (SpO2 = 190 %) is treated as an entry error, not evaluated", () => {
  const c = scenario("CI-DEMO-006"); c.encounters[0].vitals.spo2.value = 190;
  const { rf, ctx } = runEngines(c);
  assert.ok(!ids(rf.findings).includes("rf-vital-spo2"));
  assert.ok(ctx.dataQuality.some((f) => /plausible/.test(f.explanation.what)));
});

test("temperature in °F is converted for rule evaluation only, and the conversion is disclosed", () => {
  const c = scenario("CI-DEMO-001"); c.encounters[0].vitals.temperature = { value: 103, unit: "°F" };
  const f = runEngines(c).rf.findings.find((x) => x.ruleId === "rf-vital-temperature");
  assert.ok(f, "39.4 °C should be flagged");
  assert.match(f.statement, /103 °F/);
  assert.match(f.statement, /after conversion/);
});

test("contradictory red-flag symptom: no rule fires, but a HIGH data-quality finding says so", () => {
  const c = scenario("CI-DEMO-006");
  c.encounters[0].symptoms = [{ name: "Chest pain", present: true }, { name: "Chest pain", present: false }];
  const { rf, ctx } = runEngines(c);
  assert.ok(!ids(rf.findings).includes("rf-chest-pain"));
  const dq = ctx.dataQuality.find((f) => f.ruleId === "dq-contradictory-symptom");
  assert.equal(dq.severity, "high");
  assert.match(dq.explanation.action, /under-reported/);
});

test("a symptom named like a negation but marked present is treated as ambiguous, not as present", () => {
  const c = scenario("CI-DEMO-006");
  c.encounters[0].symptoms = [{ name: "No chest pain", present: true }];
  const { rf, ctx } = runEngines(c);
  assert.ok(!ids(rf.findings).includes("rf-chest-pain"));
  assert.ok(ids(ctx.dataQuality).includes("dq-negated-symptom-name"));
});

test("stroke-like features, GI bleeding, fever+neck stiffness, syncope and thunderclap headache are covered", () => {
  const mk = (names) => { const c = scenario("CI-DEMO-001"); c.encounters[0].symptoms = names.map((n) => ({ name: n, present: true })); return ids(runEngines(c).rf.findings); };
  assert.ok(mk(["Slurred speech"]).includes("rf-neuro-deficit"));
  assert.ok(mk(["Black stool"]).includes("rf-gi-bleed"));
  assert.ok(mk(["Fever", "Stiff neck"]).includes("rf-fever-neck"));
  assert.ok(mk(["Fainting"]).includes("rf-syncope"));
  assert.ok(mk(["Sudden severe headache"]).includes("rf-thunderclap"));
});

test("only the LATEST encounter drives current red flags (old abnormal vitals do not re-fire)", () => {
  const c = scenario("CI-DEMO-006");
  const old = structuredClone(c.encounters[0]); old.id = "E0"; old.date = "2026-01-01";
  c.encounters = [old, { id: "E2", date: "2026-09-19T20:00", symptoms: [], vitals: scenario("CI-DEMO-001").encounters[0].vitals, examination: [] }];
  assert.deepEqual(runEngines(c).rf.findings.filter((f) => f.ruleId.startsWith("rf-vital") || f.ruleId === "rf-chest-pain"), []);
});

test("lab-reported critical limits fire only when the lab supplied them", () => {
  const c = scenario("CI-DEMO-002");
  const k = c.investigations.find((i) => i.name === "Potassium" && i.value === 5.4);
  assert.ok(!ids(runEngines(c).rf.findings).includes("rf-lab-critical"));
  k.referenceRange.criticalHigh = 5.3;
  const f = runEngines(c).rf.findings.find((x) => x.ruleId === "rf-lab-critical");
  assert.ok(f); assert.match(f.explanation.why, /supplied by the laboratory/);
});

test("every red flag carries signal, supporting data, reason, urgency and action", () => {
  for (const f of runEngines(scenario("CI-DEMO-006")).rf.findings) {
    assert.ok(f.title && f.statement && f.urgency && f.explanation.why && f.explanation.action && f.evidenceRefs.length > 0);
  }
});
