// Part 4 — clinician review workflow.
//   needs_review  →  reviewed (accepted | rejected | modified)      per item; the analysis is "reviewed" when every item is.
// The reviewer's identity and the timestamp come from the VERIFIED session — never from the request body — and only the
// DOCTOR role may review. The original AI/rule output is never edited; a "modified" decision stores the clinician's text
// alongside it. There is no code path in which AI output or a client-supplied field can mark itself approved.
import { errors } from "../http/errors.js";

export function createReviewService({ store, audit, clock = () => Date.now() }) {
  const scoped = (analysisId, actor) => {
    const a = store.get(analysisId);
    if (!a || a.hospitalId !== actor.hospitalId) throw errors.notFound("Analysis");
    return a;
  };

  function view(analysis) {
    const events = store.reviewEvents(analysis.analysisId);
    const latest = new Map();
    for (const e of events) latest.set(e.itemId, e);
    const reviewFor = (id, required) => {
      if (!required) return { state: "not_required" };
      const e = latest.get(id);
      return e ? { state: "reviewed", decision: e.decision, note: e.note ?? null, modifiedText: e.modifiedText ?? null, reviewer: e.reviewer, reviewedAt: e.at } : { state: "needs_review" };
    };
    const outstanding = analysis.reviewItems.filter((id) => !latest.has(id));
    return {
      ...analysis,
      summary: { ...analysis.summary, review: reviewFor("summary", true), ...(analysis.summary.aiNarrative ? { aiNarrative: { ...analysis.summary.aiNarrative, review: reviewFor("ai-narrative", true) } } : {}) },
      findings: analysis.findings.map((f) => ({ ...f, review: reviewFor(f.id, f.reviewRequired) })),
      reviewStatus: outstanding.length === 0 ? "reviewed" : "needs_review",
      reviewProgress: { total: analysis.reviewItems.length, completed: analysis.reviewItems.length - outstanding.length },
    };
  }

  return {
    view,
    get(analysisId, actor) {
      const a = scoped(analysisId, actor);
      audit.record({ type: "analysis_viewed", analysisId, patientId: a.patient.id, actorId: actor.id, actorRole: actor.role, hospitalId: actor.hospitalId });
      return view(a);
    },
    submit({ analysisId, itemId, decision, note, modifiedText }, actor) {
      if (actor.role !== "DOCTOR") throw errors.forbidden("Only a doctor can record a clinician review.");
      const a = scoped(analysisId, actor);
      if (!a.reviewItems.includes(itemId)) throw errors.validation([{ path: "itemId", message: "unknown review item for this analysis" }]);
      const event = { analysisId, itemId, decision, ...(note ? { note } : {}), ...(modifiedText ? { modifiedText } : {}),
        reviewer: { id: actor.id, name: actor.name, role: actor.role }, at: new Date(clock()).toISOString() };
      store.addReview(analysisId, event);
      audit.record({ type: "review_submitted", analysisId, itemId, decision, patientId: a.patient.id, actorId: actor.id, actorRole: actor.role, hospitalId: actor.hospitalId });
      return view(a);
    },
    audit(analysisId, actor) {
      const a = scoped(analysisId, actor);
      return { analysis: { analysisId, generatedAt: a.generatedAt, inputHash: a.inputHash, ai: a.ai, ruleset: a.ruleset }, events: audit.forAnalysis(analysisId) };
    },
  };
}
