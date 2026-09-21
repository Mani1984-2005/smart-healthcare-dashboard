// Date detection + parsing. Numeric dates are read DAY-FIRST (Indian convention) and the raw text is always preserved.
// Two-digit years and impossible calendar dates are NOT guessed: isoDate stays null and the raw text is kept.
const MONTHS = String.raw`Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?`;
const MONTH_INDEX = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

export const DATE_SOURCE = String.raw`(?<![\d/.\-])(?:\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?[\s\-]+(?:${MONTHS})\.?,?[\s\-]+\d{4}|(?:${MONTHS})\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2})(?!\d)`;

const LABELS = [
  ["ADMISSION_DATE", String.raw`date\s+of\s+admission|admission\s+date|admitted\s+on|doa`],
  ["DISCHARGE_DATE", String.raw`date\s+of\s+discharge|discharge\s+date|discharged\s+on|dod`],
  ["SAMPLE_COLLECTION_DATE", String.raw`sample\s+(?:collected|collection)(?:\s+(?:date|on))?|collection\s+date|collected\s+on|date\s+of\s+collection|specimen\s+collected(?:\s+on)?`],
  ["REPORT_DATE", String.raw`report(?:ed)?\s+date|date\s+of\s+report|reported\s+on|report\s+dated`],
  ["PRESCRIPTION_DATE", String.raw`prescription\s+date|date\s+of\s+prescription|rx\s+date`],
  ["PROCEDURE_DATE", String.raw`procedure\s+date|date\s+of\s+(?:procedure|surgery|operation)|surgery\s+date|operated\s+on`],
  ["FOLLOW_UP_DATE", String.raw`follow[\s-]?up(?:\s+(?:date|on))?|next\s+visit|review(?:\s+(?:date|on))`],
  ["DATE", String.raw`dated?`],
];
const LABELED = new RegExp(
  String.raw`(?<![A-Za-z])(?:${LABELS.map(([, src], i) => `(?<g${i}>${src})`).join("|")})(?![A-Za-z])\s*[:\-–]?\s*(?<date>${DATE_SOURCE})`,
  "gi",
);
const DOB_LINE = /\b(?:dob|d\.o\.b\.?|date\s+of\s+birth|born)\b/i;

function build(year, month, day, format) {
  if (year < 1900 || year > 2100) return { isoDate: null, format, reason: "YEAR_OUT_OF_RANGE" };
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return { isoDate: null, format, reason: "INVALID_CALENDAR_DATE" };
  const pad = (n) => String(n).padStart(2, "0");
  return { isoDate: `${year}-${pad(month)}-${pad(day)}`, format };
}

export function parseDate(raw) {
  const s = String(raw).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return build(+m[1], +m[2], +m[3], "ISO_8601");
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (m) return build(+m[3], +m[2], +m[1], "DAY_FIRST_ASSUMED");
  if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2}$/.test(s)) return { isoDate: null, format: "TWO_DIGIT_YEAR", reason: "TWO_DIGIT_YEAR_UNSUPPORTED" };
  m = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]+)\.?,?[\s-]+(\d{4})$/.exec(s);
  if (m && MONTH_INDEX[m[2].slice(0, 3).toLowerCase()]) return build(+m[3], MONTH_INDEX[m[2].slice(0, 3).toLowerCase()], +m[1], "TEXT_MONTH");
  m = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(s);
  if (m && MONTH_INDEX[m[1].slice(0, 3).toLowerCase()]) return build(+m[3], MONTH_INDEX[m[1].slice(0, 3).toLowerCase()], +m[2], "TEXT_MONTH");
  return { isoDate: null, format: "UNRECOGNISED", reason: "UNRECOGNISED_DATE_FORMAT" };
}

/** First date token in `text`, or null. Returns { rawText, index, ...parsed }. */
export function findFirstDate(text) {
  const m = new RegExp(DATE_SOURCE, "i").exec(text);
  return m ? { rawText: m[0], index: m.index, ...parseDate(m[0]) } : null;
}

/** Dates introduced by a recognised label ("Date of Admission: 02/09/2025"). */
export function findLabeledDates(lines) {
  const found = [];
  for (const line of lines) {
    if (line.text.length > 500) continue;
    for (const m of line.text.matchAll(LABELED)) {
      const gi = LABELS.findIndex((_, i) => m.groups[`g${i}`] !== undefined);
      const date = m.groups.date;
      const label = m[0].slice(0, m[0].length - date.length).replace(/[\s:\-–]+$/, "");
      found.push({ role: LABELS[gi][0], label, rawText: date, line, offset: m.index, length: m[0].length, dateOffset: m.index + m[0].length - date.length, ...parseDate(date) });
    }
  }
  return found;
}

/** Remaining date tokens not already consumed. Date-of-birth lines are ignored on purpose (not a clinical event, and sensitive). */
export function findUnlabeledDates(lines, consumed) {
  const found = [];
  for (const line of lines) {
    if (line.text.length > 500 || DOB_LINE.test(line.text)) continue;
    for (const m of line.text.matchAll(new RegExp(DATE_SOURCE, "gi"))) {
      const start = line.start + m.index;
      const end = start + m[0].length;
      if (consumed.some(([a, b]) => start < b && end > a)) continue;
      found.push({ line, rawText: m[0], offset: m.index, ...parseDate(m[0]) });
    }
  }
  return found;
}
