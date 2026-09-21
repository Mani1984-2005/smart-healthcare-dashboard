// Medication line parser. Extracts only what is printed: name, form, dosage, frequency, directions. Nothing is normalised or inferred.
import { LIST_MARKER } from "./text.js";

const FORM_RE = /^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|syr|inj(?:ection)?|oint(?:ment)?|drops?|susp(?:ension)?|gel|cream|inhaler|lotion|sachet)\b\.?/i;
const DOSE_RE = /\d+(?:\.\d+)?\s*(?:mg|mcg|µg|μg|ug|g|ml|iu|units?|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|mg|g))?(?![A-Za-z])/i;
const FREQ_RE = new RegExp(
  String.raw`(?<![A-Za-z0-9])(?:\d-\d-\d(?:-\d)?|(?:OD|BD|BID|TDS|TID|QID|QDS|HS|SOS|PRN|STAT)(?![A-Za-z0-9])|once\s+(?:a\s+)?(?:daily|day|week)|twice\s+(?:a\s+)?(?:daily|day)|thrice\s+(?:a\s+)?(?:daily|day)|(?:one|two|three|four|\d)\s+times?\s+(?:a|per)\s+day|every\s+\d+\s*(?:hours?|hrs?|h)\b|q\d+h|daily|weekly|alternate\s+days?)`,
  "i",
);

export function startsWithMedicationForm(text) {
  const body = text.replace(LIST_MARKER, "").trimStart();
  const m = FORM_RE.exec(body);
  return Boolean(m) && /^\s/.test(body.slice(m[0].length));
}

/**
 * @returns {null | {fields:{name,form,dosage,frequency,directions}, unknownFields:string[], offset:number, length:number}}
 */
export function parseMedicationLine(text, { requireForm = false } = {}) {
  const body = text.trimEnd();
  const lead = body.length - body.trimStart().length;
  if (lead >= body.length) return null;
  let pos = lead;

  const marker = LIST_MARKER.exec(body.slice(pos));
  if (marker) pos += marker[0].length;

  let form = null;
  const fm = FORM_RE.exec(body.slice(pos));
  if (fm && /^\s/.test(body.slice(pos + fm[0].length))) {
    form = fm[0].replace(/\.$/, "");
    pos += fm[0].length;
  }
  pos += body.slice(pos).length - body.slice(pos).trimStart().length;
  if (requireForm && !form) return null;

  const rest = body.slice(pos);
  if (!rest) return null;

  const dm = DOSE_RE.exec(rest);
  let fq = FREQ_RE.exec(rest);
  if (dm && fq && fq.index < dm.index + dm[0].length && fq.index + fq[0].length > dm.index) fq = null; // frequency token inside the dose text
  const cuts = [dm?.index, fq?.index].filter((i) => i !== undefined);
  const nameEnd = cuts.length ? Math.min(...cuts) : rest.length;
  const name = rest.slice(0, nameEnd).trim().replace(/[\s\-–:,/]+$/, "");
  if (!name || !/[A-Za-z]{2}/.test(name) || name.length > 80) return null;

  const ranges = [dm && [dm.index, dm.index + dm[0].length], fq && [fq.index, fq.index + fq[0].length]].filter(Boolean).sort((a, b) => a[0] - b[0]);
  const pieces = [];
  let cursor = nameEnd;
  for (const [s, e] of ranges) {
    if (s > cursor) pieces.push(rest.slice(cursor, s));
    cursor = Math.max(cursor, e);
  }
  pieces.push(rest.slice(cursor));
  const directions = pieces.map((p) => p.trim()).filter(Boolean).join(" ").replace(/^[,;:\-–\s]+|[,;:\-–\s]+$/g, "") || null;

  const fields = { name, form, dosage: dm ? dm[0] : null, frequency: fq ? fq[0] : null, directions };
  const unknownFields = ["dosage", "frequency", "directions"].filter((k) => fields[k] === null);
  return { fields, unknownFields, offset: lead, length: body.length - lead };
}
