// Investigation / laboratory row parser. Value, unit and range are taken ONLY from the text. Never inferred.
import { NUMBER_SOURCE, parseDecimal } from "../lab/numbers.js";
import { parseReferenceRange } from "../lab/referenceRange.js";
import { interpretResult } from "../lab/interpret.js";

const FLAG = /^(?:H|L|HH|LL|High|Low|Normal|Abnormal|Critical|\*)$/i;
const RANGE_KEYWORD = /^(?:ref(?:erence)?\.?|normal|range|biological|up\s*to|upto|below|above|less|more|greater|under|over|not|max|min|at\s+least|adult|male|female|child)\b/i;
const QUALITATIVE = /^(?:positive|negative|reactive|non[\s-]?reactive|detected|not\s+detected|absent|present|normal|abnormal|trace|nil|clear|turbid|seen|not\s+seen)$/i;
const UNIT_TOKEN = /^(?:x?10\^?\d+\/[A-Za-zµμ.]+|\/[A-Za-zµμ][A-Za-z0-9µμ.]*|[A-Za-zµμ%°][A-Za-z0-9µμ%°/^.*·-]*)/;
const VALUE_HEAD = new RegExp(String.raw`^\s*(?<cmp><=|>=|<|>|≤|≥)?\s*(?<num>${NUMBER_SOURCE})(?!\d)\s*(?<tail>.*)$`);
const NAME_STOPLIST = /^(?:date|dated|patient|age|sex|dob|name|page|phone|mobile|address|id)\b/i;
const CELL = /\S+(?: \S+)*/g;

function looksLikeTestName(name) {
  return name.length <= 60 && /[A-Za-z]{2}/.test(name) && !/^\d/.test(name) && !NAME_STOPLIST.test(name);
}

function parseValueHead(str) {
  const m = VALUE_HEAD.exec(str);
  if (!m) return null;
  const tail = m.groups.tail;
  if (/^[/\-–]\s*\d/.test(tail)) return null; // "130/80", "12-15", dates: not a single value
  return {
    valueRaw: m[0].slice(0, m[0].length - tail.length).trim(),
    numeric: parseDecimal(m.groups.num),
    comparator: m.groups.cmp ?? null,
    tail,
  };
}

function splitUnitAndRange(tail) {
  let t = tail.trim();
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && FLAG.test(parts[parts.length - 1])) t = t.slice(0, t.length - parts[parts.length - 1].length).trim();
  if (!t) return { unit: null, rangeText: null };
  const startsRange = /^[(<>≤≥]/.test(t) || RANGE_KEYWORD.test(t) || (/^\d/.test(t) && !/^x?10\^?\d+\//.test(t));
  if (!startsRange) {
    const m = UNIT_TOKEN.exec(t);
    if (m && !FLAG.test(m[0]) && !QUALITATIVE.test(m[0]) && !RANGE_KEYWORD.test(m[0])) {
      const unit = m[0].replace(/\.$/, "");
      return { unit, rangeText: t.slice(m[0].length).trim() || null };
    }
  }
  return { unit: null, rangeText: t };
}

function build({ testName, valueRaw, numeric, comparator, unit, rangeText }) {
  const referenceRange = rangeText ? parseReferenceRange(rangeText) : null;
  const value = { raw: valueRaw, numeric, comparator: comparator ?? null };
  const interpretation = interpretResult({ value, unit, referenceRange });
  const fields = { testName, value, unit: unit ?? null, referenceRange, interpretation };
  const unknownFields = [];
  if (fields.unit === null) unknownFields.push("unit");
  if (!referenceRange) unknownFields.push("referenceRange");
  if (value.numeric === null) unknownFields.push("value.numeric");
  return { fields, unknownFields };
}

// Column layout (2+ spaces or tabs between columns) — only trusted inside a table.
function parseCells(str) {
  const cells = [...str.matchAll(CELL)].map((m) => ({ text: m[0], index: m.index }));
  if (cells.length < 2) return null;
  const testName = cells[0].text.replace(/:$/, "").trim();
  if (!looksLikeTestName(testName) || /^(?:test|investigation|parameter|analyte)(?:\s+name)?$/i.test(testName)) return null;
  const valueCell = cells[1];
  const head = parseValueHead(valueCell.text);
  if (head) {
    const restStart = valueCell.index + valueCell.text.length - head.tail.length;
    const { unit, rangeText } = splitUnitAndRange(str.slice(restStart));
    return build({ testName, valueRaw: head.valueRaw, numeric: head.numeric, comparator: head.comparator, unit, rangeText });
  }
  const { unit, rangeText } = splitUnitAndRange(str.slice(valueCell.index + valueCell.text.length));
  return build({ testName, valueRaw: valueCell.text, numeric: null, comparator: null, unit, rangeText });
}

// "Troponin I: 2.4 ng/mL (Ref: < 0.04)"
function parseInline(str) {
  const m = /^(?<name>[A-Za-z][^:=]{1,58}?)\s*[:=]\s*(?<rest>.+)$/.exec(str);
  if (!m || !looksLikeTestName(m.groups.name.trim())) return null;
  const rest = m.groups.rest;
  const head = parseValueHead(rest);
  if (head) {
    const { unit, rangeText } = splitUnitAndRange(head.tail);
    return build({ testName: m.groups.name.trim(), valueRaw: head.valueRaw, numeric: head.numeric, comparator: head.comparator, unit, rangeText });
  }
  if (QUALITATIVE.test(rest.trim())) return build({ testName: m.groups.name.trim(), valueRaw: rest.trim(), numeric: null, comparator: null, unit: null, rangeText: null });
  return null;
}

// "Hemoglobin 10.8 g/dL 13.0 - 17.0" (single spaces, e.g. plain OCR output)
function parseSpaced(str) {
  const m = /^(?<name>[A-Za-z][A-Za-z0-9 ()/\-%,.]{0,58}?)\s+(?<rest>(?:[<>≤≥]=?\s*)?\d.*)$/.exec(str);
  if (!m || !looksLikeTestName(m.groups.name.trim())) return null;
  const head = parseValueHead(m.groups.rest);
  if (!head) return null;
  const { unit, rangeText } = splitUnitAndRange(head.tail);
  return build({ testName: m.groups.name.trim(), valueRaw: head.valueRaw, numeric: head.numeric, comparator: head.comparator, unit, rangeText });
}

/** @returns {null | {fields, unknownFields, offset, length}} */
export function parseInvestigationLine(text, { tableMode = false } = {}) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 200) return null;
  const offset = text.length - text.trimStart().length;
  const built = (tableMode ? parseCells(trimmed) : null) ?? parseInline(trimmed) ?? parseSpaced(trimmed);
  return built ? { ...built, offset, length: trimmed.length } : null;
}

export const isPanelHeading = (text) => /^[A-Z][A-Z0-9 &()/,.-]{2,}$/.test(text.trim()) && !/\d/.test(text);
