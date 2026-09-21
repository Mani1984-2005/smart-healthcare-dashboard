import { useEffect, useRef } from "react";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import { ProviderBadge } from "./badges";
import type { DocStatus, OcrResult } from "../types/part3";

export interface Span { start: number; end: number }

export default function OcrTextPane({ ocr, status, highlight }: { ocr: OcrResult | null; status: DocStatus; highlight: Span | null }) {
  const markRef = useRef<HTMLElement>(null);
  useEffect(() => { markRef.current?.scrollIntoView?.({ block: "center" }); }, [highlight?.start, highlight?.end, ocr?.id]);

  if (status === "OCR_IN_PROGRESS") return <LoadingState label="Reading the document…" />;
  if (!ocr) return <EmptyState title="OCR has not been run" description="Run OCR to turn this document into text." />;
  if (ocr.status === "failed") {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
        <p className="font-semibold">The document could not be read</p>
        <p className="mt-1 leading-6">{ocr.errorMessage ?? "OCR failed."}</p>
        <p className="mt-1 text-xs opacity-80">Code: {ocr.errorCode} · No text was produced, and none has been guessed.</p>
      </div>
    );
  }
  if (ocr.status === "empty") return <EmptyState title="No text was found" description="OCR completed but the document contains no readable text. Nothing was extracted." />;

  const valid = highlight && highlight.start >= 0 && highlight.end > highlight.start && highlight.end <= ocr.text.length ? highlight : null;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <ProviderBadge provider={ocr.provider} />
        <span>{ocr.textLength.toLocaleString()} characters</span>
        <span>· {ocr.durationMs} ms</span>
        <span>· Confidence: {ocr.providerConfidence === null ? "not reported by provider" : `${Math.round(ocr.providerConfidence * 100)}%`}</span>
      </div>
      <pre aria-label="Text read from the document" className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[13px] leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {valid ? (
          <>
            {ocr.text.slice(0, valid.start)}
            <mark ref={markRef} className="rounded bg-yellow-200 px-0.5 text-slate-900 dark:bg-yellow-400/80">{ocr.text.slice(valid.start, valid.end)}</mark>
            {ocr.text.slice(valid.end)}
          </>
        ) : ocr.text}
      </pre>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Shown exactly as returned by OCR; it has not been edited or corrected.</p>
    </div>
  );
}
