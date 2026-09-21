import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { UnverifiedBadge } from "./badges";
import { NOT_STATED, formatDay } from "../services/format";
import type { DateEntity, DiagnosisEntity, Extraction, MedicationEntity, ProcedureEntity } from "../types/part3";
import type { Span } from "./OcrTextPane";

const Unknown = () => <span className="italic text-slate-400 dark:text-slate-500">{NOT_STATED}</span>;
const H = ({ children }: { children: string }) => <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900 first:mt-0 dark:text-slate-100">{children}</h3>;
const ShowBtn = ({ span, onShow }: { span: Span; onShow: (s: Span) => void }) => (
  <Button variant="ghost" className="min-h-8 whitespace-nowrap px-2 py-1 text-xs" onClick={() => onShow(span)}>Show in text</Button>
);

const DATE_ROLE: Record<string, string> = {
  ADMISSION_DATE: "Admission", DISCHARGE_DATE: "Discharge", SAMPLE_COLLECTION_DATE: "Sample collected", REPORT_DATE: "Report date", PRESCRIPTION_DATE: "Prescription date",
  PROCEDURE_DATE: "Procedure date", FOLLOW_UP_DATE: "Follow-up", DATE: "Date", OTHER_DATE: "Other date in text",
};

export default function EntitiesPane({ extraction, onShowInText }: { extraction: Extraction | null; onShowInText: (span: Span) => void }) {
  if (!extraction) return <EmptyState title="No extracted data yet" description="Run “Extract data” to see diagnoses, medicines, procedures and dates found in the text." />;
  const of = <K extends string>(kind: K) => extraction.entities.filter((e) => e.kind === kind);
  const dx = of("diagnosis") as DiagnosisEntity[];
  const meds = of("medication") as MedicationEntity[];
  const procs = of("procedure") as ProcedureEntity[];
  const dates = of("date") as DateEntity[];
  const labs = extraction.stats.investigations;
  const span = (e: { source: { start: number; end: number } }) => ({ start: e.source.start, end: e.source.end });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2"><UnverifiedBadge /><span className="text-xs text-slate-500 dark:text-slate-400">Read by {extraction.extractor.id} v{extraction.extractor.version}. Items marked “{NOT_STATED}” were not written in the document.</span></div>

      <H>Dates</H>
      {dates.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">No dates were found in the text. Timeline entries from this document will be shown as undated.</p> : (
        <ul className="space-y-2 text-sm">
          {dates.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3">
              <span className="font-medium text-slate-900 dark:text-slate-100">{DATE_ROLE[d.fields.role] ?? d.fields.role}</span>
              <span>{d.fields.isoDate ? formatDay(d.fields.isoDate) : <>“{d.fields.rawText}” <em className="text-amber-700 dark:text-amber-300">could not be converted to a date</em></>}</span>
              {extraction.documentDate?.entityId === d.id && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200">Used as document date</span>}
              <ShowBtn span={span(d)} onShow={onShowInText} />
            </li>
          ))}
        </ul>
      )}

      <H>Diagnoses</H>
      {dx.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">None found.</p> : <ul className="space-y-1 text-sm">{dx.map((d) => <li key={d.id} className="flex items-center gap-2">{d.fields.name}<ShowBtn span={span(d)} onShow={onShowInText} /></li>)}</ul>}

      <H>Procedures</H>
      {procs.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">None found.</p> : (
        <ul className="space-y-1 text-sm">{procs.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-2">
            <span className="font-medium">{p.fields.name}</span>
            <span className="text-slate-600 dark:text-slate-300">— {p.fields.date ? (p.fields.date.isoDate ? formatDay(p.fields.date.isoDate) : `“${p.fields.date.rawText}” (unreadable date)`) : "date not stated"}</span>
            <ShowBtn span={span(p)} onShow={onShowInText} />
          </li>))}
        </ul>
      )}

      <H>Medications</H>
      {meds.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">None found.</p> : (
        <div className="relative overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Medications found in the document, as written</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr>{["Medicine", "Form", "Dose", "Frequency", "Directions"].map((h) => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}<th scope="col" className="px-4 py-3"><span className="sr-only">Source</span></th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {meds.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{m.fields.name}</th>
                  <td className="px-4 py-3">{m.fields.form ?? <Unknown />}</td><td className="px-4 py-3">{m.fields.dosage ?? <Unknown />}</td>
                  <td className="px-4 py-3">{m.fields.frequency ?? <Unknown />}</td><td className="px-4 py-3">{m.fields.directions ?? <Unknown />}</td>
                  <td className="px-4 py-3 text-right"><ShowBtn span={span(m)} onShow={onShowInText} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <H>Laboratory results</H>
      <p className="text-sm text-slate-600 dark:text-slate-300">{labs ? `${labs} result${labs === 1 ? "" : "s"} found — see the “Lab results” tab.` : "None found."}</p>

      {extraction.warnings.length > 0 && (
        <details className="mt-6 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
          <summary className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">{extraction.warnings.length} note{extraction.warnings.length === 1 ? "" : "s"} from extraction</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">{extraction.warnings.map((w, i) => <li key={`${w.code}-${i}`}>{w.message}{w.line ? ` (line ${w.line})` : ""}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
