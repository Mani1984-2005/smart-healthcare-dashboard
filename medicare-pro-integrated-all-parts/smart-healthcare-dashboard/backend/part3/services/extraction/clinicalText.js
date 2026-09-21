// Diagnosis and procedure text parsers (verbatim slices only).
import { LIST_MARKER } from "./text.js";
import { findFirstDate } from "./dates.js";

function pieces(text) {
  const marker = LIST_MARKER.exec(text);
  const base = marker ? marker[0].length : 0;
  const out = [];
  let idx = 0;
  for (const part of text.slice(base).split(";")) {
    const lead = part.length - part.trimStart().length;
    const trimmed = part.trim().replace(/[.,]+$/, "");
    if (trimmed && /[A-Za-z]{2}/.test(trimmed) && trimmed.length <= 200) out.push({ text: trimmed, offset: base + idx + lead });
    idx += part.length + 1;
  }
  return out;
}

/** Diagnoses are split on ";" and list markers only. Comma-separated lists stay as one verbatim entry (no guessing). */
export function parseDiagnosisText(text) {
  return pieces(text).map((p) => ({ fields: { name: p.text }, unknownFields: [], offset: p.offset, length: p.text.length }));
}

export function parseProcedureText(text) {
  return pieces(text).map((p) => {
    const found = findFirstDate(p.text);
    let name = p.text;
    let details = null;
    let date = null;
    if (found) {
      name = p.text.slice(0, found.index).replace(/[\s([,:\-–—]+$/, "").replace(/\s+(?:on|dated|date|dt\.?)$/i, "").replace(/[\s([,:\-–—]+$/, "");
      const after = p.text.slice(found.index + found.rawText.length).replace(/^[\s)\]:,;.\-–—]+/, "").replace(/[.\s]+$/, "");
      details = after && /[A-Za-z]{2}/.test(after) ? after : null;
      date = { rawText: found.rawText, isoDate: found.isoDate, format: found.format, ...(found.reason ? { reason: found.reason } : {}) };
    }
    if (!name || !/[A-Za-z]{2}/.test(name)) return null;
    const fields = { name, details, date };
    const unknownFields = [];
    if (!date) unknownFields.push("date");
    else if (!date.isoDate) unknownFields.push("date.isoDate");
    return { fields, unknownFields, offset: p.offset, length: p.text.length, dateAbs: found ? { index: found.index, length: found.rawText.length } : null };
  }).filter(Boolean);
}
