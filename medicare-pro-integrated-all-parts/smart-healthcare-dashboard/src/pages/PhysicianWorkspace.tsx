import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Bot, CheckCircle2, ClipboardList, History, RotateCcw, ShieldAlert, Sparkles, WifiOff, XCircle } from "lucide-react";
import { PageHeader, Section, Badge, Button, EmptyState, LoadingState, Dialog } from "../components/ui";
import { useAuthStore } from "../store/authStore.js";
import { usePhysicianWorkspaceStore } from "../stores/physicianWorkspaceStore";
import type { SummarySections, SummaryStatus } from "../types/physicianWorkspace";

const SECTION_LABELS: Record<keyof SummarySections, string> = {
  chiefComplaint: "Chief complaint",
  historyOfPresentIllness: "History of present illness",
  pastMedicalHistory: "Past medical history",
  medications: "Current medications",
  allergies: "Allergies",
  familyHistory: "Family history",
  socialHistory: "Social / personal history",
  vitals: "Vitals",
  investigations: "Investigations",
  missingInformation: "Missing information",
};

const STATUS_BADGE: Record<SummaryStatus, { label: string; variant: "info" | "success" | "warning" | "danger" | "neutral" }> = {
  AI_GENERATED: { label: "AI-generated draft", variant: "info" },
  PHYSICIAN_EDITED: { label: "Physician-edited", variant: "warning" },
  APPROVED: { label: "Physician-approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  REVISION_REQUESTED: { label: "Revision requested", variant: "warning" },
};

export default function PhysicianWorkspace() {
  const { user } = useAuthStore();
  const actor = useMemo(
    () => ({ id: user?.id || "demo-user", name: user?.name || "Demo user", role: user?.role || "DOCTOR" }),
    [user]
  );

  const {
    cases,
    casesLoading,
    casesError,
    selectedCase,
    caseLoading,
    caseError,
    summary,
    summarySource,
    summaryLoading,
    summaryError,
    draftSections,
    isDirty,
    versions,
    audit,
    documents,
    documentsLoading,
    clinicalIntelligence,
    ciLoading,
    loadCases,
    selectCase,
    openIntakeSession,
    generateSummary,
    updateDraft,
    saveDraft,
    discardDraft,
    approveSummary,
    rejectSummary,
    reviseSummary,
    loadHistory,
    clearError,
  } = usePhysicianWorkspaceStore();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const intakeSessionId = searchParams.get("intakeSessionId");

  useEffect(() => {
    loadCases(actor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Part 1 -> Part 5 bridge entry point: /physician-workspace?intakeSessionId=<id>
  // opens that real, completed intake session directly, without the
  // physician needing to find it in the (demo) case list first.
  useEffect(() => {
    if (intakeSessionId) {
      openIntakeSession(actor, intakeSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeSessionId]);

  const displaySections: SummarySections | null = summary
    ? ({ ...summary.sections, ...(draftSections || {}) } as SummarySections)
    : null;

  const canEdit = summary && ["AI_GENERATED", "PHYSICIAN_EDITED", "REVISION_REQUESTED"].includes(summary.status);
  const canDecide = summary && ["AI_GENERATED", "PHYSICIAN_EDITED"].includes(summary.status);
  const canRevise = summary && ["AI_GENERATED", "PHYSICIAN_EDITED", "REJECTED", "REVISION_REQUESTED"].includes(summary.status);

  async function handleOpenHistory() {
    await loadHistory(actor);
    setHistoryOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Decision support"
        title="Physician AI Workspace"
        description="Review structured clinical information and an AI-generated draft summary. The physician remains the decision-maker: nothing here is an autonomous diagnosis, prescription, or clinical order."
        actions={
          summarySource === "local" ? (
            <Badge variant="neutral" className="gap-1">
              <WifiOff className="h-3 w-3" aria-hidden="true" /> Offline demo mode
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Section title="Cases" description="Demo clinical cases awaiting physician review." className="h-fit">
          {casesLoading && <LoadingState label="Loading cases…" />}
          {casesError && (
            <EmptyState
              title="Couldn't load cases"
              description={casesError}
              icon={<AlertTriangle className="h-8 w-8" aria-hidden="true" />}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearError();
                    loadCases(actor);
                  }}
                >
                  Retry
                </Button>
              }
            />
          )}
          {!casesLoading && !casesError && cases.length === 0 && (
            <EmptyState title="No cases available" description="There are no demo cases to review right now." />
          )}
          {!casesLoading && !casesError && cases.length > 0 && (
            <ul className="space-y-2">
              {cases.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectCase(actor, c.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${
                      selectedCase?.id === c.id
                        ? "border-cyan-600 bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-950/40"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                    }`}
                  >
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{c.patientName || `Patient ${c.patientId}`}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {c.age != null ? `${c.age} yrs` : "Age not available"} · {c.gender || "Gender not available"} · {c.id}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{c.presentingComplaint}</p>
                    {c.source === "INTAKE_SESSION" && (
                      <Badge variant="info" className="mt-1">
                        Real intake
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="space-y-6">
          {!selectedCase && !caseLoading && (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" aria-hidden="true" />}
              title="Select a case to begin"
              description="Choose a case from the list to review clinical information and generate an AI-assisted draft summary."
            />
          )}

          {caseLoading && <LoadingState label="Loading case…" />}

          {caseError && (
            <EmptyState
              title="Couldn't load this case"
              description={caseError}
              icon={<AlertTriangle className="h-8 w-8" aria-hidden="true" />}
            />
          )}

          {selectedCase && !caseLoading && (
            <>
              <Section
                title="Clinical information"
                description={`${selectedCase.patientName || `Patient ${selectedCase.patientId}`} · ${
                  selectedCase.age != null ? `${selectedCase.age} yrs` : "Age not available"
                } · ${selectedCase.gender || "Gender not available"}`}
              >
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Presenting complaint" value={selectedCase.presentingComplaint || "Not available"} />
                  <Field label="History of present illness" value={selectedCase.historyOfPresentIllness || "Not available"} />
                  <Field label="Past medical history" value={joinOrNA(selectedCase.pastMedicalHistory)} />
                  <Field label="Current medications" value={joinOrNA(selectedCase.medications)} />
                  <Field
                    label="Allergies"
                    value={
                      selectedCase.allergies === undefined
                        ? "Not available"
                        : selectedCase.allergies.length > 0
                          ? selectedCase.allergies.join("; ")
                          : "No known drug allergies documented."
                    }
                  />
                  <Field label="Family history" value={selectedCase.familyHistory || "Not available"} />
                  <Field label="Social history" value={selectedCase.socialHistory || "Not available"} />
                  <Field
                    label="Vitals"
                    value={selectedCase.vitals && selectedCase.vitals.length > 0 ? selectedCase.vitals.map((v) => `${v.label}: ${v.value}`).join("; ") : "Not available"}
                  />
                  <Field
                    label="Investigations"
                    value={
                      selectedCase.labResults && selectedCase.labResults.length > 0
                        ? selectedCase.labResults.map((l) => `${l.test}: ${l.value} (${l.flag})`).join("; ")
                        : "No laboratory investigations on file."
                    }
                  />
                </dl>
              </Section>

              <Section
                title="Documents"
                description="Uploaded and OCR-extracted patient documents. OCR text is unverified — clinician review required."
              >
                {documentsLoading && <LoadingState label="Loading documents…" />}
                {!documentsLoading && documents.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No documents on file for this patient.</p>
                )}
                {!documentsLoading && documents.length > 0 && (
                  <ul className="space-y-3">
                    {documents.map((doc) => (
                      <li key={doc.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {doc.docType} — {doc.originalFilename}
                          </p>
                          <Badge variant={doc.ocrText ? "success" : "neutral"}>{doc.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                          {doc.origin === "SYNTHETIC_FIXTURE" ? " · synthetic demo document" : ""}
                        </p>
                        {doc.ocrText ? (
                          <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <span className="font-semibold">OCR text (unverified):</span> {doc.ocrText}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No OCR text available yet.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section
                title="Clinical intelligence"
                description="AI-assisted and rule-based decision support. Not a diagnosis — physician review required."
              >
                {ciLoading && <LoadingState label="Loading clinical intelligence…" />}
                {!ciLoading && clinicalIntelligence.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No clinical-intelligence analysis has been generated for this patient yet.</p>
                )}
                {!ciLoading &&
                  clinicalIntelligence.map((analysis) => (
                    <div key={analysis.analysisId} className="mb-4 rounded-lg border border-slate-200 p-3 last:mb-0 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Generated {new Date(analysis.generatedAt).toLocaleString()} · {analysis.mode} mode
                        </p>
                        <Badge variant="neutral">{analysis.disclaimer}</Badge>
                      </div>
                      {analysis.aiNarrative && (
                        <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <span className="font-semibold">AI narrative (unverified):</span> {analysis.aiNarrative}
                        </p>
                      )}
                      <ul className="mt-2 space-y-1.5">
                        {analysis.findings.map((f) => (
                          <li key={f.id} className="flex items-start gap-2 text-sm">
                            <Badge variant={f.origin === "ai" ? "info" : "neutral"}>{f.origin === "ai" ? "AI" : "Rule"}</Badge>
                            <span className="text-slate-700 dark:text-slate-300">
                              {f.statement}
                              {f.reviewRequired ? <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(review required)</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </Section>

              <Section
                title="AI-generated summary"
                description="Decision support only. Review carefully before approving."
                action={
                  !summary ? (
                    <Button onClick={() => generateSummary(actor)} loading={summaryLoading}>
                      <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate summary
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_BADGE[summary.status].variant}>{STATUS_BADGE[summary.status].label}</Badge>
                      <Button variant="secondary" onClick={handleOpenHistory}>
                        <History className="h-4 w-4" aria-hidden="true" /> History
                      </Button>
                    </div>
                  )
                }
              >
                {!summary && !summaryLoading && (
                  <EmptyState
                    icon={<Bot className="h-8 w-8" aria-hidden="true" />}
                    title="No summary generated yet"
                    description="Generate an AI-assisted draft from the clinical information above. This is decision support only — you will review, edit and approve before it becomes a clinical artifact."
                  />
                )}

                {summaryLoading && <LoadingState label="Working…" />}

                {summaryError && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{summaryError}</span>
                  </div>
                )}

                {summary && displaySections && !summaryLoading && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{summary.aiMeta.disclaimer}</span>
                    </div>

                    {summary.flags.length > 0 && (
                      <div className="space-y-1.5">
                        {summary.flags.map((flag, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {flag}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {(Object.keys(SECTION_LABELS) as (keyof SummarySections)[]).map((key) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {SECTION_LABELS[key]}
                          </label>
                          <textarea
                            disabled={!canEdit}
                            value={displaySections[key]}
                            onChange={(e) => updateDraft({ [key]: e.target.value } as Partial<SummarySections>)}
                            rows={key === "chiefComplaint" || key === "allergies" ? 2 : 3}
                            className="mt-1 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                      {canEdit && (
                        <>
                          <Button onClick={() => saveDraft(actor)} disabled={!isDirty}>
                            Save edits
                          </Button>
                          <Button variant="ghost" onClick={discardDraft} disabled={!isDirty}>
                            Discard edits
                          </Button>
                        </>
                      )}
                      {canDecide && (
                        <>
                          <Button
                            variant="primary"
                            className="bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600"
                            onClick={() => approveSummary(actor)}
                            disabled={isDirty}
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
                          </Button>
                          <Button variant="danger" onClick={() => setRejectOpen(true)} disabled={isDirty}>
                            <XCircle className="h-4 w-4" aria-hidden="true" /> Reject
                          </Button>
                        </>
                      )}
                      {canRevise && (
                        <Button variant="secondary" onClick={() => reviseSummary(actor)} disabled={isDirty}>
                          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Regenerate draft
                        </Button>
                      )}
                      {isDirty && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Save or discard edits before approving or rejecting.</span>
                      )}
                    </div>

                    {summary.status === "REJECTED" && summary.revisionNote && (
                      <p className="text-xs text-rose-700 dark:text-rose-300">Rejection reason: {summary.revisionNote}</p>
                    )}
                    {summary.approvedBy && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        Approved by {summary.approvedBy.name} ({summary.approvedBy.role})
                      </p>
                    )}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject AI-generated summary">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Provide a reason so this can be tracked in the audit trail and used to guide the next draft.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="e.g. Missing recent lab results, please regenerate once available."
            className="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejectOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!rejectReason.trim()}
            onClick={async () => {
              await rejectSummary(actor, rejectReason.trim());
              setRejectReason("");
              setRejectOpen(false);
            }}
          >
            Confirm rejection
          </Button>
        </div>
      </Dialog>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} title="Version history & audit trail">
        <div className="max-h-[60vh] space-y-6 overflow-y-auto">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Versions</h3>
            {versions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No versions recorded yet.</p>}
            <ol className="space-y-2">
              {versions.map((v) => (
                <li key={v.version} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    v{v.version} · {v.changeType} · {STATUS_BADGE[v.status]?.label || v.status}
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {v.actor?.name || "Unknown"} ({v.actor?.role || "unknown"}) · {new Date(v.timestamp).toLocaleString()}
                  </p>
                  {v.note && <p className="mt-1 text-slate-600 dark:text-slate-300">Note: {v.note}</p>}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Audit trail</h3>
            {audit.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No audit events recorded yet.</p>}
            <ol className="space-y-2">
              {audit.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{entry.action}</p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {entry.actor.name} ({entry.actor.role}) · {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => setHistoryOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function joinOrNA(list?: string[]): string {
  if (!list || list.length === 0) return "Not available";
  return list.join("; ");
}
