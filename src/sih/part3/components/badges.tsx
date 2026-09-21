import { ArrowDown, ArrowUp, CircleCheck, CircleHelp, FlaskConical, ShieldAlert } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { statusLabel } from "../services/format";
import type { DocStatus, InterpretationStatus, OcrProvider } from "../types/part3";

/** Shown on every Part 3 screen. Plain language, always visible. */
export function SafetyBanner() {
  return (
    <div role="note" aria-label="Medical safety notice" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Documentation aid — not clinical advice</p>
        <p className="mt-1 leading-6">
          Text and values on these screens were read from documents by software and are <strong>not clinician-confirmed</strong>. Lab flags compare a result only with the
          reference range printed in the same document. Nothing here is a diagnosis or a treatment decision. Prototype: use synthetic or de-identified documents only.
        </p>
      </div>
    </div>
  );
}

export const SyntheticBadge = () => <Badge variant="warning">Synthetic demo data</Badge>;
export const UnverifiedBadge = () => <Badge variant="neutral" title="Read by software from the document; not confirmed by a clinician">Extracted · not clinician-confirmed</Badge>;

export function ProviderBadge({ provider }: { provider: OcrProvider }) {
  return provider.kind === "demo"
    ? <Badge variant="warning" title="This provider returns a recorded transcript of the bundled synthetic documents. It does not recognise images.">Demo OCR · recorded transcript</Badge>
    : <Badge variant="info">OCR engine: {provider.label}</Badge>;
}

const STATUS_VARIANT: Record<DocStatus, "info" | "success" | "warning" | "danger" | "neutral"> = {
  UPLOADED: "neutral", OCR_IN_PROGRESS: "info", OCR_COMPLETED: "info", OCR_EMPTY: "warning", OCR_FAILED: "danger", EXTRACTED: "info", ON_TIMELINE: "success",
};
export const StatusBadge = ({ status }: { status: DocStatus }) => <Badge variant={STATUS_VARIANT[status]}>{statusLabel(status)}</Badge>;

/** The three lab states. Always text + icon (never colour alone). Only ever reflects the range printed in the document. */
export function InterpretationBadge({ status, direction, explanation }: { status: InterpretationStatus; direction: "BELOW" | "ABOVE" | null | undefined; explanation?: string }) {
  if (status === "WITHIN_RANGE") {
    return <Badge variant="success" className="whitespace-nowrap" title={explanation}><CircleCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Within provided range</Badge>;
  }
  if (status === "OUTSIDE_RANGE") {
    const Icon = direction === "BELOW" ? ArrowDown : ArrowUp;
    return <Badge variant="danger" className="whitespace-nowrap" title={explanation}><Icon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{direction === "BELOW" ? "Below" : "Above"} provided range</Badge>;
  }
  return <Badge variant="neutral" className="whitespace-nowrap" title={explanation}><CircleHelp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Unable to determine</Badge>;
}

export const LabIcon = () => <FlaskConical className="h-4 w-4" aria-hidden="true" />;
