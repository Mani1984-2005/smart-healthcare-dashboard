// Strict numeric parsing for lab values. Anything ambiguous returns null (never guessed).
const PLAIN = /^\d+(?:\.\d+)?$/;
const WESTERN = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/; // 12,345.6
const INDIAN = /^\d{1,2}(?:,\d{2})+,\d{3}(?:\.\d+)?$/; // 1,20,000

export const NUMBER_SOURCE = String.raw`\d(?:[\d,]*\d)?(?:\.\d+)?`;

export function parseDecimal(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (PLAIN.test(s)) return Number(s);
  if (WESTERN.test(s) || INDIAN.test(s)) return Number(s.replaceAll(",", ""));
  return null; // e.g. "10,8" (decimal comma) is ambiguous -> treated as non-numeric
}
