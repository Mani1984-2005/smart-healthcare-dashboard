// backend/services/physicianWorkspace/clinicalIntelligenceAdapter.js
//
// Part 4 -> Part 5 integration boundary.
//
// Like intakeRecordAdapter.js (Part 1 -> Part 5), this file is the ONLY
// place that knows both Part 4's analysis shape and what Part 5 needs to
// show a physician. It reads Part 4's own AnalysisStore in-process — the
// SAME instance Part 4's own router writes to (see server.js), not a copy —
// via `configureClinicalIntelligenceStore`, called once at boot. This
// mirrors the existing `intakeService.__setDepsForTesting` pattern already
// used in this codebase (a module-level configurable reference), and Part
// 5's own store.js convention of module-level state, rather than
// introducing a new dependency-injection style.
//
// Security: this file adds NO new authorization. The store is read only
// through Part 5's own routes, which already sit behind
// `requireRole(...READ_ROLES)` (see routes/physicianWorkspaceRoutes.js) —
// exactly the same boundary every other case field in Part 5 is read
// through. Part 4's own HTTP auth is never re-invoked and never bypassed;
// it simply isn't on this path, the same way it isn't on Part 4's own
// internal function calls either.
//
// Provenance: every analysis and finding keeps Part 4's own `origin`
// ("rules" | "ai") and `reviewRequired` flags untouched — this adapter does
// not relabel, summarize away, or upgrade anything. AI output is returned
// exactly as AI output; nothing here can make it appear physician-confirmed.

let analysisStore = null;

/** Called once from server.js with the SAME AnalysisStore instance Part 4's own router uses. */
export function configureClinicalIntelligenceStore(store) {
  analysisStore = store;
}

/** Test-only reset, mirroring intakeService.__setDepsForTesting's naming convention. */
export function __resetForTesting() {
  analysisStore = null;
}

/**
 * Most-recent-first Part 4 analyses for a patient, in a shape safe for
 * direct display: every finding keeps its own origin/severity/reviewRequired
 * so physician-facing UI can render the same "AI-generated, not verified"
 * distinction Part 4's own module already enforces. Never invents an
 * analysis; an unanalyzed patient simply gets an empty list.
 */
export function listClinicalIntelligenceForPatient(patientId) {
  if (!analysisStore || !patientId) return [];
  return analysisStore.listByPatient(patientId).map((a) => ({
    analysisId: a.analysisId,
    generatedAt: a.generatedAt,
    mode: a.mode, // "demo" | "live" — Part 4's own label, carried through unchanged
    disclaimer: a.disclaimer,
    summary: a.summary,
    findings: a.findings.map((f) => ({
      id: f.id,
      kind: f.kind,
      category: f.category,
      title: f.title,
      statement: f.statement,
      severity: f.severity,
      origin: f.origin, // "rules" | "ai" — never altered
      reviewRequired: f.reviewRequired,
    })),
    aiNarrative: a.summary?.aiNarrative ?? null,
    reviewItems: a.reviewItems,
    generatedBy: a.generatedBy,
  }));
}
