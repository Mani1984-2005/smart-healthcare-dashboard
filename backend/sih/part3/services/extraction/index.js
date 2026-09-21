// Rule-based medical entity extraction from OCR text. Deterministic; no ML, no network, no invented values.
// Output is machine-derived and ALWAYS "EXTRACTED_UNVERIFIED" (not clinician-confirmed).
import { indexLines, spanOf, tailLine } from "./text.js";
import { findLabeledDates, findUnlabeledDates } from "./dates.js";
import { matchHeader, isGenericHeader, TABLE_HEADER } from "./sections.js";
import { parseMedicationLine, startsWithMedicationForm } from "./medications.js";
import { parseDiagnosisText, parseProcedureText } from "./clinicalText.js";
import { parseInvestigationLine, isPanelHeading } from "./investigations.js";
import { isGrounded } from "./grounding.js";

export const EXTRACTOR = Object.freeze({ id: "rule-based-extractor", version: "1.0.0", kind: "rule-based" });
export const VERIFICATION = "EXTRACTED_UNVERIFIED";

const DATE_PRIORITY = {
  prescription: ["PRESCRIPTION_DATE", "DATE"],
  lab_report: ["REPORT_DATE", "DATE", "SAMPLE_COLLECTION_DATE"],
  discharge_summary: ["DISCHARGE_DATE", "DATE"],
  other: ["DATE"],
};

export function extractEntities({ text, docType }) {
  const lines = indexLines(text);
  const warnings = [];
  const raw = [];
  const consumed = [];
  const labeledLines = new Set();
  const warn = (code, message, line) => warnings.push({ code, message, ...(line ? { line } : {}) });

  const push = (kind, line, parsed) => {
    raw.push({ kind, fields: parsed.fields, unknownFields: parsed.unknownFields, source: spanOf(line, parsed.offset, parsed.length) });
  };

  // 1. Dates introduced by a recognised label.
  for (const d of findLabeledDates(lines)) {
    labeledLines.add(d.line.no);
    consumed.push([d.line.start + d.dateOffset, d.line.start + d.dateOffset + d.rawText.length]);
    raw.push({
      kind: "date",
      fields: { role: d.role, label: d.label, rawText: d.rawText, isoDate: d.isoDate, format: d.format, ...(d.reason ? { reason: d.reason } : {}) },
      unknownFields: d.isoDate ? [] : ["isoDate"],
      source: spanOf(d.line, d.offset, d.length),
    });
    if (!d.isoDate) warn("DATE_UNPARSEABLE", `Date "${d.rawText}" was kept as written but could not be converted (${d.reason}).`, d.line.no);
  }

  // 2. Section walk: diagnoses, medications, procedures, investigations.
  let state = { kind: null, items: 0, table: false };
  const reset = () => { state = { kind: null, items: 0, table: false }; };

  const handle = (line) => {
    const t = line.text;
    switch (state.kind) {
      case "diagnosis": {
        if (isGenericHeader(t)) return reset();
        for (const p of parseDiagnosisText(t)) { push("diagnosis", line, p); state.items += 1; }
        return undefined;
      }
      case "medication": {
        if (isGenericHeader(t)) return reset();
        const p = parseMedicationLine(t);
        if (p) { push("medication", line, p); state.items += 1; } else warn("UNPARSED_MEDICATION_LINE", "A line in the medication section could not be read as a medication.", line.no);
        return undefined;
      }
      case "procedure": {
        if (isGenericHeader(t)) return reset();
        for (const p of parseProcedureText(t)) {
          push("procedure", line, p);
          if (p.dateAbs) consumed.push([line.start + p.offset + p.dateAbs.index, line.start + p.offset + p.dateAbs.index + p.dateAbs.length]);
          state.items += 1;
        }
        return undefined;
      }
      case "investigation": {
        const p = parseInvestigationLine(t, { tableMode: state.table });
        if (p) { push("investigation", line, p); state.items += 1; return undefined; }
        if (isPanelHeading(t)) return undefined;
        if (isGenericHeader(t)) return reset();
        warn("UNPARSED_INVESTIGATION_LINE", "A line in the investigation section could not be read as a test result.", line.no);
        return undefined;
      }
      default: {
        if (startsWithMedicationForm(t)) {
          const p = parseMedicationLine(t, { requireForm: true });
          if (p) push("medication", line, p);
        }
        return undefined;
      }
    }
  };

  for (const line of lines) {
    if (labeledLines.has(line.no)) continue;
    const t = line.text;
    if (!t.trim()) { if (state.items > 0) reset(); continue; }
    if (t.length > 500) { warn("LINE_TOO_LONG", "A very long line was skipped.", line.no); continue; }
    // A column-heading row ("Test  Result  Unit ...") must win over the generic "Test Results:" section header.
    if (TABLE_HEADER.test(t)) { state = { kind: "investigation", items: 0, table: true }; continue; }
    const header = matchHeader(t);
    if (header) {
      state = { kind: header.kind, items: 0, table: false };
      if (header.remainder.trim()) handle(tailLine(line, header.remainderOffset));
      continue;
    }
    handle(line);
  }

  // 3. Any other dates in the text (kept with their line as context; never given a role they don't have).
  for (const d of findUnlabeledDates(lines, consumed)) {
    const trimmedLen = d.line.text.trimEnd().length;
    const lead = d.line.text.length - d.line.text.trimStart().length;
    raw.push({
      kind: "date",
      fields: { role: "OTHER_DATE", label: null, rawText: d.rawText, isoDate: d.isoDate, format: d.format, context: d.line.text.trim(), ...(d.reason ? { reason: d.reason } : {}) },
      unknownFields: d.isoDate ? ["label"] : ["label", "isoDate"],
      source: spanOf(d.line, lead, trimmedLen - lead),
    });
  }

  // 4. Order, identify, and drop anything not literally present in the source text.
  raw.sort((a, b) => a.source.start - b.source.start || a.kind.localeCompare(b.kind));
  const counters = {};
  const prefix = { medication: "med", diagnosis: "dx", procedure: "proc", investigation: "inv", date: "date" };
  const entities = [];
  for (const e of raw) {
    counters[e.kind] = (counters[e.kind] ?? 0) + 1;
    const entity = { id: `${prefix[e.kind]}-${counters[e.kind]}`, ...e, verificationStatus: VERIFICATION };
    if (isGrounded(entity)) entities.push(entity);
    else warn("UNGROUNDED_ENTITY_DROPPED", `An extracted ${e.kind} was discarded because it could not be matched to the source text.`, e.source.line);
  }

  // 5. Primary document date (never falls back to the upload time).
  const dates = entities.filter((e) => e.kind === "date" && e.fields.isoDate);
  let documentDate = null;
  for (const role of DATE_PRIORITY[docType] ?? DATE_PRIORITY.other) {
    const hit = dates.find((e) => e.fields.role === role);
    if (hit) { documentDate = { entityId: hit.id, role, isoDate: hit.fields.isoDate, rawText: hit.fields.rawText, source: hit.source }; break; }
  }
  if (!documentDate) warn("DOCUMENT_DATE_NOT_FOUND", "No usable document date was found in the text; dependent timeline entries will be shown as undated.");

  const stats = { medications: 0, diagnoses: 0, investigations: 0, procedures: 0, dates: 0 };
  const statKey = { medication: "medications", diagnosis: "diagnoses", investigation: "investigations", procedure: "procedures", date: "dates" };
  for (const e of entities) stats[statKey[e.kind]] += 1;
  return { extractor: EXTRACTOR, verificationStatus: VERIFICATION, entities, documentDate, warnings, stats };
}
