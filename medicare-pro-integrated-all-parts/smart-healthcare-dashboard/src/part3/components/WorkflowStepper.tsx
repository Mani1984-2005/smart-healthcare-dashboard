import { CircleAlert, CircleCheck, Circle, LoaderCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import type { Step } from "../hooks/useDocumentWorkflow";
import type { DocStatus } from "../types/part3";

type State = "done" | "next" | "pending" | "failed" | "running";
const PAST_OCR: DocStatus[] = ["OCR_COMPLETED", "EXTRACTED", "ON_TIMELINE"];

function stepStates(status: DocStatus, busy: Step | null): Record<Step, State> {
  const ocr: State = busy === "ocr" ? "running" : PAST_OCR.includes(status) ? "done" : status === "OCR_FAILED" || status === "OCR_EMPTY" ? "failed" : "next";
  const afterOcr = PAST_OCR.includes(status);
  const extract: State = busy === "extract" ? "running" : status === "EXTRACTED" || status === "ON_TIMELINE" ? "done" : afterOcr ? "next" : "pending";
  const timeline: State = busy === "timeline" ? "running" : status === "ON_TIMELINE" ? "done" : status === "EXTRACTED" ? "next" : "pending";
  return { ocr, extract, timeline };
}

const LABELS: Record<Step, { title: string; action: string; hint: string }> = {
  ocr: { title: "Read text (OCR)", action: "Run OCR", hint: "Turns the scan into text." },
  extract: { title: "Extract medical data", action: "Extract data", hint: "Finds diagnoses, medicines, lab values and dates in the text." },
  timeline: { title: "Add to timeline", action: "Add to timeline", hint: "Places the dated findings on the patient timeline." },
};

function Icon({ state }: { state: State }) {
  if (state === "done") return <CircleCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />;
  if (state === "failed") return <CircleAlert className="h-5 w-5 text-rose-600" aria-hidden="true" />;
  if (state === "running") return <LoaderCircle className="h-5 w-5 animate-spin text-cyan-700" aria-hidden="true" />;
  return <Circle className={`h-5 w-5 ${state === "next" ? "text-cyan-700" : "text-slate-300 dark:text-slate-600"}`} aria-hidden="true" />;
}

const STATE_TEXT: Record<State, string> = { done: "Done", next: "Ready", pending: "Waiting", failed: "Needs attention", running: "Running…" };

export default function WorkflowStepper({ status, busyStep, canRunRemaining, onRun, onRunRemaining }: {
  status: DocStatus; busyStep: Step | null; canRunRemaining: boolean; onRun: (step: Step) => void; onRunRemaining: () => void;
}) {
  const states = stepStates(status, busyStep);
  const busy = busyStep !== null;
  return (
    <div>
      <ol className="grid gap-3 md:grid-cols-3" aria-label="Document processing steps">
        {(Object.keys(LABELS) as Step[]).map((step, i) => {
          const state = states[step];
          const label = LABELS[step];
          const actionable = (state === "next" || state === "failed") && !busy;
          return (
            <li key={step} aria-current={state === "next" || state === "failed" ? "step" : undefined} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Icon state={state} />
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{i + 1}. {label.title}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{STATE_TEXT[state]} — {label.hint}</p>
              {actionable && (
                <Button variant={state === "failed" ? "secondary" : "primary"} className="mt-3" onClick={() => onRun(step)}>
                  {state === "failed" && step === "ocr" ? "Retry OCR" : label.action}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {canRunRemaining && (
        <div className="mt-3">
          <Button variant="secondary" loading={busy} disabled={busy} onClick={onRunRemaining}>Run all remaining steps</Button>
        </div>
      )}
    </div>
  );
}
