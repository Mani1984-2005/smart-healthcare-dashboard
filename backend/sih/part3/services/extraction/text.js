// Text utilities: normalisation, line indexing and provenance spans (absolute character offsets into the OCR text).
export function normalizeOcrText(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    // Control characters are stripped on purpose: OCR output is untrusted and must not carry them into storage or the UI.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function indexLines(text) {
  const lines = [];
  let pos = 0;
  text.split("\n").forEach((raw, i) => {
    lines.push({ no: i + 1, start: pos, end: pos + raw.length, text: raw });
    pos += raw.length + 1;
  });
  return lines;
}

/** A provenance span for `length` characters of `line.text` starting at `offset` within the line. */
export function spanOf(line, offset, length) {
  const start = line.start + offset;
  return { start, end: start + length, line: line.no, text: line.text.slice(offset, offset + length) };
}

/** A "virtual" line for the remainder of a header line (e.g. text after "Diagnosis:"), keeping absolute offsets correct. */
export function tailLine(line, offsetInLine) {
  return { no: line.no, start: line.start + offsetInLine, end: line.end, text: line.text.slice(offsetInLine) };
}

export const LIST_MARKER = /^\s*(?:\d{1,2}\s*[.)]\s*(?=[A-Za-z])|[-•*·]\s+)/;
