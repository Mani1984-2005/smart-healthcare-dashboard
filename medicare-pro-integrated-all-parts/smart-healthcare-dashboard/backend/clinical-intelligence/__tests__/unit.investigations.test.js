import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngines, scenario, ids } from "./helpers.js";

const inv = (list) => { const c = scenario("CI-DEMO-001"); c.investigations = list; return runEngines(c); };
const R = (low, high) => ({ low, high, source: "lab_reported" });

test("classification uses ONLY the supplied range: within / above / below", () => {
  const { inv: a } = inv([
    { name: "A", value: 5, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" },
    { name: "B", value: 11, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" },
    { name: "C", value: 0.5, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" },
  ]);
  assert.deepEqual(a.results.map((r) => r.status), ["within_range", "above_range", "below_range"]);
});

test("boundary values are within range", () => {
  const { inv: a } = inv([{ name: "A", value: 10, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" }, { name: "B", value: 1, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" }]);
  assert.deepEqual(a.results.map((r) => r.status), ["within_range", "within_range"]);
});

test("one-sided ranges work (eGFR with only a lower bound)", () => {
  const { inv: a } = inv([{ name: "eGFR", value: 26, unit: "mL/min/1.73 m²", referenceRange: { low: 60, source: "lab_reported" }, collectedAt: "2026-09-01" }]);
  assert.equal(a.results[0].status, "below_range");
});

test("NEVER invents a range: a wildly abnormal haemoglobin without a range is not interpreted", () => {
  const { inv: a } = inv([{ name: "Hemoglobin", value: 2.1, unit: "g/dL", collectedAt: "2026-09-01" }]);
  assert.equal(a.results[0].status, "not_interpreted");
  assert.ok(!ids(a.findings).includes("inv-abnormal"));
  assert.ok(ids(a.findings).includes("inv-not-interpreted"));
});

test("missing unit, or non-numeric value => not interpreted with the reasons listed", () => {
  const { inv: a } = inv([
    { name: "X", value: 9, referenceRange: R(1, 10), collectedAt: "2026-09-01" },
    { name: "Y", value: "positive", unit: "n/a", referenceRange: R(1, 10), collectedAt: "2026-09-01" },
  ]);
  assert.deepEqual(a.results[0].reasons, ["unit not provided"]);
  assert.ok(a.results[1].reasons.includes("value is non-numeric"));
});

test("test name, value, unit, range and date are preserved exactly (no silent unit change)", () => {
  const { inv: a } = inv([{ name: "Glucose", value: 182, unit: "mg/dL", referenceRange: R(70, 99), collectedAt: "2026-09-10T08:30" }]);
  const r = a.results[0];
  assert.equal(r.name, "Glucose"); assert.equal(r.value, 182); assert.equal(r.unit, "mg/dL");
  assert.deepEqual(r.referenceRange, R(70, 99)); assert.equal(r.collectedAt, "2026-09-10T08:30");
});

test("scenario 2: creatinine crossed from within range to above; eGFR moved further below; HbA1c moved further above", () => {
  const { inv: a } = runEngines(scenario("CI-DEMO-002"));
  const t = Object.fromEntries(a.trends.map((x) => [x.name, x]));
  assert.match(t.Creatinine.rangeShift, /from within range to above range/);
  assert.match(t.eGFR.rangeShift, /further below range/);
  assert.match(t.HbA1c.rangeShift, /further above range/);
  assert.equal(t.Creatinine.direction, "increased");
  assert.equal(t.Creatinine.deltaAbs, 0.6);
  assert.equal(t.Creatinine.deltaPct, 46.15);
});

test("different units for the same test are NOT compared (no trend, data-quality finding instead)", () => {
  const { inv: a } = inv([
    { name: "Creatinine", value: 1.3, unit: "mg/dL", referenceRange: R(0.7, 1.3), collectedAt: "2026-05-01" },
    { name: "Creatinine", value: 150, unit: "µmol/L", referenceRange: R(60, 110), collectedAt: "2026-09-01" },
  ]);
  assert.equal(a.trends.length, 0);
  assert.ok(ids(a.findings).includes("dq-unit-mismatch"));
});

test("a single result has no trend; improving results do not raise a trend finding", () => {
  const one = inv([{ name: "A", value: 5, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" }]).inv;
  assert.equal(one.trends.length, 0);
  const better = inv([
    { name: "A", value: 20, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-05-01" },
    { name: "A", value: 15, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" },
  ]).inv;
  assert.match(better.trends[0].rangeShift, /toward the range/);
  assert.ok(!ids(better.findings).includes("inv-trend"));
});

test("abnormal finding is raised for the LATEST result only, and worded as needing context", () => {
  const { inv: a } = inv([
    { name: "A", value: 20, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-05-01" },
    { name: "A", value: 5, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" },
  ]);
  assert.ok(!ids(a.findings).includes("inv-abnormal"));
  const b = runEngines(scenario("CI-DEMO-002")).inv.findings.find((f) => f.ruleId === "inv-abnormal");
  assert.match(b.statement, /depends on context/);
});

test("test-name aliases group results (Hb / haemoglobin / hemoglobin)", () => {
  const { inv: a } = inv([
    { name: "Hb", value: 12, unit: "g/dL", referenceRange: R(12, 15), collectedAt: "2026-05-01" },
    { name: "Haemoglobin", value: 9, unit: "g/dL", referenceRange: R(12, 15), collectedAt: "2026-09-01" },
  ]);
  assert.equal(a.trends.length, 1);
});

test("exact duplicate results are flagged", () => {
  const r = { name: "A", value: 5, unit: "u", referenceRange: R(1, 10), collectedAt: "2026-09-01" };
  assert.ok(ids(inv([r, { ...r }]).ctx.dataQuality).includes("dq-duplicate-result"));
});

test("future-dated result is flagged, not silently accepted", () => {
  assert.ok(ids(inv([{ name: "A", value: 5, unit: "u", collectedAt: "2027-01-01" }]).ctx.dataQuality).includes("dq-future-result"));
});
