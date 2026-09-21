import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { InterpretationBadge } from "./badges";
import { NOT_STATED } from "../services/format";
import type { Extraction, InvestigationEntity } from "../types/part3";
import type { Span } from "./OcrTextPane";

const Unknown = ({ children = NOT_STATED }: { children?: string }) => <span className="italic text-slate-400 dark:text-slate-500">{children}</span>;

export default function LabResultsPane({ extraction, onShowInText }: { extraction: Extraction | null; onShowInText: (span: Span) => void }) {
  if (!extraction) return <EmptyState title="No extracted data yet" description="Extract medical data first; laboratory results will appear here." />;
  const rows = extraction.entities.filter((e): e is InvestigationEntity => e.kind === "investigation");
  if (!rows.length) return <EmptyState title="No laboratory results found" description="No test results were found in this document's text." />;

  const count = (s: string) => rows.filter((r) => r.fields.interpretation.status === s).length;
  return (
    <div>
      <p className="text-sm text-slate-700 dark:text-slate-200" aria-live="polite">
        <strong>{rows.length}</strong> results · <span className="font-semibold text-rose-700 dark:text-rose-300">{count("OUTSIDE_RANGE")} outside provided range</span> ·{" "}
        {count("WITHIN_RANGE")} within · {count("UNABLE_TO_DETERMINE")} unable to determine
      </p>
      <div className="relative mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Laboratory results compared with the reference range printed in the document</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3">Test</th><th scope="col" className="px-3 py-3">Result</th><th scope="col" className="px-3 py-3">Comparison</th>
              <th scope="col" className="px-3 py-3">Range printed in document</th><th scope="col" className="px-3 py-3"><span className="sr-only">Source</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => {
              const { interpretation: i, value } = r.fields;
              const outside = i.status === "OUTSIDE_RANGE";
              return (
                <tr key={r.id} data-status={i.status} className={outside ? "bg-rose-50/70 dark:bg-rose-950/20" : undefined}>
                  <th scope="row" className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">{r.fields.testName}</th>
                  <td className="px-3 py-3">
                    <span className={outside ? "font-bold text-rose-700 dark:text-rose-300" : "text-slate-800 dark:text-slate-100"}>{value.raw}</span>{" "}
                    <span className="text-xs text-slate-500 dark:text-slate-400">{r.fields.unit ?? <Unknown>unit not stated</Unknown>}</span>
                  </td>
                  <td className="px-3 py-3">
                    <InterpretationBadge status={i.status} direction={i.direction} explanation={i.explanation} />
                    {i.status === "UNABLE_TO_DETERMINE" && <p className="mt-1 max-w-[16rem] text-xs text-slate-500 dark:text-slate-400">{i.explanation}</p>}
                  </td>
                  <td className="px-3 py-3">{r.fields.referenceRange?.raw ?? <Unknown>Not printed in document</Unknown>}</td>
                  <td className="px-3 py-3 text-right"><Button variant="ghost" className="min-h-8 whitespace-nowrap px-2 py-1 text-xs" onClick={() => onShowInText({ start: r.source.start, end: r.source.end })}>Show in text</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Each result is compared <strong>only</strong> with the reference range printed in this document — no other ranges are used, and units are never converted. Where the document gives no
        usable range, the result is shown as “Unable to determine”. Software-generated; not clinician-confirmed; not a diagnosis.
      </p>
    </div>
  );
}
