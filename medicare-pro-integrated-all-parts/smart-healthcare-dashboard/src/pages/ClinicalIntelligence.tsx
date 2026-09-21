import { KeyboardEvent, useEffect, useState } from "react";
import EmptyState from "../components/ui/EmptyState";
import LoadingState from "../components/ui/LoadingState";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { useAuthStore } from "../store/authStore.js";
import { useClinicalStore } from "../features/clinical-intelligence/store";
import { groupFindings } from "../features/clinical-intelligence/helpers";
import { Notice } from "../features/clinical-intelligence/components/ui";
import { AlertsPanel, EvidencePanel, InsightsPanel, InvestigationsPanel, MedicationPanel, PatientContextPanel, SummaryPanel, TimelinePanel } from "../features/clinical-intelligence/components/panels";
import { ReviewPanel } from "../features/clinical-intelligence/components/ReviewPanel";

const TABS = [
  { id: "context", label: "Patient context" }, { id: "summary", label: "Summary" }, { id: "timeline", label: "Timeline" },
  { id: "insights", label: "Insights" }, { id: "alerts", label: "Alerts" }, { id: "investigations", label: "Investigations" },
  { id: "medication", label: "Medication & allergy" }, { id: "evidence", label: "Evidence" }, { id: "review", label: "Clinician review" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function ClinicalIntelligence() {
  const { user } = useAuthStore();
  const s = useClinicalStore();
  const [tab, setTab] = useState<TabId>("context");
  const role: string | undefined = user?.role;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void s.init(user); }, [role]);

  const groups = s.analysis ? groupFindings(s.analysis) : null;
  const counts: Partial<Record<TabId, string>> = groups && s.analysis ? {
    insights: String(groups.insights.filter((f) => f.kind === "consideration").length), alerts: String(groups.redFlags.length),
    investigations: String(groups.investigation.length), medication: String(groups.medication.length),
    review: `${s.analysis.reviewProgress.completed}/${s.analysis.reviewProgress.total}`,
  } : {};

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
    if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
  }

  const aiProvider = s.status?.ai.provider ?? "none";
  const aiHelp = aiProvider === "mock" ? "Uses the built-in deterministic demo provider (a fixed template, not a language model)." : aiProvider === "none" ? "No AI provider is configured; deterministic analysis only." : "Sends a de-identified copy of the record to the configured external AI provider.";
  const meta = s.patients.find((p) => p.id === s.selectedId);

  const needsAnalysis = <EmptyState title="Run clinical intelligence" description={s.selectedId ? "Choose “Run clinical intelligence” to generate the analysis for this patient." : "Select a demo patient first."} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="SIH 2026 · Part 4" title="Clinical Intelligence" description="Structured summaries, timelines, alerts and explainable insights that help clinicians review a record. Decision support only." />
      <Notice><strong>Decision support only.</strong> Nothing here is a diagnosis or a prescription. Every clinically significant item requires review by a qualified clinician.</Notice>
      {s.status?.demoMode && <Notice role="status">Demo mode: all patients are synthetic and no real patient data is used.</Notice>}

      {s.boot === "loading" && <LoadingState label="Connecting to Clinical Intelligence…" />}
      {s.boot === "error" && <div className="space-y-3"><Notice tone="danger" role="alert">{s.bootError}</Notice><Button variant="secondary" onClick={() => void s.init(user)}>Try again</Button></div>}

      {s.boot === "ready" && (
        <>
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="ci-patient" className="text-sm font-medium text-slate-900 dark:text-slate-100">Demo patient</label>
              <select id="ci-patient" value={s.selectedId ?? ""} onChange={(e) => { setTab("context"); void s.selectPatient(e.target.value); }} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">Select a demo patient…</option>
                {s.patients.map((p) => <option key={p.id} value={p.id}>{p.label} — {p.scenario}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100"><input type="checkbox" checked={s.useAI} disabled={aiProvider === "none"} onChange={(e) => s.setUseAI(e.target.checked)} className="h-4 w-4" />Include an AI-drafted narrative</label>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{aiHelp}</p>
            </div>
            <Button onClick={() => { setTab("summary"); void s.runAnalysis(); }} disabled={!s.selectedId} loading={s.analysisPhase === "loading"}>Run clinical intelligence</Button>
          </div>

          {s.analysisPhase === "error" && <div className="space-y-3"><Notice tone="danger" role="alert">{s.analysisError}</Notice><Button variant="secondary" onClick={() => void s.runAnalysis()}>Retry analysis</Button></div>}
          {s.analysisPhase === "loading" && <LoadingState label="Running clinical intelligence…" />}

          {s.analysisPhase !== "loading" && (
            <div>
              <div role="tablist" aria-label="Clinical intelligence sections" onKeyDown={onTabKey} className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1 dark:border-slate-800">
                {TABS.map((t) => {
                  const selected = tab === t.id;
                  const alert = t.id === "alerts" && Number(counts.alerts) > 0;
                  return <button key={t.id} role="tab" type="button" id={`ci-tab-${t.id}`} aria-selected={selected} aria-controls={`ci-panel-${t.id}`} tabIndex={selected ? 0 : -1} onClick={() => setTab(t.id)} className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${selected ? "border-cyan-700 text-cyan-800 dark:border-cyan-400 dark:text-cyan-200" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}>{t.label}{counts[t.id] !== undefined && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${alert ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{counts[t.id]}</span>}</button>;
                })}
              </div>
              <div role="tabpanel" id={`ci-panel-${tab}`} aria-labelledby={`ci-tab-${tab}`} className="pt-6">
                {tab === "context" && (s.contextPhase === "loading" ? <LoadingState label="Loading patient record…" /> : s.contextPhase === "error" ? <Notice tone="danger" role="alert">{s.contextError}</Notice> : s.context ? <PatientContextPanel context={s.context} meta={meta} /> : <EmptyState title="Select a demo patient" description="Choose a synthetic patient to view their clinical record, then run clinical intelligence." />)}
                {tab !== "context" && !s.analysis && needsAnalysis}
                {s.analysis && tab === "summary" && <SummaryPanel analysis={s.analysis} />}
                {s.analysis && tab === "timeline" && <TimelinePanel analysis={s.analysis} />}
                {s.analysis && tab === "insights" && <InsightsPanel analysis={s.analysis} />}
                {s.analysis && tab === "alerts" && <AlertsPanel analysis={s.analysis} />}
                {s.analysis && tab === "investigations" && <InvestigationsPanel analysis={s.analysis} />}
                {s.analysis && tab === "medication" && <MedicationPanel analysis={s.analysis} />}
                {s.analysis && tab === "evidence" && <EvidencePanel analysis={s.analysis} />}
                {s.analysis && tab === "review" && <ReviewPanel analysis={s.analysis} canReview={role === "DOCTOR"} busyId={s.reviewBusy} error={s.reviewError} onSubmit={s.submitReview} />}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
