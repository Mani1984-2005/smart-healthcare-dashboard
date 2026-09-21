import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp, scenario } from "./helpers.js";
import { loadConfig } from "../config.js";

let app, doctor, nurse;
before(async () => { app = await startApp(); doctor = await app.login("DOCTOR"); nurse = await app.login("NURSE"); });
after(() => app.close());

test("GET /status is public, non-sensitive, and reports demo mode", async () => {
  const r = await app.call("GET", "/status");
  assert.equal(r.status, 200);
  assert.equal(r.json.demoMode, true);
  assert.doesNotMatch(r.text, /key|secret|token/i);
});

test("lists the six synthetic demo patients", async () => {
  const r = await app.call("GET", "/demo/patients", { token: doctor });
  assert.equal(r.status, 200);
  assert.equal(r.json.patients.length, 6);
  assert.ok(r.json.patients.every((p) => p.synthetic === true && p.id.startsWith("CI-DEMO-")));
});

test("analyze each demo scenario end-to-end (API → service → engines) and return a complete analysis", async () => {
  for (let i = 1; i <= 6; i++) {
    const r = await app.call("POST", "/analyze", { token: doctor, body: { patientId: `CI-DEMO-00${i}` } });
    assert.equal(r.status, 201, `scenario ${i}`);
    const a = r.json.analysis;
    for (const k of ["analysisId", "summary", "findings", "investigations", "medicationChecks", "timeline", "ai", "disclaimer", "inputHash", "ruleset", "reviewItems"]) assert.ok(k in a, `${i}: ${k}`);
    assert.equal(a.reviewStatus, "needs_review");
    assert.equal(a.mode, "demo");
    assert.match(a.disclaimer, /not a diagnosis/);
    assert.equal(a.ai.status, "not_requested");
  }
});

test("scenario 6 API result surfaces red flags first, with evidence resolved to readable text", async () => {
  const a = (await app.call("POST", "/analyze", { token: doctor, body: { patientId: "CI-DEMO-006" } })).json.analysis;
  assert.equal(a.findings[0].kind, "red_flag");
  const chest = a.findings.find((f) => f.ruleId === "rf-chest-pain");
  assert.ok(chest.evidence.some((e) => /Chest pain: present, severe, 40 minutes/.test(e.label)));
  assert.ok(chest.explanation.missing.includes("ECG"));
});

test("analyze an ad-hoc clinician-entered context", async () => {
  const c = scenario("CI-DEMO-003"); c.patient.id = "ADHOC-1"; c.patient.displayName = "Adhoc Test";
  const r = await app.call("POST", "/analyze", { token: doctor, body: { context: c } });
  assert.equal(r.status, 201);
  assert.equal(r.json.analysis.origin, "user_entered");
  assert.ok(r.json.analysis.findings.some((f) => f.ruleId === "med-allergy-conflict"));
});

test("invalid context → 422 with paths only; submitted values are never echoed back", async () => {
  const c = scenario("CI-DEMO-001"); c.patient.displayName = "SECRET-NAME-XYZ"; c.encounters[0].date = "2026-02-31"; c.allergies = { status: "banana", items: [] };
  const r = await app.call("POST", "/analyze", { token: doctor, body: { context: c } });
  assert.equal(r.status, 422);
  assert.equal(r.json.error.code, "VALIDATION_FAILED");
  assert.ok(r.json.error.details.some((d) => d.path.includes("encounters")));
  assert.doesNotMatch(r.text, /SECRET-NAME-XYZ|banana/);
  assert.ok(r.json.error.requestId);
});

test("both / neither of patientId+context → 422; unknown patient → 404; bad id → 422", async () => {
  assert.equal((await app.call("POST", "/analyze", { token: doctor, body: {} })).status, 422);
  assert.equal((await app.call("POST", "/analyze", { token: doctor, body: { patientId: "CI-DEMO-001", context: scenario("CI-DEMO-001") } })).status, 422);
  assert.equal((await app.call("POST", "/analyze", { token: doctor, body: { patientId: "NOPE-1" } })).status, 404);
  assert.equal((await app.call("POST", "/analyze", { token: doctor, body: { patientId: "../../etc/passwd" } })).status, 422);
});

test("oversized body → 413, malformed JSON → 400, both as structured errors (no stack traces)", async () => {
  const big = await app.call("POST", "/analyze", { token: doctor, raw: JSON.stringify({ context: { pad: "x".repeat(300 * 1024) } }) });
  assert.equal(big.status, 413); assert.equal(big.json.error.code, "PAYLOAD_TOO_LARGE");
  const bad = await app.call("POST", "/analyze", { token: doctor, raw: "{not json" });
  assert.equal(bad.status, 400); assert.equal(bad.json.error.code, "INVALID_JSON");
  for (const r of [big, bad]) assert.doesNotMatch(r.text, /\n\s+at |node_modules|\.js:\d+/);
});

test("unknown route under the module → structured 404", async () => {
  const r = await app.call("GET", "/nope", { token: doctor });
  assert.equal(r.status, 404); assert.equal(r.json.error.code, "NOT_FOUND");
});

test("timeline endpoint returns the chronological timeline for a patient", async () => {
  const r = await app.call("GET", "/timeline/CI-DEMO-005", { token: nurse });
  assert.equal(r.status, 200);
  const dates = r.json.timeline.map((e) => e.date.slice(0, 10));
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(r.json.timeline.filter((e) => e.kind === "encounter").length, 4);
  assert.equal((await app.call("GET", "/timeline/NOPE-1", { token: nurse })).status, 404);
});

test("patient context endpoint returns the validated record", async () => {
  const r = await app.call("GET", "/patients/CI-DEMO-002/context", { token: doctor });
  assert.equal(r.status, 200); assert.equal(r.json.context.patient.id, "CI-DEMO-002");
  assert.equal(r.json.context.medications.status, "documented");
});

test("GET /analyses/:id round-trips; malformed id → 404", async () => {
  const a = (await app.call("POST", "/analyze", { token: doctor, body: { patientId: "CI-DEMO-002" } })).json.analysis;
  const g = await app.call("GET", `/analyses/${a.analysisId}`, { token: nurse });
  assert.equal(g.status, 200); assert.equal(g.json.analysis.analysisId, a.analysisId);
  assert.equal((await app.call("GET", "/analyses/not-a-uuid", { token: nurse })).status, 404);
  assert.equal((await app.call("GET", "/analyses/00000000-0000-0000-0000-000000000000", { token: nurse })).status, 404);
});

test("same input → same inputHash and same finding ids (deterministic)", async () => {
  const a = (await app.call("POST", "/analyze", { token: doctor, body: { patientId: "CI-DEMO-003" } })).json.analysis;
  const b = (await app.call("POST", "/analyze", { token: doctor, body: { patientId: "CI-DEMO-003" } })).json.analysis;
  assert.equal(a.inputHash, b.inputHash);
  assert.deepEqual(a.findings.map((f) => f.id), b.findings.map((f) => f.id));
  assert.notEqual(a.analysisId, b.analysisId);
});

test("rate limiting → 429 structured", async () => {
  const limited = await startApp({}, { CLINICAL_RATE_LIMIT_PER_MIN: "2" });
  try {
    const t = await limited.login("DOCTOR");
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await limited.call("POST", "/analyze", { token: t, body: { patientId: "CI-DEMO-001" } })).status);
    assert.deepEqual(codes, [201, 201, 429, 429]);
    assert.equal((await limited.call("POST", "/analyze", { token: t, body: { patientId: "CI-DEMO-001" } })).json.error.code, "RATE_LIMITED");
  } finally { await limited.close(); }
});

test("context provider outage → 503; invalid provider data → 502; neither leaks internals", async () => {
  const down = await startApp({ contextProvider: { async get() { throw new Error("db password=hunter2 at /srv/x.js:1"); }, async list() { return []; } } });
  const bad = await startApp({ contextProvider: { async get() { return { patient: {} }; }, async list() { return []; } } });
  try {
    const r1 = await down.call("POST", "/analyze", { token: await down.login("DOCTOR"), body: { patientId: "X-1" } });
    assert.equal(r1.status, 503); assert.doesNotMatch(r1.text, /hunter2|\.js:/);
    const r2 = await bad.call("POST", "/analyze", { token: await bad.login("DOCTOR"), body: { patientId: "X-1" } });
    assert.equal(r2.status, 502); assert.equal(r2.json.error.code, "CONTEXT_INVALID");
  } finally { await down.close(); await bad.close(); }
});

test("unexpected exception → generic 500 without stack, message or secrets", async () => {
  const orig = console.error; console.error = () => {};
  const boom = await startApp({ contextProvider: { async get() { return null; }, async list() { throw new TypeError("secret-internal-detail"); } } });
  try {
    const r = await boom.call("GET", "/demo/patients", { token: await boom.login("DOCTOR") });
    assert.equal(r.status, 500); assert.equal(r.json.error.code, "INTERNAL_ERROR");
    assert.doesNotMatch(r.text, /secret-internal-detail|TypeError|\n\s+at /);
  } finally { console.error = orig; await boom.close(); }
});

test("config: demo mode is the default outside production; production defaults to no demo and no AI", () => {
  const dev = loadConfig({});
  assert.equal(dev.demoMode, true); assert.equal(dev.aiProvider, "mock"); assert.equal(dev.authMode, "demo");
  const prod = loadConfig({ NODE_ENV: "production" });
  assert.equal(prod.demoMode, false); assert.equal(prod.aiProvider, "none"); assert.equal(prod.authMode, "firebase");
});
