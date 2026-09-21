import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import Section from "../../components/ui/Section";
import { useAuthStore } from "../../store/authStore.js";
import ActivityPanel from "../components/ActivityPanel";
import DocumentViewer from "../components/DocumentViewer";
import EntitiesPane from "../components/EntitiesPane";
import ErrorNotice from "../components/ErrorNotice";
import LabResultsPane from "../components/LabResultsPane";
import OcrTextPane, { Span } from "../components/OcrTextPane";
import PageIntro from "../components/PageIntro";
import Part3Provider from "../components/Part3Provider";
import WorkflowStepper from "../components/WorkflowStepper";
import { SafetyBanner, StatusBadge, SyntheticBadge } from "../components/badges";
import { remainingSteps, useDocumentWorkflow } from "../hooks/useDocumentWorkflow";
import { docTypeLabel, formatBytes, formatDateTime } from "../services/format";
import type { DocStatus } from "../types/part3";

type TabId = "ocr" | "entities" | "labs" | "activity";
const TAB_LABEL: Record<TabId, string> = { ocr: "OCR text", entities: "Extracted data", labs: "Lab results", activity: "Activity" };

function defaultTab(status: DocStatus, hasLabs: boolean): TabId {
  if (status === "EXTRACTED" || status === "ON_TIMELINE") return hasLabs ? "labs" : "entities";
  return "ocr";
}

function Workspace({ documentId }: { documentId: string }) {
  const wf = useDocumentWorkflow(documentId);
  const [params] = useSearchParams();
  const role = useAuthStore((s: { user: { role?: string } | null }) => s.user?.role);
  const [userTab, setUserTab] = useState<TabId | null>(null);
  const [picked, setPicked] = useState<Span | null>(null);

  const fromLink = (() => {
    const start = Number(params.get("start"));
    const end = Number(params.get("end"));
    return params.has("start") && Number.isInteger(start) && Number.isInteger(end) && end > start ? { start, end } : null;
  })();
  const highlight = picked ?? fromLink;

  if (wf.loadError) return <div className="space-y-4"><BackLink /><ErrorNotice error={wf.loadError} title="This document could not be loaded" onRetry={wf.reload} /></div>;
  if (!wf.bundle) return <div className="space-y-4"><BackLink /><LoadingState label="Loading document…" /></div>;

  const { document: doc, ocr, extraction } = wf.bundle;
  const hasLabs = (extraction?.stats.investigations ?? 0) > 0;
  const tabs: TabId[] = ["ocr", ...(extraction ? (["entities", "labs"] as TabId[]) : []), ...(role === "ADMIN" ? (["activity"] as TabId[]) : [])];
  const wanted = userTab ?? (highlight ? "ocr" : defaultTab(doc.status, hasLabs));
  const tab = tabs.includes(wanted) ? wanted : "ocr";
  const showInText = (span: Span) => { setPicked(span); setUserTab("ocr"); };
  const steps = remainingSteps(doc.status);
  const busy = wf.busyStep !== null;

  return (
    <div className="space-y-6">
      <BackLink />
      <PageIntro
        eyebrow="Medical document"
        title={docTypeLabel(doc.docType)}
        description={`${doc.originalFilename} · ${formatBytes(doc.sizeBytes)} · added ${formatDateTime(doc.uploadedAt)}`}
        actions={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={doc.status} />{doc.synthetic && <SyntheticBadge />}{doc.status === "ON_TIMELINE" && <Link to="/medical-documents?view=timeline" className="text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">View patient timeline</Link>}</div>}
      />
      <SafetyBanner />

      <Section title="Processing" description="Each step is run by you and can be repeated safely.">
        {wf.actionError !== null && <div className="mb-4"><ErrorNotice error={wf.actionError} title="A step could not be completed" /></div>}
        <WorkflowStepper status={doc.status} busyStep={wf.busyStep} canRunRemaining={steps.length > 1} onRun={(s) => { setUserTab(null); wf.runStep(s); }} onRunRemaining={() => { setUserTab(null); wf.runRemaining(); }} />
        {wf.completed.length > 0 && !busy && wf.actionError === null && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">Completed: {wf.completed.map((s) => ({ ocr: "OCR", extract: "data extraction", timeline: "timeline" })[s]).join(", ")}.</p>}
      </Section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]">
        <Section title="Original document"><DocumentViewer document={doc} /></Section>
        <Section>
          <div role="tablist" aria-label="Document results" className="-mt-2 mb-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
            {tabs.map((t) => (
              <button key={t} role="tab" type="button" id={`ws-tab-${t}`} aria-selected={tab === t} aria-controls={`ws-panel-${t}`} onClick={() => setUserTab(t)}
                className={`min-h-11 border-b-2 px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${tab === t ? "border-cyan-700 text-cyan-800 dark:text-cyan-200" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300"}`}>{TAB_LABEL[t]}</button>
            ))}
          </div>
          <div role="tabpanel" id={`ws-panel-${tab}`} aria-labelledby={`ws-tab-${tab}`}>
            {tab === "ocr" && <OcrTextPane ocr={ocr} status={doc.status} highlight={highlight} />}
            {tab === "entities" && <EntitiesPane extraction={extraction} onShowInText={showInText} />}
            {tab === "labs" && <LabResultsPane extraction={extraction} onShowInText={showInText} />}
            {tab === "activity" && <ActivityPanel documentId={documentId} refreshKey={wf.completed.length} />}
          </div>
        </Section>
      </div>
    </div>
  );
}

const BackLink = () => (
  <Link to="/medical-documents" className="inline-flex items-center gap-1 text-sm font-medium text-cyan-700 hover:underline dark:text-cyan-300"><ArrowLeft className="h-4 w-4" aria-hidden="true" />All medical documents</Link>
);

export default function DocumentWorkspacePage() {
  const { documentId } = useParams();
  return (
    <Part3Provider>
      {documentId ? <Workspace documentId={documentId} key={documentId} /> : <EmptyState title="No document selected" action={<Link to="/medical-documents"><Button>Back to documents</Button></Link>} />}
    </Part3Provider>
  );
}
