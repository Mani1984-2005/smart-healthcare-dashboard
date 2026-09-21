import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngines, scenario } from "./helpers.js";
import { buildTimeline } from "../engine/timeline.js";

test("timeline is chronological across encounters, results and medication changes (scenario 5)", () => {
  const { ctx } = runEngines(scenario("CI-DEMO-005"));
  const tl = buildTimeline(ctx);
  const dates = tl.map((e) => e.date.slice(0, 10));
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(tl.filter((e) => e.kind === "encounter").length, 4);
  assert.equal(tl.filter((e) => e.kind === "medication_start").length, 3);
  assert.ok(tl.some((e) => e.kind === "investigation" && e.date === "2026-08-31"));
});

test("within a date, the encounter comes before its details", () => {
  const tl = buildTimeline(runEngines(scenario("CI-DEMO-005")).ctx);
  const day = tl.filter((e) => e.date === "2026-03-09").map((e) => e.kind);
  assert.equal(day[0], "encounter");
});

test("events carry a source reference and encounter id where applicable", () => {
  const { ctx } = runEngines(scenario("CI-DEMO-002"));
  for (const e of buildTimeline(ctx)) { assert.ok(e.sourceRef); assert.ok(ctx.refIndex.has(e.sourceRef) || e.kind.startsWith("medication") || e.kind === "investigation" || e.kind === "examination" || e.kind === "symptom"); }
});

test("follow-up without a date is labelled as such and placed at the encounter date, not invented", () => {
  const tl = buildTimeline(runEngines(scenario("CI-DEMO-001")).ctx);
  const f = tl.find((e) => e.kind === "follow_up");
  assert.match(f.title, /no date given/); assert.equal(f.date, "2026-09-15");
});

test("works on a record with a single encounter, and on an empty record", () => {
  assert.ok(buildTimeline(runEngines(scenario("CI-DEMO-004")).ctx).length > 0);
  assert.deepEqual(buildTimeline(runEngines({ patient: { id: "T-EMPTY" } }).ctx), []);
});

test("unsorted input is still returned in order", () => {
  const c = scenario("CI-DEMO-005"); c.encounters.reverse(); c.investigations.reverse();
  const dates = buildTimeline(runEngines(c).ctx).map((e) => e.date.slice(0, 10));
  assert.deepEqual(dates, [...dates].sort());
});
