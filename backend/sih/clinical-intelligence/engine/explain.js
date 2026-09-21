// Part 4 — finding construction + the explainability contract.
// Every finding MUST answer: WHAT was identified, WHY, from which SOURCE, what is MISSING, and what ACTION to take.
// makeFinding() builds it; assertExplained() is the safety net that refuses to emit a finding without them.
import { createHash } from "node:crypto";

export const SEVERITIES = ["high", "moderate", "low", "info"];
export const URGENCIES = ["immediate_review", "prompt_review", "routine_review"];
const REVIEW_KINDS = new Set(["red_flag", "medication", "consideration", "investigation"]);

export const REVIEW_NOTE = "Review required — the decision rests with the treating clinician.";

export function shortHash(parts) {
  return createHash("sha1").update([...parts].map(String).sort().join("|")).digest("hex").slice(0, 8);
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashContext(context) {
  return createHash("sha256").update(stableStringify(context)).digest("hex");
}

export function makeFinding({ kind, category, ruleId, key = "", title, statement, severity = "info", urgency, origin = "rules", what, why, missing = [], action, evidenceRefs = [], reviewRequired, extra }) {
  const finding = {
    id: `${ruleId}:${shortHash([key, ...evidenceRefs])}`,
    kind,
    category,
    origin, // "rules" (deterministic) | "ai"
    ruleId,
    title,
    statement,
    severity,
    ...(urgency ? { urgency } : {}),
    explanation: { what, why, sources: [...evidenceRefs], missing: [...missing], action },
    evidenceRefs: [...evidenceRefs],
    reviewRequired: reviewRequired ?? REVIEW_KINDS.has(kind),
    reviewNote: REVIEW_NOTE,
    ...(extra ? { extra } : {}),
  };
  assertExplained(finding);
  return finding;
}

export function assertExplained(finding) {
  const e = finding?.explanation;
  const fail = (why) => {
    const err = new Error(`UNEXPLAINED_FINDING: ${finding?.ruleId ?? "unknown"} — ${why}`);
    err.code = "UNEXPLAINED_FINDING";
    throw err;
  };
  if (!e) fail("missing explanation");
  for (const part of ["what", "why", "action"]) {
    if (typeof e[part] !== "string" || e[part].trim().length === 0) fail(`explanation.${part} is empty`);
  }
  if (!Array.isArray(e.sources)) fail("explanation.sources must be an array");
  if (!Array.isArray(e.missing)) fail("explanation.missing must be an array");
  // A finding about absent information legitimately has no source; every other finding must cite one.
  if (finding.kind !== "information_gap" && e.sources.length === 0) fail("no supporting source cited");
  if (!finding.title || !finding.statement) fail("title/statement missing");
  return true;
}

export function resolveEvidence(refs, refIndex) {
  return refs.map((ref) => {
    const hit = refIndex.get(ref);
    return hit ? { ref, label: hit.label, date: hit.date ?? null } : { ref, label: "(source no longer available)", date: null };
  });
}

const RANK = { high: 0, moderate: 1, low: 2, info: 3 };
const URG = { immediate_review: 0, prompt_review: 1, routine_review: 2 };
export function sortFindings(list) {
  return [...list].sort((a, b) => (RANK[a.severity] - RANK[b.severity]) || ((URG[a.urgency] ?? 9) - (URG[b.urgency] ?? 9)) || a.title.localeCompare(b.title));
}
