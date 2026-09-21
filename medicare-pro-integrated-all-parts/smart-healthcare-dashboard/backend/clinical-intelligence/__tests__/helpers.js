// Shared test helpers: real Express app on an ephemeral port, injected clock, no network/DB/Firebase/AI key.
import express from "express";
import { createClinicalIntelligenceModule } from "../index.js";
import { loadConfig } from "../config.js";
import { contextSchema } from "../contracts/schemas.js";
import { normalizeContext } from "../engine/normalize.js";
import { evaluateRedFlags } from "../engine/redFlags.js";
import { analyzeInvestigations } from "../engine/investigations.js";
import { checkMedications } from "../engine/medications.js";
import { evaluateConsiderations } from "../engine/considerations.js";
import { buildSummary, collectGaps } from "../engine/summaryAndGaps.js";
import { DEMO_SCENARIOS } from "../data/demoScenarios.js";

export const NOW = Date.parse("2026-09-20T00:00:00Z");
export const scenario = (id) => structuredClone(DEMO_SCENARIOS.find((s) => s.id === id).context);

// Run every engine on a raw (unvalidated) context object.
export function runEngines(rawContext, now = NOW) {
  const parsed = contextSchema.parse(rawContext);
  const ctx = normalizeContext(parsed, { now });
  const rf = evaluateRedFlags(ctx);
  const inv = analyzeInvestigations(ctx);
  const med = checkMedications(ctx);
  const cons = evaluateConsiderations(ctx, inv);
  const gaps = collectGaps(ctx, inv, rf.notEvaluated, med.notPerformed);
  const summary = buildSummary(ctx, inv);
  return { parsed, ctx, rf, inv, med, cons, gaps, summary };
}
export const ids = (list) => list.map((f) => f.ruleId);

export async function startApp(overrides = {}, envOverrides = {}) {
  const clockState = { now: NOW };
  const config = overrides.config ?? loadConfig({ CLINICAL_DEMO_MODE: "true", CLINICAL_RATE_LIMIT_PER_MIN: "1000", ...envOverrides });
  const mod = createClinicalIntelligenceModule({ config, forwardAudit: false, clock: () => clockState.now, ...overrides });
  const app = express();
  app.use("/api/clinical-intelligence", mod.router);
  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/clinical-intelligence`;

  async function call(method, path, { token, body, raw } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined || raw !== undefined ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  async function login(role = "DOCTOR", extra = {}) {
    const r = await call("POST", "/session", { body: { role, ...extra } });
    return r.json.token;
  }
  return { mod, base, call, login, clock: clockState, close: () => new Promise((r) => server.close(r)) };
}
