import { useState } from "react";
import { usePart3Client } from "../services/clientContext";
import { useAsyncData } from "./useAsyncData";
import type { DocStatus } from "../types/part3";

export type Step = "ocr" | "extract" | "timeline";

/** Steps still to run for a document in `status` (used by "Run remaining steps"). */
export function remainingSteps(status: DocStatus | undefined): Step[] {
  switch (status) {
    case "UPLOADED": case "OCR_FAILED": case "OCR_EMPTY": return ["ocr", "extract", "timeline"];
    case "OCR_COMPLETED": return ["extract", "timeline"];
    case "EXTRACTED": return ["timeline"];
    default: return [];
  }
}

export function useDocumentWorkflow(documentId: string) {
  const client = usePart3Client();
  const bundle = useAsyncData(`doc:${documentId}`, () => client.getDocument(documentId));
  const [busyStep, setBusyStep] = useState<Step | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [completed, setCompleted] = useState<Step[]>([]);

  async function run(steps: Step[]) {
    setActionError(null);
    setCompleted([]);
    try {
      for (const step of steps) {
        setBusyStep(step);
        if (step === "ocr") await client.runOcr(documentId);
        else if (step === "extract") await client.runExtraction(documentId);
        else await client.addToTimeline(documentId);
        setCompleted((c) => [...c, step]);
      }
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyStep(null);
      bundle.reload();
    }
  }

  return {
    bundle: bundle.data,
    loading: bundle.loading,
    loadError: bundle.error,
    reload: bundle.reload,
    busyStep,
    completed,
    actionError,
    dismissActionError: () => setActionError(null),
    runStep: (step: Step) => run([step]),
    runRemaining: () => run(remainingSteps(bundle.data?.document.status)),
  };
}
