import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngines, scenario, ids } from "./helpers.js";
import { DEMO_SCENARIOS } from "../data/demoScenarios.js";

const lines = (summary) => Object.values(summary).filter((s) => s && typeof s === "object" && Array.isArray(s.items)).flatMap((s) => s.items);

test("every summary line is traceable: its source refs exist in the record", () => {
  for (const s of DEMO_SCENARIOS) {
    const { summary, ctx } = runEngines(s.context);
    for (const line of lines(summary)) { assert.ok(line.sourceRefs.length > 0); for (const r of line.sourceRefs) assert.ok(ctx.refIndex.has(r), `${s.id}: ${r}`); }
  }
});

test("summary is labelled record-derived and never contains an AI narrative by itself", () => {
  const { summary } = runEngines(scenario("CI-DEMO-002"));
  assert.equal(summary.origin, "record");
  assert.equal(summary.aiNarrative, undefined);
});

test("incomplete record (scenario 4): unknown sections read 'Not provided' — nothing is invented", () => {
  const { summary } = runEngines(scenario("CI-DEMO-004"));
  for (const k of ["vitals", "examination", "relevantHistory", "currentMedications", "allergies", "followUp"]) {
    assert.equal(summary[k].status, "not_provided", k);
    assert.equal(summary[k].display, "Not provided", k);
    assert.deepEqual(summary[k].items, []);
  }
});

test("'none known' is displayed differently from 'not provided'", () => {
  const { summary } = runEngines(scenario("CI-DEMO-001"));
  assert.equal(summary.allergies.status, "none_known");
  assert.match(summary.allergies.display, /No known allergies/);
  assert.notEqual(summary.allergies.status, "not_provided");
});

test("no encounters: the summary states that instead of guessing", () => {
  const { summary, gaps } = runEngines({ patient: { id: "T-EMPTY" } });
  assert.equal(summary.presentingComplaint.status, "not_provided");
  assert.equal(summary.asOf, null);
  assert.ok(ids(gaps).includes("gap-no-encounter"));
});

test("scenario 4 lists the expected information gaps and explains what was not checked", () => {
  const { gaps } = runEngines(scenario("CI-DEMO-004"));
  for (const r of ["gap-age", "gap-allergies", "gap-meds", "gap-history", "gap-vitals", "gap-exam", "gap-redflag-not-evaluated"]) assert.ok(ids(gaps).includes(r), r);
  assert.match(gaps.find((g) => g.ruleId === "gap-allergies").explanation.why, /NOT performed/);
});

test("scenario 4 keeps its contradictory and duplicate entries visible as data-quality findings", () => {
  const { ctx } = runEngines(scenario("CI-DEMO-004"));
  assert.deepEqual(ids(ctx.dataQuality).sort(), ["dq-contradictory-symptom", "dq-duplicate-symptom"]);
});

test("uncertainty handling: the incomplete record yields NO considerations and NO red flags", () => {
  const { cons, rf } = runEngines(scenario("CI-DEMO-004"));
  assert.deepEqual(cons, []); assert.deepEqual(rf.findings, []);
});

test("follow-up items come from the record only", () => {
  const { summary } = runEngines(scenario("CI-DEMO-005"));
  assert.equal(summary.followUp.items.length, 3, "E1, E2 and E4 have follow-up instructions; E3 has none");
  assert.match(summary.followUp.items.at(-1).text, /by 2026-08-31/);
});

test("normal scenario stays quiet: no findings other than nothing at all", () => {
  const { rf, med, cons, inv, gaps, ctx } = runEngines(scenario("CI-DEMO-001"));
  assert.equal(rf.findings.length + med.findings.length + cons.length + inv.findings.length + gaps.length + ctx.dataQuality.length, 0);
});
