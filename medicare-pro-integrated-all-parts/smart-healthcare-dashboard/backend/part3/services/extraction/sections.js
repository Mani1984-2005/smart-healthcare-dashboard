// Section headers commonly found on Indian clinical documents. A header must be followed by ":" (or end of line).
const END = String.raw`\s*(?::|\s[-–]\s|$)\s*(.*)$`;
const HEADERS = [
  ["diagnosis", new RegExp(String.raw`^\s*(?:(?:final|provisional|clinical|principal|primary|discharge|working)\s+)?(?:diagnos[ie]s|dx|impression)\s*(?:\([^)]{0,40}\))?${END}`, "i")],
  ["medication", new RegExp(String.raw`^\s*(?:rx|℞|medications?(?:\s+(?:at|on)\s+discharge)?|discharge\s+medications?|medicines?(?:\s+prescribed)?|treatment\s+given)${END}`, "i")],
  ["procedure", new RegExp(String.raw`^\s*(?:procedures?(?:\s+(?:performed|done))?|surgery|surgical\s+procedures?|operative\s+procedures?|operation)${END}`, "i")],
  ["investigation", new RegExp(String.raw`^\s*(?:investigations?(?:\s+(?:done|results?))?|lab(?:oratory)?\s+(?:findings|results|investigations)|test\s+results?)${END}`, "i")],
];
export const TABLE_HEADER = /^\s*(?:test|investigation|parameter|analyte)(?:\s+name)?\s{2,}(?:result|value)\b/i;
const GENERIC_HEADER = /^\s*[A-Za-z][A-Za-z /&()'.-]{1,45}\s*:/;

/** @returns {null | {kind:string, remainderOffset:number}} */
export function matchHeader(text) {
  for (const [kind, re] of HEADERS) {
    const m = re.exec(text);
    if (m) return { kind, remainderOffset: text.length - m[1].length, remainder: m[1] };
  }
  return null;
}

export const isGenericHeader = (text) => GENERIC_HEADER.test(text);
