import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers.js";

let app, doctor, nurse, admin;
before(async () => { app = await startApp(); doctor = await app.login("DOCTOR", { displayName: "Dr. Test Reviewer" }); nurse = await app.login("NURSE"); admin = await app.login("ADMIN"); });
after(() => app.close());

const analyze = async (id = "CI-DEMO-006") => (await app.call("POST", "/analyze", { token: doctor, body: { patientId: id } })).json.analysis;
const review = (a, body, token = doctor) => app.call("POST", `/analyses/${a.analysisId}/review`, { token, body });

test("a new analysis starts as needs_review with every clinical item pending", async () => {
  const a = await analyze();
  assert.equal(a.reviewStatus, "needs_review");
  assert.equal(a.reviewProgress.completed, 0);
  assert.equal(a.summary.review.state, "needs_review");
  for (const f of a.findings) assert.equal(f.review.state, f.reviewRequired ? "needs_review" : "not_required");
});

test("full workflow: review every item (accept / reject / modify) → analysis becomes 'reviewed'", async () => {
  const a = await analyze("CI-DEMO-003");
  const decisions = ["accepted", "rejected", "modified"];
  let last;
  for (const [i, id] of a.reviewItems.entries()) {
    const d = decisions[i % 3];
    const body = { itemId: id, decision: d, ...(d === "rejected" ? { note: "Not clinically relevant" } : {}), ...(d === "modified" ? { modifiedText: "Clinician-edited wording", note: "Adjusted" } : {}) };
    last = await review(a, body);
    assert.equal(last.status, 201, `${id}: ${last.text}`);
  }
  assert.equal(last.json.analysis.reviewStatus, "reviewed");
  assert.equal(last.json.analysis.reviewProgress.completed, a.reviewItems.length);
});

test("reviewer identity and timestamp come from the verified session, never the request", async () => {
  const a = await analyze("CI-DEMO-001");
  const r = await review(a, { itemId: "summary", decision: "accepted" });
  const rv = r.json.analysis.summary.review;
  assert.equal(rv.reviewer.name, "Dr. Test Reviewer"); assert.equal(rv.reviewer.role, "DOCTOR");
  assert.match(rv.reviewer.id, /^demo-/); assert.match(rv.reviewedAt, /^2026-09-20T/);
  const spoof = await review(a, { itemId: "summary", decision: "accepted", reviewer: { name: "Chief Surgeon" } });
  assert.equal(spoof.status, 422);
  const spoof2 = await review(a, { itemId: "summary", decision: "accepted", reviewedAt: "2020-01-01T00:00:00Z" });
  assert.equal(spoof2.status, 422);
});

test("rejection needs a note; modification needs text; unknown decision / unknown item are refused", async () => {
  const a = await analyze("CI-DEMO-001");
  assert.equal((await review(a, { itemId: "summary", decision: "rejected" })).status, 422);
  assert.equal((await review(a, { itemId: "summary", decision: "modified" })).status, 422);
  assert.equal((await review(a, { itemId: "summary", decision: "approved" })).status, 422);
  const unk = await review(a, { itemId: "no-such-item", decision: "accepted" });
  assert.equal(unk.status, 422); assert.equal(unk.json.error.details[0].path, "itemId");
});

test("original output is never edited by a review: 'modified' stores the clinician's text ALONGSIDE", async () => {
  const a = await analyze("CI-DEMO-003");
  const target = a.findings.find((f) => f.reviewRequired);
  const r = await review(a, { itemId: target.id, decision: "modified", modifiedText: "Amoxicillin already stopped by prescriber", note: "context" });
  const after = r.json.analysis.findings.find((f) => f.id === target.id);
  assert.equal(after.review.decision, "modified"); assert.equal(after.review.modifiedText, "Amoxicillin already stopped by prescriber");
  assert.equal(after.statement, target.statement); assert.deepEqual(after.explanation, target.explanation); assert.equal(after.title, target.title);
});

test("re-review is allowed: latest decision wins and the full history stays in the audit trail", async () => {
  const a = await analyze("CI-DEMO-001");
  await review(a, { itemId: "summary", decision: "accepted" });
  const r = await review(a, { itemId: "summary", decision: "rejected", note: "changed my mind" });
  assert.equal(r.json.analysis.summary.review.decision, "rejected");
  const audit = await app.call("GET", `/analyses/${a.analysisId}/audit`, { token: doctor });
  assert.equal(audit.json.events.filter((e) => e.type === "review_submitted").length, 2);
});

test("audit trail records generation, access and review with actor, time and AI metadata — and only metadata", async () => {
  const a = await analyze("CI-DEMO-002");
  await app.call("GET", `/analyses/${a.analysisId}`, { token: nurse });
  await review(a, { itemId: "summary", decision: "accepted" });
  const r = await app.call("GET", `/analyses/${a.analysisId}/audit`, { token: doctor });
  assert.equal(r.status, 200);
  const types = r.json.events.map((e) => e.type);
  for (const t of ["analysis_generated", "analysis_viewed", "review_submitted"]) assert.ok(types.includes(t), t);
  const gen = r.json.events.find((e) => e.type === "analysis_generated");
  assert.ok(gen.actorId && gen.actorRole && gen.at && gen.inputHash && gen.ruleset);
  assert.ok("provider" in gen.ai);
  assert.doesNotMatch(r.text, /Rohan|Iyer|metformin|Fatigue|HbA1c/i, "audit contains no clinical content");
  assert.equal(r.json.analysis.inputHash, a.inputHash);
});

test("audit endpoint: DOCTOR and ADMIN yes; NURSE no", async () => {
  const a = await analyze("CI-DEMO-001");
  assert.equal((await app.call("GET", `/analyses/${a.analysisId}/audit`, { token: admin })).status, 200);
  assert.equal((await app.call("GET", `/analyses/${a.analysisId}/audit`, { token: nurse })).status, 403);
});

test("ADMIN can see audit metadata but not clinical content", async () => {
  const a = await analyze("CI-DEMO-001");
  assert.equal((await app.call("GET", `/analyses/${a.analysisId}`, { token: admin })).status, 403);
});

test("the store is bounded: oldest analyses are evicted", async () => {
  const small = await startApp({}, { CLINICAL_MAX_STORED_ANALYSES: "10" });
  try {
    const t = await small.login("DOCTOR");
    const first = (await small.call("POST", "/analyze", { token: t, body: { patientId: "CI-DEMO-001" } })).json.analysis;
    for (let i = 0; i < 10; i++) await small.call("POST", "/analyze", { token: t, body: { patientId: "CI-DEMO-001" } });
    assert.equal((await small.call("GET", `/analyses/${first.analysisId}`, { token: t })).status, 404);
  } finally { await small.close(); }
});
