// Anti-fabrication safety net: every text field of an entity must literally occur in its source span.
// Entities failing this are dropped (and reported) rather than shown.
const tokens = (s) => new Set(s.split(/\s+/).filter(Boolean));

function checks(entity) {
  const f = entity.fields;
  switch (entity.kind) {
    case "medication":
      return [["exact", f.name], ["exact", f.form], ["exact", f.dosage], ["exact", f.frequency], ["tokens", f.directions]];
    case "diagnosis":
      return [["exact", f.name]];
    case "procedure":
      return [["exact", f.name], ["exact", f.details], ["exact", f.date?.rawText]];
    case "investigation":
      return [["exact", f.testName], ["exact", f.value?.raw], ["exact", f.unit], ["exact", f.referenceRange?.raw]];
    case "date":
      return [["exact", f.rawText], ["exact", f.label]];
    default:
      return [];
  }
}

export function isGrounded(entity) {
  const source = entity.source?.text ?? "";
  const sourceTokens = tokens(source);
  return checks(entity).every(([mode, value]) => {
    if (value === null || value === undefined) return true;
    if (mode === "tokens") return [...tokens(value)].every((t) => sourceTokens.has(t));
    return source.includes(value);
  });
}
