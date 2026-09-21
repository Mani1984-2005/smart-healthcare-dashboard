import type { DocStatus, DocType, EventType } from "../types/part3";

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  prescription: "Prescription", lab_report: "Laboratory report", discharge_summary: "Discharge summary", other: "Other document",
};
export const docTypeLabel = (t: string) => DOC_TYPE_LABEL[t as DocType] ?? t;

export const STATUS_LABEL: Record<DocStatus, string> = {
  UPLOADED: "Uploaded", OCR_IN_PROGRESS: "OCR running", OCR_COMPLETED: "OCR done", OCR_EMPTY: "No text found", OCR_FAILED: "OCR failed", EXTRACTED: "Data extracted", ON_TIMELINE: "On timeline",
};
export const statusLabel = (s: string) => STATUS_LABEL[s as DocStatus] ?? s;

export const EVENT_LABEL: Record<EventType, string> = {
  DOCUMENT: "Document", CLINICAL_EVENT: "Clinical event", PROCEDURE: "Procedure", DIAGNOSIS: "Diagnosis", MEDICATION: "Medication", INVESTIGATION: "Investigation",
};
export const EVENT_TYPES = Object.keys(EVENT_LABEL) as EventType[];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Formats a YYYY-MM-DD document date as "15 Mar 2025". Hand-rolled so it is identical in every browser/locale and never timezone-shifted. */
export function formatDay(iso: string | null | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!m || +m[2] < 1 || +m[2] > 12) return "Unknown date";
  return `${m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
export const NOT_STATED = "Not stated";

export const DATE_BASIS_LABEL: Record<string, string> = {
  DOCUMENT_DATE: "Document date", SAMPLE_COLLECTION_DATE: "Sample collection date", PROCEDURE_DATE: "Date written with the procedure",
  ADMISSION_DATE: "Admission date", DISCHARGE_DATE: "Discharge date", UNKNOWN: "No date found in the document",
};

export const ACCEPTED_UPLOAD_TYPES = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
