import type { Analysis, Finding, ReviewState, Urgency } from "./types";

export const URGENCY_LABEL: Record<Urgency, string> = { immediate_review: "Immediate review", prompt_review: "Prompt review", routine_review: "Routine review" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Formats from the string itself so the displayed date never shifts with the viewer's timezone.
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}${m[4] ? `, ${m[4]}:${m[5]}` : ""}`;
}

const INVESTIGATION_RULES = new Set(["dq-unit-mismatch", "dq-duplicate-result", "dq-future-result"]);

export function groupFindings(analysis: Analysis) {
  const redFlags: Finding[] = [];
  const insights: Finding[] = [];
  const medication: Finding[] = [];
  const investigation: Finding[] = [];
  for (const f of analysis.findings) {
    if (f.kind === "red_flag") redFlags.push(f);
    else if (f.kind === "medication" || f.ruleId === "dq-med-dates") medication.push(f);
    else if (f.kind === "investigation" || f.ruleId.startsWith("inv-") || INVESTIGATION_RULES.has(f.ruleId)) investigation.push(f);
    else insights.push(f);
  }
  return { redFlags, insights, medication, investigation };
}

export const reviewLabel = (r: ReviewState): string =>
  r.state === "not_required" ? "No review needed" : r.state === "needs_review" ? "Needs review" : { accepted: "Accepted", rejected: "Rejected", modified: "Modified" }[r.decision];

export const provenanceFrame = (p: "record" | "rules" | "ai") =>
  p === "ai"
    ? "border border-dashed border-violet-400 bg-violet-50/60 dark:border-violet-500/60 dark:bg-violet-950/30"
    : "border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";

