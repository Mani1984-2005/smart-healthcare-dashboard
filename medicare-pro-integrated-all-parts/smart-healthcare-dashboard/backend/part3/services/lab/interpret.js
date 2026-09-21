// Lab interpretation = comparison of the result with the range SUPPLIED BY THE DOCUMENT. Nothing else.
// This is document-support functionality, not a diagnosis. There is no default/normal-range knowledge here.
export const STATUS = Object.freeze({
  WITHIN_RANGE: "WITHIN_RANGE",
  OUTSIDE_RANGE: "OUTSIDE_RANGE",
  UNABLE_TO_DETERMINE: "UNABLE_TO_DETERMINE",
});

const normUnit = (u) => (u ?? "").toLowerCase().replace(/[µμ]/g, "u").replace(/\s+/g, "").replace(/\.$/, "");

const unable = (reason, explanation) => ({ status: STATUS.UNABLE_TO_DETERMINE, direction: null, reason, explanation });

function describeRange(r) {
  switch (r.kind) {
    case "BETWEEN": return `${r.low} – ${r.high}`;
    case "LESS_THAN": return `< ${r.high}`;
    case "LESS_OR_EQUAL": return `≤ ${r.high}`;
    case "GREATER_THAN": return `> ${r.low}`;
    default: return `≥ ${r.low}`;
  }
}

/**
 * @param {{value:{raw:string|null,numeric:number|null,comparator:string|null}, unit:string|null, referenceRange:object|null}} input
 */
export function interpretResult({ value, unit, referenceRange }) {
  if (!value || value.raw === null || value.raw === "") return unable("NO_VALUE", "No result value was found for this test.");
  if (value.numeric === null) return unable("NON_NUMERIC_VALUE", `The result "${value.raw}" is not a number, so it cannot be compared with a numeric range.`);
  if (!referenceRange) return unable("NO_REFERENCE_RANGE", "The document does not supply a reference range, so this result cannot be classified.");
  if (referenceRange.kind === "UNPARSED") return unable("REFERENCE_RANGE_UNPARSEABLE", `The reference range text "${referenceRange.raw}" could not be read reliably.`);
  if (value.comparator) return unable("QUALIFIED_VALUE", `The result "${value.raw}" is a qualified value (${value.comparator}), so it cannot be compared reliably.`);
  if (unit && referenceRange.unit && normUnit(unit) !== normUnit(referenceRange.unit)) {
    return unable("UNIT_MISMATCH", `The result unit (${unit}) differs from the range unit (${referenceRange.unit}); no conversion is attempted.`);
  }

  const v = value.numeric;
  const { low, high, lowInclusive, highInclusive } = referenceRange;
  const supplied = describeRange(referenceRange);
  if (low !== null && (lowInclusive ? v < low : v <= low)) {
    return { status: STATUS.OUTSIDE_RANGE, direction: "BELOW", reason: "BELOW_SUPPLIED_RANGE", explanation: `${v} is below the range supplied in the document (${supplied}).` };
  }
  if (high !== null && (highInclusive ? v > high : v >= high)) {
    return { status: STATUS.OUTSIDE_RANGE, direction: "ABOVE", reason: "ABOVE_SUPPLIED_RANGE", explanation: `${v} is above the range supplied in the document (${supplied}).` };
  }
  return { status: STATUS.WITHIN_RANGE, direction: null, reason: "WITHIN_SUPPLIED_RANGE", explanation: `${v} is within the range supplied in the document (${supplied}).` };
}
