import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import LoadingState from "../../components/ui/LoadingState";
import Section from "../../components/ui/Section";
import { useAuthStore } from "../../store/authStore.js";
import DocumentList from "../components/DocumentList";
import DocumentPicker from "../components/DocumentPicker";
import ErrorNotice from "../components/ErrorNotice";
import PageIntro from "../components/PageIntro";
import Part3Provider from "../components/Part3Provider";
import TimelinePanel from "../components/TimelinePanel";
import { SafetyBanner, SyntheticBadge } from "../components/badges";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePart3Client } from "../services/clientContext";
import { describeError } from "../services/errors";

const VIEWS = [
  { id: "documents", label: "Documents" },
  { id: "add", label: "Add a document" },
  { id: "timeline", label: "Timeline" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

function MedicalDocuments() {
  const client = usePart3Client();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const role = useAuthStore((s: { user: { role?: string } | null }) => s.user?.role);
  const [dataVersion, setDataVersion] = useState(0);
  const [patientChoice, setPatientChoice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const patients = useAsyncData(`patients:${dataVersion}`, () => client.listPatients());
  const patientId = patientChoice ?? patients.data?.[0]?.id ?? null;
  const requested = params.get("view");
  const view: ViewId = VIEWS.some((v) => v.id === requested) ? (requested as ViewId) : "documents";
  const setView = (id: ViewId) => setParams({ view: id }, { replace: true });

  async function reset() {
    setResetting(true); setResetError(null);
    try { await client.resetDemo(); setConfirmReset(false); setDataVersion((v) => v + 1); } catch (e) { setResetError(describeError(e)); } finally { setResetting(false); }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Medical Documents & OCR"
        title="Medical documents"
        description="Bring scanned prescriptions, lab reports and discharge summaries into a structured, chronological record."
        actions={role === "ADMIN" ? <Button variant="secondary" onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset demo data</Button> : undefined}
      />
      <SafetyBanner />

      {patients.error ? <ErrorNotice error={patients.error} title="Patients could not be loaded" onRetry={patients.reload} />
        : !patients.data || !patientId ? <LoadingState label="Loading…" />
        : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex max-w-full flex-wrap items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Patient
                <select value={patientId} onChange={(e) => setPatientChoice(e.target.value)} className="min-h-10 max-w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
                  {patients.data.map((p) => <option key={p.id} value={p.id}>{p.displayName} ({p.id}) — {p.documentCount} document{p.documentCount === 1 ? "" : "s"}</option>)}
                </select>
              </label>
              <SyntheticBadge />
            </div>

            <div role="tablist" aria-label="Medical documents views" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
              {VIEWS.map((v) => (
                <button key={v.id} role="tab" type="button" id={`tab-${v.id}`} aria-selected={view === v.id} aria-controls={`panel-${v.id}`} onClick={() => setView(v.id)}
                  className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${view === v.id ? "border-cyan-700 text-cyan-800 dark:text-cyan-200" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300"}`}>
                  {v.label}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}>
              {view === "documents" && <Section title="Documents"><DocumentList patientId={patientId} refreshKey={dataVersion} onAdd={() => setView("add")} /></Section>}
              {view === "add" && <DocumentPicker patientId={patientId} patients={patients.data} onOpened={(id) => navigate(`/medical-documents/${id}`)} />}
              {view === "timeline" && <Section title="Patient timeline" description="Findings from processed documents, in date order. Dates come only from the documents themselves."><TimelinePanel patientId={patientId} refreshKey={dataVersion} /></Section>}
            </div>
          </>
        )}

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" loading={resetting} onClick={reset}>Reset everything</Button></div>}>
        <p className="text-sm leading-6">This clears every Part 3 document, OCR result, extraction, timeline entry and the activity history. The synthetic demo documents stay available. This cannot be undone.</p>
        {resetError && <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">{resetError}</p>}
      </Dialog>
    </div>
  );
}

export default function MedicalDocumentsPage() {
  return <Part3Provider><MedicalDocuments /></Part3Provider>;
}
