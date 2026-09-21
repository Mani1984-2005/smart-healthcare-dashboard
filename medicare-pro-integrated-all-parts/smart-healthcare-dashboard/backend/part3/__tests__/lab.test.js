import { describe, expect, it } from "vitest";
import { parseReferenceRange } from "../services/lab/referenceRange.js";
import { interpretResult } from "../services/lab/interpret.js";
import { parseDecimal } from "../services/lab/numbers.js";

const num = (n, unit = null) => ({ value: { raw: String(n), numeric: n, comparator: null }, unit });
const range = (text) => parseReferenceRange(text);

describe("reference range parsing (document-supplied ranges only)", () => {
  it("parses a between-range", () => {
    expect(range("13.0 - 17.0")).toMatchObject({ kind: "BETWEEN", low: 13, high: 17, lowInclusive: true, highInclusive: true });
    expect(range("4.0-5.6")).toMatchObject({ kind: "BETWEEN", low: 4, high: 5.6 });
    expect(range("70 to 100 mg/dL")).toMatchObject({ kind: "BETWEEN", low: 70, high: 100, unit: "mg/dL" });
  });
  it("parses one-sided ranges, with labels and brackets", () => {
    expect(range("< 200")).toMatchObject({ kind: "LESS_THAN", high: 200, highInclusive: false });
    expect(range("(Ref: < 0.04)")).toMatchObject({ kind: "LESS_THAN", high: 0.04 });
    expect(range("Up to 5.0")).toMatchObject({ kind: "LESS_OR_EQUAL", high: 5, highInclusive: true });
    expect(range("≥ 40")).toMatchObject({ kind: "GREATER_OR_EQUAL", low: 40, lowInclusive: true });
    expect(range("Above 40")).toMatchObject({ kind: "GREATER_THAN", low: 40 });
  });
  it("understands Indian digit grouping", () => {
    expect(range("1,50,000 - 4,10,000")).toMatchObject({ kind: "BETWEEN", low: 150000, high: 410000 });
    expect(parseDecimal("1,20,000")).toBe(120000);
    expect(parseDecimal("12,345")).toBe(12345);
  });
  it("returns null when no range text is supplied", () => {
    expect(range(null)).toBeNull();
    expect(range("")).toBeNull();
    expect(range("   ")).toBeNull();
  });
  it("marks unreadable or contradictory ranges as UNPARSED instead of guessing", () => {
    expect(range("Adult: 13-17")).toMatchObject({ kind: "UNPARSED", reason: "UNRECOGNISED_FORMAT" });
    expect(range("17 - 13")).toMatchObject({ kind: "UNPARSED", reason: "INVALID_ORDER" });
    expect(range("see comment")).toMatchObject({ kind: "UNPARSED" });
  });
  it("treats an ambiguous decimal comma as non-numeric", () => {
    expect(parseDecimal("10,8")).toBeNull();
  });
});

describe("laboratory interpretation", () => {
  const r = range("13.0 - 17.0");
  it("within the supplied range", () => {
    expect(interpretResult({ ...num(15), referenceRange: r })).toMatchObject({ status: "WITHIN_RANGE", direction: null });
  });
  it("treats both ends of a between-range as inclusive", () => {
    expect(interpretResult({ ...num(13), referenceRange: r }).status).toBe("WITHIN_RANGE");
    expect(interpretResult({ ...num(17), referenceRange: r }).status).toBe("WITHIN_RANGE");
  });
  it("outside the supplied range, with direction", () => {
    expect(interpretResult({ ...num(10.8), referenceRange: r })).toMatchObject({ status: "OUTSIDE_RANGE", direction: "BELOW", reason: "BELOW_SUPPLIED_RANGE" });
    expect(interpretResult({ ...num(17.01), referenceRange: r })).toMatchObject({ status: "OUTSIDE_RANGE", direction: "ABOVE" });
  });
  it("respects exclusive bounds of one-sided ranges", () => {
    expect(interpretResult({ ...num(200), referenceRange: range("< 200") })).toMatchObject({ status: "OUTSIDE_RANGE", direction: "ABOVE" });
    expect(interpretResult({ ...num(199.9), referenceRange: range("< 200") }).status).toBe("WITHIN_RANGE");
    expect(interpretResult({ ...num(5), referenceRange: range("Up to 5.0") }).status).toBe("WITHIN_RANGE");
    expect(interpretResult({ ...num(40), referenceRange: range("> 40") })).toMatchObject({ status: "OUTSIDE_RANGE", direction: "BELOW" });
  });
  it("cannot determine anything without a reference range — and never invents one", () => {
    for (const test of [num(10.8), num(146), num(0)]) {
      expect(interpretResult({ ...test, referenceRange: null })).toMatchObject({ status: "UNABLE_TO_DETERMINE", reason: "NO_REFERENCE_RANGE" });
    }
  });
  it("cannot determine a non-numeric result", () => {
    const result = interpretResult({ value: { raw: "Sample haemolysed", numeric: null, comparator: null }, unit: null, referenceRange: r });
    expect(result).toMatchObject({ status: "UNABLE_TO_DETERMINE", reason: "NON_NUMERIC_VALUE" });
  });
  it("cannot determine a missing value", () => {
    expect(interpretResult({ value: { raw: null, numeric: null, comparator: null }, unit: null, referenceRange: r }).reason).toBe("NO_VALUE");
  });
  it("cannot determine when the range text was unparseable", () => {
    expect(interpretResult({ ...num(15), referenceRange: range("Adult: 13-17") })).toMatchObject({ status: "UNABLE_TO_DETERMINE", reason: "REFERENCE_RANGE_UNPARSEABLE" });
  });
  it("cannot determine a qualified value such as '<0.5'", () => {
    const result = interpretResult({ value: { raw: "<0.5", numeric: 0.5, comparator: "<" }, unit: null, referenceRange: range("0 - 1") });
    expect(result).toMatchObject({ status: "UNABLE_TO_DETERMINE", reason: "QUALIFIED_VALUE" });
  });
  it("does not silently convert between units", () => {
    expect(interpretResult({ ...num(5, "mmol/L"), referenceRange: range("70 - 100 mg/dL") })).toMatchObject({ status: "UNABLE_TO_DETERMINE", reason: "UNIT_MISMATCH" });
  });
  it("gives a human-readable explanation that quotes only document values", () => {
    expect(interpretResult({ ...num(10.8), referenceRange: r }).explanation).toContain("13 – 17");
  });
});
