import { test } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers.js";
import { loadConfig } from "../config.js";
import { NullProvider, MockProvider, createAIProvider, AIProviderError } from "../providers/aiAdapter.js";
import { AnthropicProvider } from "../providers/anthropicProvider.js";

const fake = (generate, extra = {}) => ({ name: "fake", kind: "external", model: "fake-1", available: true, reason: null, generate, ...extra });
const run = async (provider, opts = {}, body = { patientId: "CI-DEMO-002", options: { useAI: true } }) => {
  const app = await startApp({ aiProvider: provider, ...opts });
  try {
    const t = await app.login("DOCTOR");
    const r = await app.call("POST", "/analyze", { token: t, body });
    return { r, a: r.json?.analysis, app, t };
  } finally { await app.close(); }
};
const GOOD = { narrative: "HbA1c was 8.9 on 2026-09-10 with increased thirst recorded.", citedRefs: ["inv:inv-2"], considerations: [] };

test("service → adapter: valid AI output is used, clearly labelled origin 'ai', and starts as needs_review", async () => {
  const { a } = await run(fake(async () => ({ raw: GOOD, model: "fake-1" })));
  assert.equal(a.ai.status, "used"); assert.equal(a.ai.provider, "fake");
  assert.equal(a.summary.aiNarrative.origin, "ai");
  assert.equal(a.summary.aiNarrative.review.state, "needs_review");
  assert.equal(a.summary.origin, "record", "the record-derived summary stays separate");
  assert.ok(a.reviewItems.includes("ai-narrative"));
  assert.ok(a.summary.aiNarrative.evidence[0].label.includes("HbA1c"));
});

test("AI-suggested considerations are added as origin:'ai', low severity, explained and review-required", async () => {
  const raw = { ...GOOD, considerations: [{ condition: "Diabetic kidney involvement", supportingRefs: ["inv:inv-2"], missingInformation: ["Urine albumin"], reasoning: "HbA1c was 8.9." }] };
  const { a } = await run(fake(async () => ({ raw })));
  const f = a.findings.find((x) => x.origin === "ai");
  assert.ok(f); assert.equal(f.severity, "low"); assert.equal(f.reviewRequired, true);
  assert.match(f.statement, /may be consistent with/);
  assert.deepEqual(f.explanation.missing, ["Urine albumin"]);
  assert.equal(f.review.state, "needs_review");
});

test("AI is NOT called unless requested (avoids unnecessary calls / PHI egress)", async () => {
  let calls = 0;
  const { a } = await run(fake(async () => { calls++; return { raw: GOOD }; }), {}, { patientId: "CI-DEMO-002" });
  assert.equal(calls, 0); assert.equal(a.ai.status, "not_requested"); assert.equal(a.summary.aiNarrative, null);
});

test("AI request is de-identified before it reaches the provider", async () => {
  let seen;
  await run(fake(async (req) => { seen = req; return { raw: GOOD }; }));
  assert.doesNotMatch(JSON.stringify(seen.context), /Rohan|Iyer|CI-DEMO-002/);
  assert.match(seen.context.patient.id, /^P-/);
  assert.ok(seen.sources.length > 10 && seen.sources.every((s) => s.ref && s.label));
});

test("provider failure → analysis still succeeds with deterministic content only; NO fabricated fallback", async () => {
  const withAI = await run(fake(async () => { throw new AIProviderError("unavailable"); }));
  const without = await run(fake(async () => ({ raw: GOOD })), {}, { patientId: "CI-DEMO-002" });
  assert.equal(withAI.r.status, 201);
  assert.equal(withAI.a.ai.status, "failed"); assert.equal(withAI.a.ai.reason, "unavailable");
  assert.equal(withAI.a.summary.aiNarrative, null);
  assert.deepEqual(withAI.a.findings.map((f) => f.id), without.a.findings.map((f) => f.id));
  assert.ok(withAI.a.findings.every((f) => f.origin === "rules"));
});

test("provider timeout → status 'timeout', analysis still returned", async () => {
  const cfg = { ...loadConfig({ CLINICAL_DEMO_MODE: "true" }), aiTimeoutMs: 60 };
  const { r, a } = await run(fake(() => new Promise(() => {})), { config: cfg });
  assert.equal(r.status, 201); assert.equal(a.ai.status, "timeout"); assert.equal(a.summary.aiNarrative, null);
});

test("malformed / unsafe AI output → 'rejected' with a reason code, and none of it reaches the response", async () => {
  const cases = [["not json at all", "MALFORMED"], [{ ...GOOD, reviewStatus: "approved" }, "SCHEMA"], [{ ...GOOD, citedRefs: ["inv:ghost"] }, "UNKNOWN_REF"],
    [{ ...GOOD, narrative: "The patient definitely has kidney failure." }, "DEFINITIVE_LANGUAGE"], [{ ...GOOD, narrative: "Discontinue metformin." }, "PRESCRIPTIVE_LANGUAGE"],
    [{ ...GOOD, narrative: "Physician-approved summary." }, "APPROVAL_CLAIM"], [{ ...GOOD, narrative: "HbA1c was 15.2." }, "UNGROUNDED_NUMBER"]];
  for (const [raw, code] of cases) {
    const { r, a } = await run(fake(async () => ({ raw })));
    assert.equal(r.status, 201, code); assert.equal(a.ai.status, "rejected"); assert.equal(a.ai.reason, code);
    assert.equal(a.summary.aiNarrative, null);
    assert.doesNotMatch(JSON.stringify(a), /definitely has|Discontinue metformin|Physician-approved|15\.2/);
  }
});

test("no provider configured: useAI is honoured gracefully as 'not_configured' (demo mode never breaks)", async () => {
  const { r, a } = await run(new NullProvider("disabled"));
  assert.equal(r.status, 201); assert.equal(a.ai.status, "not_configured"); assert.equal(a.ai.reason, "disabled");
  assert.ok(a.findings.length > 0);
});

test("demo default provider is the deterministic mock, and it is labelled as not a language model", async () => {
  const app = await startApp();
  try {
    const t = await app.login("DOCTOR");
    assert.equal((await app.call("GET", "/status")).json.ai.provider, "mock");
    const a = (await app.call("POST", "/analyze", { token: t, body: { patientId: "CI-DEMO-006", options: { useAI: true } } })).json.analysis;
    assert.equal(a.ai.status, "used"); assert.equal(a.ai.provider, "mock");
    assert.match(a.summary.aiNarrative.text, /template, not a language model/);
  } finally { await app.close(); }
});

test("the mock provider passes the same safety gate as any real provider, on every scenario", async () => {
  const app = await startApp();
  try {
    const t = await app.login("DOCTOR");
    for (let i = 1; i <= 6; i++) {
      const a = (await app.call("POST", "/analyze", { token: t, body: { patientId: `CI-DEMO-00${i}`, options: { useAI: true } } })).json.analysis;
      assert.equal(a.ai.status, "used", `scenario ${i}: ${a.ai.reason}`);
    }
  } finally { await app.close(); }
});

test("createAIProvider: selection logic, including 'anthropic' without a key → unavailable (not a crash)", () => {
  assert.ok(createAIProvider({ aiProvider: "mock" }) instanceof MockProvider);
  const none = createAIProvider({ aiProvider: "none" }); assert.equal(none.available, false);
  const nokey = createAIProvider({ aiProvider: "anthropic", aiApiKey: null }); assert.equal(nokey.available, false); assert.equal(nokey.reason, "missing_api_key");
  assert.equal(createAIProvider({ aiProvider: "gibberish" }).reason, "unknown_provider");
  const real = createAIProvider({ aiProvider: "anthropic", aiApiKey: "k", aiModel: "m", aiTimeoutMs: 1000 }, { loadAnthropic: (o) => new AnthropicProvider(o) });
  assert.equal(real.kind, "external");
});

test("AnthropicProvider (stubbed fetch — NOT a live call): request shape, response parsing, error mapping, key hygiene", async () => {
  let captured;
  const ok = new AnthropicProvider({ apiKey: "sk-test-SECRET", model: "claude-sonnet-5", timeoutMs: 1000, fetchImpl: async (url, init) => { captured = { url, init }; return { ok: true, json: async () => ({ model: "claude-sonnet-5", content: [{ type: "text", text: JSON.stringify(GOOD) }] }) }; } });
  const out = await ok.generate({ context: { a: 1 }, sources: [{ ref: "r", label: "l" }] });
  assert.equal(captured.url, "https://api.anthropic.com/v1/messages");
  assert.equal(captured.init.headers["x-api-key"], "sk-test-SECRET");
  assert.equal(JSON.parse(captured.init.body).model, "claude-sonnet-5");
  assert.doesNotMatch(captured.init.body, /SECRET/, "key is only in a header, never in the body");
  assert.equal(JSON.parse(out.raw).narrative, GOOD.narrative);

  const failing = (impl) => new AnthropicProvider({ apiKey: "sk-test-SECRET", model: "m", timeoutMs: 40, fetchImpl: impl });
  const codeOf = async (p) => { try { await p.generate({ context: {}, sources: [] }); } catch (e) { assert.doesNotMatch(String(e.message) + String(e.stack), /SECRET/); return e.code; } };
  assert.equal(await codeOf(failing(async () => ({ ok: false, status: 429 }))), "rate_limited");
  assert.equal(await codeOf(failing(async () => ({ ok: false, status: 500 }))), "bad_status");
  assert.equal(await codeOf(failing(async () => { throw new Error("ECONNRESET sk-test-SECRET"); })), "unavailable");
  assert.equal(await codeOf(failing((_u, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })))))), "timeout");
});

test("full path with the real AnthropicProvider class and a stubbed fetch: request → gate → labelled result", async () => {
  const cfg = loadConfig({ CLINICAL_DEMO_MODE: "true", CLINICAL_AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test-SECRET" });
  const fetchImpl = async () => ({ ok: true, json: async () => ({ model: "claude-sonnet-5", content: [{ type: "text", text: "```json\n" + JSON.stringify(GOOD) + "\n```" }] }) });
  const app = await startApp({ config: cfg, fetchImpl });
  try {
    const t = await app.login("DOCTOR");
    const r = await app.call("POST", "/analyze", { token: t, body: { patientId: "CI-DEMO-002", options: { useAI: true } } });
    assert.equal(r.json.analysis.ai.status, "used"); assert.equal(r.json.analysis.ai.provider, "anthropic");
    assert.doesNotMatch(r.text, /sk-test-SECRET/);
    assert.doesNotMatch((await app.call("GET", "/status")).text, /sk-test-SECRET/);
  } finally { await app.close(); }
});
