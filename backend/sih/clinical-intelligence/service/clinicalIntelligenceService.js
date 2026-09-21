// Part 4 — ClinicalIntelligenceService: orchestrates validation → deterministic engines → optional AI → immutable analysis.
// Guarantees: never fabricates fallback clinical content; AI output only enters after the safety gate; every analysis
// starts as "needs_review" and only an authenticated DOCTOR (via reviewService) can change that.
import { randomUUID } from "node:crypto";
import { contextSchema } from "../contracts/schemas.js";
import { RULESET } from "../data/referenceData.js";
import { normalizeContext } from "../engine/normalize.js";
import { evaluateRedFlags } from "../engine/redFlags.js";
import { analyzeInvestigations } from "../engine/investigations.js";
import { checkMedications } from "../engine/medications.js";
import { evaluateConsiderations } from "../engine/considerations.js";
import { buildSummary, collectGaps } from "../engine/summaryAndGaps.js";
import { buildTimeline } from "../engine/timeline.js";
import { hashContext, makeFinding, resolveEvidence, sortFindings } from "../engine/explain.js";
import { deidentifyForAI } from "../safety/deidentify.js";
import { validateAIResponse } from "../safety/aiValidation.js";
import { ApiError, errors, zodIssues } from "../http/errors.js";

export const DISCLAIMER = "AI-assisted decision support for clinicians. It is not a diagnosis and does not replace clinical judgement. Every item requires review by a qualified clinician. Rule sets are demo-grade and not clinically validated.";

export function createClinicalIntelligenceService({ config, contextProvider, aiProvider, store, audit, clock = () => Date.now(), uuid = randomUUID }) {
  async function resolveContext({ patientId, context }) {
    if (context) {
      const parsed = contextSchema.safeParse(context);
      if (!parsed.success) throw errors.validation(zodIssues(parsed.error));
      return { data: parsed.data, origin: "user_entered" };
    }
    let raw;
    try { raw = await contextProvider.get(patientId); }
    catch { throw errors.unavailable("The clinical context source is unavailable."); }
    if (!raw) throw errors.notFound("Patient");
    const parsed = contextSchema.safeParse(raw);
    if (!parsed.success) throw new ApiError(502, "CONTEXT_INVALID", "The clinical context source returned data that failed validation.");
    return { data: parsed.data, origin: contextProvider.origin ?? "external_provider" };
  }

  async function runAI(parsed, refIndex, useAI) {
    const meta = { requested: Boolean(useAI), provider: aiProvider.name, kind: aiProvider.kind, model: aiProvider.model, status: "not_requested", reason: null };
    if (!useAI) return { meta, narrative: null, findings: [] };
    if (!aiProvider.available) return { meta: { ...meta, status: "not_configured", reason: aiProvider.reason }, narrative: null, findings: [] };
    const deid = deidentifyForAI(parsed);
    const sources = [...refIndex].map(([ref, v]) => ({ ref, label: v.label }));
    const allowedRefs = new Set(refIndex.keys());
    let out;
    try {
      out = await Promise.race([
        aiProvider.generate({ context: deid, sources, allowedRefs }),
        new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), config.aiTimeoutMs).unref?.()),
      ]);
    } catch (err) {
      return { meta: { ...meta, status: err?.code === "timeout" ? "timeout" : "failed", reason: err?.code ?? "provider_error" }, narrative: null, findings: [] };
    }
    if (!out || typeof out !== "object") return { meta: { ...meta, status: "failed", reason: "empty_response" }, narrative: null, findings: [] };
    const verdict = validateAIResponse(out.raw, { allowedRefs, context: deid });
    if (!verdict.ok) return { meta: { ...meta, model: out.model ?? meta.model, status: "rejected", reason: verdict.code }, narrative: null, findings: [] };

    const v = verdict.value;
    const aiFindings = v.considerations.map((c, i) => makeFinding({
      kind: "consideration", category: "AI-suggested consideration", origin: "ai", ruleId: `ai-consideration-${i}`, key: c.condition, severity: "low",
      title: `AI-suggested consideration: ${c.condition}`,
      statement: `The AI draft suggests the available information may be consistent with ${c.condition}; clinician evaluation is required.`,
      what: `An AI model proposed “${c.condition}” as a consideration.`, why: c.reasoning,
      evidenceRefs: c.supportingRefs, missing: c.missingInformation, action: "Clinician to decide whether this consideration is relevant. It has not been verified.",
    }));
    return {
      meta: { ...meta, model: out.model ?? meta.model, status: "used" },
      narrative: { origin: "ai", provider: aiProvider.name, model: out.model ?? aiProvider.model, text: v.narrative, citedRefs: v.citedRefs, evidence: resolveEvidence(v.citedRefs, refIndex), reviewRequired: true },
      findings: aiFindings,
    };
  }

  async function analyze({ patientId, context, useAI = false }, actor) {
    const { data, origin } = await resolveContext({ patientId, context });
    const ctx = normalizeContext(data, { now: clock() });

    const rf = evaluateRedFlags(ctx);
    const inv = analyzeInvestigations(ctx);
    const med = checkMedications(ctx);
    const cons = evaluateConsiderations(ctx, inv);
    const gaps = collectGaps(ctx, inv, rf.notEvaluated, med.notPerformed);
    const ai = await runAI(data, ctx.refIndex, useAI);

    const seen = new Set();
    const findings = sortFindings([...rf.findings, ...cons, ...med.findings, ...inv.findings, ...ctx.dataQuality, ...gaps, ...ai.findings]).map((f) => {
      let id = f.id; let n = 2;
      while (seen.has(id)) id = `${f.id}-${n++}`;
      seen.add(id);
      return { ...f, id, evidence: resolveEvidence(f.evidenceRefs, ctx.refIndex) };
    });

    const summary = buildSummary(ctx, inv);
    summary.aiNarrative = ai.narrative;

    const analysis = {
      analysisId: uuid(),
      generatedAt: new Date(clock()).toISOString(),
      mode: config.demoMode ? "demo" : "live",
      origin,
      disclaimer: DISCLAIMER,
      ruleset: RULESET,
      inputHash: hashContext(data),
      inputSummary: { encounters: data.encounters.length, investigations: data.investigations.length, medications: data.medications.items.length, allergies: data.allergies.items.length, history: data.history.items.length },
      patient: { id: data.patient.id, displayName: data.patient.displayName ?? null, ageYears: data.patient.ageYears ?? null, sex: data.patient.sex ?? null },
      summary,
      findings,
      investigations: { results: inv.results, trends: inv.trends },
      medicationChecks: { performed: med.performed, notPerformed: med.notPerformed },
      notEvaluated: rf.notEvaluated,
      timeline: buildTimeline(ctx),
      ai: ai.meta,
      reviewItems: ["summary", ...(ai.narrative ? ["ai-narrative"] : []), ...findings.filter((f) => f.reviewRequired).map((f) => f.id)],
      hospitalId: actor.hospitalId,
      generatedBy: { id: actor.id, role: actor.role },
    };
    store.save(analysis);
    audit.record({ type: "analysis_generated", analysisId: analysis.analysisId, patientId: data.patient.id, actorId: actor.id, actorRole: actor.role, hospitalId: actor.hospitalId,
      inputHash: analysis.inputHash, counts: { findings: findings.length, redFlags: rf.findings.length }, ai: { provider: ai.meta.provider, model: ai.meta.model, status: ai.meta.status, reason: ai.meta.reason }, ruleset: RULESET.version });
    return analysis;
  }

  async function timelineFor(patientId, actor) {
    const { data } = await resolveContext({ patientId });
    audit.record({ type: "timeline_viewed", patientId, actorId: actor.id, actorRole: actor.role, hospitalId: actor.hospitalId });
    return buildTimeline(normalizeContext(data, { now: clock() }));
  }

  async function contextFor(patientId, actor) {
    const { data } = await resolveContext({ patientId });
    audit.record({ type: "context_viewed", patientId, actorId: actor.id, actorRole: actor.role, hospitalId: actor.hospitalId });
    return data;
  }

  return { analyze, timelineFor, contextFor, listPatients: () => contextProvider.list() };
}
