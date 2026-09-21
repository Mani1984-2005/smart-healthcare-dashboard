// Parses ONLY a reference range that is printed in the document. There is no built-in table of "normal" values anywhere in Part 3.
import { NUMBER_SOURCE, parseDecimal } from "./numbers.js";

const LABEL_PREFIX = /^(?:(?:biological\s+)?ref(?:erence)?\.?(?:\s+(?:range|interval|value)s?)?|normal(?:\s+(?:range|values?))?|range)\s*[:\-–]?\s*/i;
const UNIT = String.raw`(?<unit>[A-Za-zµμ%°/][A-Za-z0-9µμ%°/^.*·-]*)?`;
const BETWEEN = new RegExp(String.raw`^(?<a>${NUMBER_SOURCE})\s*(?:-|–|—|to)\s*(?<b>${NUMBER_SOURCE})\s*${UNIT}$`, "i");
const SYMBOL = new RegExp(String.raw`^(?<op><=|>=|<|>|≤|≥)\s*(?<n>${NUMBER_SOURCE})\s*${UNIT}$`, "i");
const WORDS = [
  [/^(?:up\s*to|upto|not\s+more\s+than|max(?:imum)?)\s+/i, "LESS_OR_EQUAL"],
  [/^(?:below|less\s+than|under)\s+/i, "LESS_THAN"],
  [/^(?:above|more\s+than|greater\s+than|over)\s+/i, "GREATER_THAN"],
  [/^(?:at\s+least|min(?:imum)?)\s+/i, "GREATER_OR_EQUAL"],
];
const SYMBOL_KIND = { "<": "LESS_THAN", "<=": "LESS_OR_EQUAL", "≤": "LESS_OR_EQUAL", ">": "GREATER_THAN", ">=": "GREATER_OR_EQUAL", "≥": "GREATER_OR_EQUAL" };

const unparsed = (raw, reason) => ({ raw, kind: "UNPARSED", low: null, high: null, lowInclusive: false, highInclusive: false, unit: null, reason });

function bounded(raw, kind, n, unit) {
  const value = parseDecimal(n);
  if (value === null) return unparsed(raw, "NON_NUMERIC_BOUND");
  const base = { raw, kind, unit: unit ?? null };
  if (kind === "LESS_THAN") return { ...base, low: null, high: value, lowInclusive: false, highInclusive: false };
  if (kind === "LESS_OR_EQUAL") return { ...base, low: null, high: value, lowInclusive: false, highInclusive: true };
  if (kind === "GREATER_THAN") return { ...base, low: value, high: null, lowInclusive: false, highInclusive: false };
  return { ...base, low: value, high: null, lowInclusive: true, highInclusive: false };
}

/** @returns {null | {raw, kind, low, high, lowInclusive, highInclusive, unit, reason?}} null when no range text was supplied. */
export function parseReferenceRange(rawInput) {
  if (rawInput === null || rawInput === undefined) return null;
  const raw = String(rawInput).trim();
  if (!raw) return null;
  let s = raw.replace(/^\(\s*/, "").replace(/\s*\)$/, "").trim();
  s = s.replace(LABEL_PREFIX, "").trim();
  if (!s) return unparsed(raw, "EMPTY_AFTER_LABEL");

  let m = BETWEEN.exec(s);
  if (m) {
    const low = parseDecimal(m.groups.a);
    const high = parseDecimal(m.groups.b);
    if (low === null || high === null) return unparsed(raw, "NON_NUMERIC_BOUND");
    if (low > high) return unparsed(raw, "INVALID_ORDER");
    return { raw, kind: "BETWEEN", low, high, lowInclusive: true, highInclusive: true, unit: m.groups.unit ?? null };
  }
  m = SYMBOL.exec(s);
  if (m) return bounded(raw, SYMBOL_KIND[m.groups.op], m.groups.n, m.groups.unit);
  for (const [pattern, kind] of WORDS) {
    const w = pattern.exec(s);
    if (!w) continue;
    const rest = new RegExp(String.raw`^(?<n>${NUMBER_SOURCE})\s*${UNIT}$`).exec(s.slice(w[0].length));
    if (rest) return bounded(raw, kind, rest.groups.n, rest.groups.unit);
  }
  return unparsed(raw, "UNRECOGNISED_FORMAT");
}
