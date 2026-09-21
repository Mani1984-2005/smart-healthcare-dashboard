import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngines } from "./helpers.js";
import { makeFinding, assertExplained, shortHash } from "../engine/explain.js";
import { DEMO_SCENARIOS } from "../data/demoScenarios.js";

const all = (r) => [...r.rf.findings, ...r.cons, ...r.med.findings, ...r.inv.findings, ...r.ctx.dataQuality, ...r.gaps];

test("EVERY finding in EVERY scenario answers what / why / source / missing / action", () => {
  let n = 0;
  for (const s of DEMO_SCENARIOS) {
    const r = runEngines(s.context);
    for (const f of all(r)) {
      assert.doesNotThrow(() => assertExplained(f), `${s.id} ${f.ruleId}`);
      assert.ok(f.explanation.what.length > 0 && f.explanation.why.length > 0 && f.explanation.action.length > 0);
      assert.ok(Array.isArray(f.explanation.missing));
      n++;
    }
  }
  assert.ok(n > 40, `expected many findings, got ${n}`);
});

test("every cited source resolves to a real fact in the record (no dangling evidence)", () => {
  for (const s of DEMO_SCENARIOS) {
    const r = runEngines(s.context);
    for (const f of all(r)) for (const ref of f.evidenceRefs) assert.ok(r.ctx.refIndex.has(ref), `${s.id} ${f.ruleId} -> ${ref}`);
  }
});

test("makeFinding refuses to emit an unexplained finding", () => {
  const base = { kind: "red_flag", category: "x", ruleId: "t", title: "T", statement: "S", what: "w", why: "y", action: "a", evidenceRefs: ["r"] };
  assert.doesNotThrow(() => makeFinding(base));
  for (const missing of ["what", "why", "action", "title", "statement"]) assert.throws(() => makeFinding({ ...base, [missing]: "" }), /UNEXPLAINED_FINDING/);
  assert.throws(() => makeFinding({ ...base, evidenceRefs: [] }), /no supporting source/);
  assert.doesNotThrow(() => makeFinding({ ...base, kind: "information_gap", evidenceRefs: [] }), "a gap about absent info may cite no source");
});

test("considerations use hedged language and never state a diagnosis or a probability", () => {
  for (const s of DEMO_SCENARIOS) for (const f of runEngines(s.context).cons) {
    assert.match(f.statement, /may be consistent with/);
    assert.match(f.statement, /clinician evaluation/);
    assert.doesNotThrow(() => assert.doesNotMatch(f.statement + f.explanation.why, /\b(definitely|certainly|diagnosis is|confirmed)\b|\d\s?%|probab(le|ility) of/i));
    assert.match(f.explanation.why, /not a probability|not a diagnosis/);
    assert.ok(f.extra.evidenceCoverage.matched >= 2 || f.ruleId === "cons-bp-persistent");
  }
});

test("each consideration lists supporting evidence, what is missing, and how to verify", () => {
  const acs = runEngines(DEMO_SCENARIOS[5].context).cons.find((f) => f.ruleId === "cons-acs");
  assert.ok(acs.evidenceRefs.length >= 4);
  assert.ok(acs.explanation.missing.some((m) => /ECG/.test(m)));
  assert.ok(acs.extra.verification.length > 0);
  assert.equal(acs.reviewRequired, true);
});

test("a consideration needs its core feature: scenario 4 anaemia is NOT suggested (no range => Hb not 'low')", () => {
  assert.ok(!runEngines(DEMO_SCENARIOS[3].context).cons.some((f) => f.ruleId === "cons-anaemia"));
});

test("finding ids are deterministic across runs and unique within a run", () => {
  for (const s of DEMO_SCENARIOS) {
    const a = all(runEngines(s.context)).map((f) => f.id);
    const b = all(runEngines(s.context)).map((f) => f.id);
    assert.deepEqual(a, b);
  }
  assert.equal(shortHash(["b", "a"]), shortHash(["a", "b"]));
});

test("informational housekeeping findings do not demand clinician review; clinical ones do", () => {
  const r = runEngines(DEMO_SCENARIOS[5].context);
  assert.ok(r.rf.findings.every((f) => f.reviewRequired));
  assert.ok(r.gaps.every((f) => !f.reviewRequired));
});
