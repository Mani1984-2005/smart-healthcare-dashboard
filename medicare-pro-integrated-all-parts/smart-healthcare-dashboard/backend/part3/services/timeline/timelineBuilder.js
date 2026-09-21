// Builds timeline events from an extraction. A date is only ever taken from the document text; if none exists the event is UNDATED.
import { VERIFICATION } from "../extraction/index.js";

export const DOC_TYPE_LABELS = { prescription: "Prescription", lab_report: "Laboratory report", discharge_summary: "Discharge summary", other: "Medical document" };
export const EVENT_TYPES = ["DOCUMENT", "CLINICAL_EVENT", "PROCEDURE", "DIAGNOSIS", "MEDICATION", "INVESTIGATION"];
const TYPE_ORDER = Object.fromEntries(EVENT_TYPES.map((t, i) => [t, i]));

export function buildTimelineEvents({ document, ocrResultId, extraction, now = new Date().toISOString() }) {
  const dateEntities = extraction.entities.filter((e) => e.kind === "date" && e.fields.isoDate);
  const documentDate = extraction.documentDate;
  const sample = dateEntities.find((e) => e.fields.role === "SAMPLE_COLLECTION_DATE");

  const withDoc = (span) => ({ documentId: document.id, ocrResultId, ...span });
  const docDate = documentDate
    ? { eventDate: documentDate.isoDate, dateBasis: "DOCUMENT_DATE", dateSource: withDoc({ ...documentDate.source, rawText: documentDate.rawText }) }
    : { eventDate: null, dateBasis: "UNKNOWN", dateSource: null };
  const sampleDate = sample
    ? { eventDate: sample.fields.isoDate, dateBasis: "SAMPLE_COLLECTION_DATE", dateSource: withDoc({ ...sample.source, rawText: sample.fields.rawText }) }
    : docDate;

  const events = [];
  const add = (id, entity, eventType, dateInfo, title, details = {}, extra = {}) => {
    events.push({
      id: `evt_${document.id}_${id}`,
      patientId: document.patientId,
      documentId: document.id,
      docType: document.docType,
      entityId: entity?.id ?? null,
      eventType,
      ...dateInfo,
      title,
      details,
      source: entity ? withDoc(entity.source) : withDoc({ start: null, end: null, line: null, text: null }),
      verificationStatus: VERIFICATION,
      synthetic: document.synthetic,
      createdAt: now,
      ...extra,
    });
  };

  add("doc", documentDate ? { id: documentDate.entityId, source: documentDate.source } : null, "DOCUMENT", docDate, DOC_TYPE_LABELS[document.docType] ?? DOC_TYPE_LABELS.other, { docType: document.docType });

  for (const e of extraction.entities) {
    const f = e.fields;
    if (e.kind === "date" && f.isoDate && (f.role === "ADMISSION_DATE" || f.role === "DISCHARGE_DATE")) {
      const admitted = f.role === "ADMISSION_DATE";
      add(e.id, e, "CLINICAL_EVENT", { eventDate: f.isoDate, dateBasis: f.role, dateSource: withDoc({ ...e.source, rawText: f.rawText }) }, admitted ? "Admitted" : "Discharged", { label: f.label });
    } else if (e.kind === "diagnosis") {
      add(e.id, e, "DIAGNOSIS", docDate, `Diagnosis: ${f.name}`);
    } else if (e.kind === "medication") {
      add(e.id, e, "MEDICATION", docDate, `Medication: ${f.name}${f.dosage ? ` ${f.dosage}` : ""}`, { form: f.form, dosage: f.dosage, frequency: f.frequency, directions: f.directions });
    } else if (e.kind === "investigation") {
      add(e.id, e, "INVESTIGATION", sampleDate, `${f.testName}: ${f.value.raw}${f.unit ? ` ${f.unit}` : ""}`,
        { value: f.value, unit: f.unit, referenceRange: f.referenceRange ? f.referenceRange.raw : null, interpretation: f.interpretation },
        { interpretationStatus: f.interpretation.status, interpretationDirection: f.interpretation.direction });
    } else if (e.kind === "procedure") {
      const own = f.date?.isoDate ? { eventDate: f.date.isoDate, dateBasis: "PROCEDURE_DATE", dateSource: withDoc({ ...e.source, rawText: f.date.rawText }) } : docDate;
      add(e.id, e, "PROCEDURE", own, `Procedure: ${f.name}`, { details: f.details, dateRaw: f.date?.rawText ?? null });
    }
  }
  return events;
}

/** Chronological order: dated events by date, then by type, document and position in the document. Undated events are separate. */
export function sortTimelineEvents(events, order = "asc") {
  const dir = order === "desc" ? -1 : 1;
  const dated = events.filter((e) => e.eventDate).sort((a, b) =>
    dir * a.eventDate.localeCompare(b.eventDate) ||
    TYPE_ORDER[a.eventType] - TYPE_ORDER[b.eventType] ||
    a.documentId.localeCompare(b.documentId) ||
    (a.source.start ?? -1) - (b.source.start ?? -1) ||
    a.id.localeCompare(b.id));
  const undated = events.filter((e) => !e.eventDate).sort((a, b) =>
    a.documentId.localeCompare(b.documentId) || TYPE_ORDER[a.eventType] - TYPE_ORDER[b.eventType] || (a.source.start ?? -1) - (b.source.start ?? -1) || a.id.localeCompare(b.id));
  return { dated, undated };
}
