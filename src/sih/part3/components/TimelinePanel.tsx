import { useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePart3Client } from "../services/clientContext";
import { DATE_BASIS_LABEL, EVENT_LABEL, EVENT_TYPES, docTypeLabel, formatDay } from "../services/format";
import { InterpretationBadge, SyntheticBadge } from "./badges";
import ErrorNotice from "./ErrorNotice";
import type { EventType, TimelineEvent } from "../types/part3";

const sourceLink = (e: TimelineEvent) =>
  `/medical-documents/${e.documentId}${e.source.start !== null && e.source.end !== null ? `?start=${e.source.start}&end=${e.source.end}` : ""}`;

function detailLine(e: TimelineEvent): string | null {
  const d = e.details as Record<string, unknown>;
  const parts: unknown[] = e.eventType === "MEDICATION" ? [d.form, d.frequency, d.directions] : e.eventType === "PROCEDURE" ? [d.details] : [];
  const line = parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" · ");
  return line || null;
}

function EventRow({ event }: { event: TimelineEvent }) {
  const interpretation = (event.details as { interpretation?: { explanation?: string } }).interpretation;
  const range = event.eventType === "INVESTIGATION" ? (event.details as { referenceRange?: string | null }).referenceRange : undefined;
  const line = detailLine(event);
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm text-slate-900 dark:text-slate-100"><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">{EVENT_LABEL[event.eventType]}</span>{event.title}</p>
        {line && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{line}</p>}
        {event.eventType === "INVESTIGATION" && (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{range ? `Range printed in document: ${range}` : "No reference range printed in document"}</p>
        )}
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{DATE_BASIS_LABEL[event.dateBasis] ?? event.dateBasis}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {event.interpretationStatus && <InterpretationBadge status={event.interpretationStatus} direction={event.interpretationDirection} explanation={interpretation?.explanation} />}
        <Link to={sourceLink(event)} className="text-xs font-medium text-cyan-700 hover:underline dark:text-cyan-300">View source<span className="sr-only"> for {event.title}</span></Link>
      </div>
    </li>
  );
}

function DocumentGroups({ events }: { events: TimelineEvent[] }) {
  const byDoc = new Map<string, TimelineEvent[]>();
  for (const e of events) byDoc.set(e.documentId, [...(byDoc.get(e.documentId) ?? []), e]);
  return (
    <div className="space-y-3">
      {[...byDoc.entries()].map(([documentId, list]) => (
        <div key={documentId} className="rounded-xl border border-slate-200 px-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-3 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{docTypeLabel(list[0].docType)}</span>
            {list[0].synthetic && <SyntheticBadge />}
            <Link to={`/medical-documents/${documentId}`} className="ml-auto text-xs font-medium text-cyan-700 hover:underline dark:text-cyan-300">Open document</Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">{list.map((e) => <EventRow key={e.id} event={e} />)}</ul>
        </div>
      ))}
    </div>
  );
}

export default function TimelinePanel({ patientId, refreshKey = 0 }: { patientId: string; refreshKey?: number }) {
  const client = usePart3Client();
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [types, setTypes] = useState<EventType[]>([]);
  const timeline = useAsyncData(`timeline:${patientId}:${order}:${types.join(",")}:${refreshKey}`, () => client.getTimeline(patientId, { order, types: types.length ? types : undefined }));
  const toggle = (t: EventType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const data = timeline.data;
  const dates = data ? [...new Set(data.events.map((e) => e.eventDate as string))] : [];
  const empty = data && data.counts.dated === 0 && data.counts.undated === 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by event type" className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => (
            <button key={t} type="button" aria-pressed={types.includes(t)} onClick={() => toggle(t)}
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${types.includes(t) ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
              {EVENT_LABEL[t]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          Order
          <select value={order} onChange={(e) => setOrder(e.target.value as "asc" | "desc")} className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="asc">Oldest first</option><option value="desc">Newest first</option>
          </select>
        </label>
      </div>

      {timeline.error ? <ErrorNotice error={timeline.error} title="The timeline could not be loaded" onRetry={timeline.reload} />
        : !data ? <LoadingState label="Loading timeline…" />
        : empty ? (
          <EmptyState title={types.length ? "No events match this filter" : "No timeline entries yet"} description={types.length ? "Clear the filter to see everything on this patient's timeline." : "Process a document and choose “Add to timeline”. Only dates written in the documents are used."} />
        ) : (
          <div className="space-y-6">
            {dates.map((date) => (
              <section key={date} aria-label={formatDay(date)}>
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDay(date)}</h3>
                <DocumentGroups events={data.events.filter((e) => e.eventDate === date)} />
              </section>
            ))}
            {data.undated.length > 0 && (
              <section aria-label="Undated entries">
                <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Undated</h3>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">No date could be read from these documents. They are never dated by upload time.</p>
                <DocumentGroups events={data.undated} />
              </section>
            )}
          </div>
        )}
    </div>
  );
}
