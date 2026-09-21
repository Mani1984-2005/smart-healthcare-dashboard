import { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import Section from "../../../components/ui/Section";
import type { Analysis, ClinicalContext, ContextList, InvestigationResult, PatientListItem, SummarySection } from "../types";
import { formatDate, groupFindings, provenanceFrame } from "../helpers";
import { ExplanationBlock, FindingList, Notice, OriginTag, ReviewBadge } from "./ui";

const Missing = ({ children = "Not provided" }: { children?: ReactNode }) => <span className="inline-flex items-center gap-1 font-medium text-amber-800 dark:text-amber-300"><CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />{children}</span>;

// ---- Patient context (verified record as supplied) ----------------------------------------------
function ListBlock<T>({ title, list, render, noneText }: { title: string; list: ContextList<T>; render: (i: T) => ReactNode; noneText: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h4>
      <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">
        {list.status === "not_provided" && <Missing>Not provided</Missing>}
        {list.status === "none_known" && <span>{noneText}</span>}
        {list.status === "documented" && <ul className="list-disc space-y-0.5 pl-5">{list.items.map((i, idx) => <li key={idx}>{render(i)}</li>)}</ul>}
      </div>
    </div>
  );
}

export function PatientContextPanel({ context, meta }: { context: ClinicalContext; meta?: PatientListItem }) {
  const p = context.patient;
  return (
    <div className="space-y-5">
      <Section title={p.displayName ?? p.id} description={[p.ageYears !== undefined ? `${p.ageYears} years` : "Age not provided", p.sex && p.sex !== "unknown" ? p.sex : "Sex not provided", p.id].join(" · ")} action={<div className="flex gap-2"><OriginTag origin="record" /><Badge variant="neutral">Synthetic demo data</Badge></div>}>
        {meta && <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-slate-800 dark:text-slate-200">{meta.scenario}.</span> {meta.description}</p>}
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <ListBlock title="Allergies" list={context.allergies} noneText="No known allergies (documented)" render={(a) => <>{a.substance}{a.reaction ? ` — ${a.reaction}` : ""}{a.severity ? ` (${a.severity})` : ""}</>} />
          <ListBlock title="Current medications" list={context.medications} noneText="None (documented)" render={(m) => <>{m.name}{m.dose ? ` ${m.dose}` : ""}{m.frequency ? `, ${m.frequency}` : ""}{m.status === "unknown" ? " (status unknown)" : ""}</>} />
          <ListBlock title="Relevant history" list={context.history} noneText="None known (documented)" render={(h) => <>{h.text}{h.since ? ` (since ${h.since})` : ""}</>} />
        </div>
      </Section>

      <Section title="Encounters" description={`${context.encounters.length} recorded`}>
        {context.encounters.length === 0 ? <p className="text-sm"><Missing>No encounters recorded</Missing></p> : (
          <div className="space-y-4">
            {[...context.encounters].sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
              <div key={e.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(e.date)} · {e.type ?? "Encounter"}</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{e.chiefComplaint ? `“${e.chiefComplaint}”` : <Missing>Chief complaint not provided</Missing>}</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Symptoms</dt><dd>{e.symptoms.length ? e.symptoms.map((s) => `${s.name}: ${s.present === true ? "present" : s.present === false ? "absent" : "unknown"}${s.severity ? `, ${s.severity}` : ""}${s.duration ? `, ${s.duration}` : ""}`).join("; ") : <Missing />}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vital signs</dt><dd>{e.vitals && Object.keys(e.vitals).length ? Object.entries(e.vitals).map(([k, v]) => `${k} ${v.value}${v.unit ? ` ${v.unit}` : ""}`).join(" · ") : <Missing />}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Examination</dt><dd>{e.examination.length ? e.examination.map((o) => `${o.system ? `${o.system}: ` : ""}${o.finding}`).join("; ") : <Missing />}</dd></div>
                  {e.notes && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Note</dt><dd>{e.notes}</dd></div>}
                </dl>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Investigations" description="As supplied — nothing is interpreted on this tab">
        {context.investigations.length === 0 ? <Missing>No investigations recorded</Missing> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-4">Test</th><th className="py-2 pr-4">Value</th><th className="py-2 pr-4">Reference range</th><th className="py-2">Collected</th></tr></thead><tbody>
            {context.investigations.map((r, i) => <tr key={i} className="border-t border-slate-200 dark:border-slate-800"><td className="py-2 pr-4 font-medium">{r.name}</td><td className="py-2 pr-4">{r.value}{r.unit ? ` ${r.unit}` : <span className="text-amber-800 dark:text-amber-300"> (no unit)</span>}</td><td className="py-2 pr-4">{r.referenceRange ? `${r.referenceRange.low ?? "…"}–${r.referenceRange.high ?? "…"}` : <Missing />}</td><td className="py-2">{formatDate(r.collectedAt)}</td></tr>)}
          </tbody></table></div>
        )}
      </Section>
    </div>
  );
}

// ---- Summary ------------------------------------------------------------------------------------
function SummaryBlock({ label, section }: { label: string; section: SummarySection }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</h4>
      <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">
        {section.status === "not_provided" && <Missing>{section.display ?? "Not provided"}</Missing>}
        {section.status === "none_known" && <span>{section.display}</span>}
        {section.status === "provided" && <ul className="space-y-0.5">{section.items.map((i) => <li key={i.sourceRefs.join()}>{i.text}</li>)}</ul>}
      </div>
    </div>
  );
}

export function SummaryPanel({ analysis }: { analysis: Analysis }) {
  const s = analysis.summary;
  const blocks: [string, SummarySection][] = [["Presenting complaint", s.presentingComplaint], ["Symptoms present", s.symptoms], ["Documented as absent", s.documentedAbsent], ["Relevant history", s.relevantHistory], ["Current medications", s.currentMedications], ["Allergies", s.allergies], ["Vital signs (latest encounter)", s.vitals], ["Examination", s.examination], ["Investigations (latest per test)", s.investigations], ["Follow-up in the record", s.followUp]];
  return (
    <div className="space-y-5">
      <Section title="Clinical summary" description={s.asOf ? `Structured from the record as of ${formatDate(s.asOf)}. Every line is traceable to a supplied source.` : "No encounter recorded."} action={<div className="flex flex-wrap gap-2"><OriginTag origin="record" /><ReviewBadge review={s.review} /></div>}>
        <div className="grid gap-5 md:grid-cols-2" data-testid="record-summary">{blocks.map(([label, sec]) => <SummaryBlock key={label} label={label} section={sec} />)}</div>
      </Section>
      {s.aiNarrative ? (
        <section data-testid="ai-narrative" className={`rounded-xl p-6 ${provenanceFrame("ai")}`}>
          <div className="flex flex-wrap items-center gap-2"><OriginTag origin="ai" detail={`Generated by ${s.aiNarrative.provider}${s.aiNarrative.model ? ` (${s.aiNarrative.model})` : ""}. Not verified.`} /><ReviewBadge review={s.aiNarrative.review} /></div>
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">AI-drafted narrative</h3>
          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{s.aiNarrative.text}</p>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Produced by <strong>{s.aiNarrative.provider}</strong>{s.aiNarrative.model ? ` (${s.aiNarrative.model})` : ""}. It is unverified, passed automated grounding checks only, and is not part of the clinical record until a clinician reviews it.</p>
          <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-violet-800 dark:text-violet-300">Sources cited by the AI</summary><ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">{s.aiNarrative.evidence.map((e) => <li key={e.ref}>{e.label}</li>)}</ul></details>
        </section>
      ) : analysis.ai.status !== "not_requested" && (
        <Notice tone="warning" role="status">No AI narrative was added ({analysis.ai.status.replace("_", " ")}{analysis.ai.reason ? `: ${analysis.ai.reason}` : ""}). Nothing was substituted — the summary above is complete on its own.</Notice>
      )}
    </div>
  );
}

// ---- Timeline -----------------------------------------------------------------------------------
const KIND_LABEL: Record<string, string> = { encounter: "Encounter", symptom: "Symptoms", examination: "Examination", investigation: "Investigation", note: "Note", medication_start: "Medication started", medication_stop: "Medication stopped", follow_up: "Follow-up" };

export function TimelinePanel({ analysis }: { analysis: Analysis }) {
  if (!analysis.timeline.length) return <EmptyState title="No dated events" description="This record has no dated encounters, results or medication changes to place on a timeline." />;
  const groups = new Map<string, typeof analysis.timeline>();
  for (const e of analysis.timeline) groups.set(e.date.slice(0, 10), [...(groups.get(e.date.slice(0, 10)) ?? []), e]);
  return (
    <Section title="Clinical timeline" description="Chronological, from supplied dated information only." action={<OriginTag origin="record" />}>
      <ol className="space-y-5">
        {[...groups.entries()].map(([date, events]) => (
          <li key={date} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(date)}</p>
            <ul className="space-y-2 border-l-2 border-slate-200 pl-4 dark:border-slate-800">
              {events.map((e) => <li key={e.id} className="text-sm"><Badge variant={e.kind === "encounter" ? "info" : "neutral"}>{KIND_LABEL[e.kind] ?? e.kind}</Badge> <span className="font-medium text-slate-900 dark:text-slate-100">{e.title}</span>{e.detail && <span className="text-slate-600 dark:text-slate-400"> — {e.detail}</span>}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ---- Insights / Alerts --------------------------------------------------------------------------
export function InsightsPanel({ analysis }: { analysis: Analysis }) {
  const { insights } = groupFindings(analysis);
  const considerations = insights.filter((f) => f.kind === "consideration");
  const dq = insights.filter((f) => f.kind === "data_quality");
  const gaps = insights.filter((f) => f.kind === "information_gap");
  return (
    <div className="space-y-6">
      <Notice>Insights are <strong>considerations for clinician review</strong>, not diagnoses. Each one shows what supports it and what is missing.</Notice>
      <Section title="Possible considerations" description="Rule-based pattern matches against documented information.">
        <FindingList findings={considerations} empty={<p className="text-sm text-slate-600 dark:text-slate-400">No pattern had enough documented support to be raised. That is not a statement that nothing is wrong.</p>} />
      </Section>
      <Section title="Data quality" description="Contradictions, duplicates and entries that could not be used.">
        <FindingList findings={dq} empty={<p className="text-sm text-slate-600 dark:text-slate-400">No data-quality problems detected.</p>} />
      </Section>
      <Section title="Missing information" description="What the system did not have — and therefore did not assume.">
        <FindingList findings={gaps} empty={<p className="text-sm text-slate-600 dark:text-slate-400">No key information gaps detected.</p>} />
      </Section>
    </div>
  );
}

export function AlertsPanel({ analysis }: { analysis: Analysis }) {
  const { redFlags } = groupFindings(analysis);
  return (
    <div className="space-y-5">
      {redFlags.length > 0 ? (
        <Notice tone="danger" role="alert"><strong>{redFlags.length} potential warning {redFlags.length === 1 ? "sign needs" : "signs need"} clinician review.</strong> These are flags from deterministic rules, not diagnoses. Assess the patient directly.</Notice>
      ) : (
        <Notice role="status"><strong>No red-flag rules were triggered by the information provided.</strong> This does not mean the patient is well — only that the recorded information did not meet a rule.</Notice>
      )}
      <FindingList findings={redFlags} empty={null} />
      {analysis.notEvaluated.length > 0 && (
        <Section title="Rules that could not be evaluated" description="Red-flag screening needs this information; it was not available.">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800 dark:text-slate-200">{analysis.notEvaluated.map((m) => <li key={m}>{m}</li>)}</ul>
        </Section>
      )}
    </div>
  );
}

// ---- Investigations -----------------------------------------------------------------------------
const STATUS: Record<InvestigationResult["status"], { label: string; variant: "success" | "warning" | "neutral" }> = { within_range: { label: "Within supplied range", variant: "success" }, above_range: { label: "Above supplied range", variant: "warning" }, below_range: { label: "Below supplied range", variant: "warning" }, not_interpreted: { label: "Not interpreted", variant: "neutral" } };

export function InvestigationsPanel({ analysis }: { analysis: Analysis }) {
  const { investigation } = groupFindings(analysis);
  const { results, trends } = analysis.investigations;
  return (
    <div className="space-y-6">
      <Notice>Results are compared only with the <strong>reference range supplied with each result</strong>. The system never invents a range and never converts a unit.</Notice>
      <Section title="Results" action={<OriginTag origin="rules" />}>
        {results.length === 0 ? <p className="text-sm"><Missing>No investigations recorded</Missing></p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-4">Test</th><th className="py-2 pr-4">Observed</th><th className="py-2 pr-4">Reference range</th><th className="py-2 pr-4">Collected</th><th className="py-2">Interpretation</th></tr></thead><tbody>
            {results.map((r) => { const st = STATUS[r.status]; return (
              <tr key={r.ref} className="border-t border-slate-200 align-top dark:border-slate-800">
                <td className="py-2 pr-4 font-medium">{r.name}</td>
                <td className="py-2 pr-4">{r.value}{r.unit ? ` ${r.unit}` : <span className="text-amber-800 dark:text-amber-300"> (no unit)</span>}</td>
                <td className="py-2 pr-4">{r.referenceRange ? `${r.referenceRange.low ?? "…"}–${r.referenceRange.high ?? "…"}${r.unit ? ` ${r.unit}` : ""}` : <Missing />}</td>
                <td className="py-2 pr-4">{formatDate(r.collectedAt)}</td>
                <td className="py-2"><Badge variant={st.variant}>{st.label}</Badge>{r.reasons.length > 0 && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Reason: {r.reasons.join("; ")}</p>}</td>
              </tr>); })}
          </tbody></table></div>
        )}
      </Section>
      {trends.length > 0 && (
        <Section title="Trends" description="Between the two most recent results with identical units.">
          <ul className="grid gap-3 md:grid-cols-2">{trends.map((t) => (
            <li key={t.key} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t.points.map((p) => `${p.value}`).join(" → ")} {t.unit}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t.direction === "unchanged" ? "Unchanged" : `${t.direction === "increased" ? "Increased" : "Decreased"} by ${Math.abs(t.deltaAbs)} ${t.unit}${t.deltaPct !== null ? ` (${Math.abs(t.deltaPct)}%)` : ""}`} — {t.rangeShift}</p>
            </li>))}</ul>
        </Section>
      )}
      <Section title="Investigation findings" description="Items for clinician review.">
        <FindingList findings={investigation} empty={<p className="text-sm text-slate-600 dark:text-slate-400">No investigation findings were raised.</p>} />
      </Section>
    </div>
  );
}

// ---- Medication & allergy ----------------------------------------------------------------------
const CHECK_LABEL: Record<string, string> = { allergy: "Allergy conflict", interaction: "Interaction", duplicate: "Duplicate medication", completeness: "Record completeness", renal: "Renal check (metformin)" };

export function MedicationPanel({ analysis }: { analysis: Analysis }) {
  const { medication } = groupFindings(analysis);
  const { performed, notPerformed } = analysis.medicationChecks;
  return (
    <div className="space-y-6">
      <Notice>Every item is framed as <strong>“Review required”</strong>. This system never prescribes, changes or stops a medication — that decision stays with the authorised clinician. Interaction rules are a small demo set, not a licensed formulary.</Notice>
      <Section title="Checks">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(CHECK_LABEL).map(([k, label]) => <li key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"><span>{label}</span>{performed[k] ? <Badge variant="success">Performed</Badge> : <Badge variant="neutral">Not performed</Badge>}</li>)}</ul>
        {notPerformed.length > 0 && <div className="mt-4"><h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Not performed — and why</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800 dark:text-slate-200">{notPerformed.map((n) => <li key={n.check}><strong>{n.check}:</strong> {n.reason}</li>)}</ul></div>}
      </Section>
      <Section title="Medication findings">
        <FindingList findings={medication} empty={<p className="text-sm text-slate-600 dark:text-slate-400">{Object.values(performed).some(Boolean) ? "The checks that could run found nothing to flag. Checks listed as not performed were not assessed." : "No medication check could be performed with the information provided."}</p>} />
      </Section>
    </div>
  );
}

// ---- Evidence / explainability / provenance -----------------------------------------------------
export function EvidencePanel({ analysis }: { analysis: Analysis }) {
  const a = analysis;
  const rows: [string, ReactNode][] = [
    ["Analysis ID", <code key="i" className="text-xs">{a.analysisId}</code>],
    ["Generated", formatDate(a.generatedAt.slice(0, 16))],
    ["Mode", a.mode === "demo" ? "Demo (synthetic data)" : "Live"],
    ["Rule set", `${a.ruleset.id} v${a.ruleset.version} — ${a.ruleset.status}`],
    ["Input fingerprint", <code key="h" className="text-xs">{a.inputHash.slice(0, 16)}…</code>],
    ["AI", a.ai.status === "not_requested" ? "Not requested — deterministic output only" : `${a.ai.provider}${a.ai.model ? ` (${a.ai.model})` : ""} — ${a.ai.status.replace("_", " ")}${a.ai.reason ? `: ${a.ai.reason}` : ""}`],
  ];
  return (
    <div className="space-y-6">
      <Section title="How to read this analysis">
        <ul className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
          <li className="flex items-center gap-3"><OriginTag origin="record" /> Taken directly from the supplied record.</li>
          <li className="flex items-center gap-3"><OriginTag origin="rules" /> Produced by deterministic rules. Reproducible; not AI.</li>
          <li className="flex items-center gap-3"><OriginTag origin="ai" /> Generated by an AI model. Unverified; shown in a dashed frame.</li>
        </ul>
      </Section>
      <Section title="Provenance" description="What was analysed, how, and with what.">
        <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</dt><dd className="text-sm text-slate-800 dark:text-slate-200">{v}</dd></div>)}</dl>
      </Section>
      <Section title="Every finding, with its evidence" description={`${a.findings.length} findings — each answers what, why, source, what is missing, and what to review.`}>
        {a.findings.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-400">No findings were produced.</p> : (
          <div className="space-y-3">{a.findings.map((f) => <details key={f.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><summary className="cursor-pointer text-sm font-medium text-slate-900 dark:text-slate-100">{f.title}</summary><div className="mt-3"><ExplanationBlock finding={f} /></div></details>)}</div>
        )}
      </Section>
    </div>
  );
}

