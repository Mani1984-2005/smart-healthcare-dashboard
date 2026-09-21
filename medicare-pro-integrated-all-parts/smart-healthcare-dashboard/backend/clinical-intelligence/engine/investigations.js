// Part 4 — investigation intelligence.
// Interprets a numeric result ONLY against the reference range supplied with it, ONLY when a unit is present.
// Never invents ranges, never converts units, never compares results whose units differ.
import { makeFinding } from "./explain.js";

const fmt = (n) => (Math.round(n * 100) / 100).toString();

function interpret(inv) {
  const reasons = [];
  if (!inv.numeric) reasons.push("value is non-numeric");
  if (!inv.unit) reasons.push("unit not provided");
  if (!inv.referenceRange) reasons.push("reference range not provided");
  if (reasons.length) return { status: "not_interpreted", reasons };
  const { low, high } = inv.referenceRange;
  if (low !== undefined && inv.value < low) return { status: "below_range", reasons: [] };
  if (high !== undefined && inv.value > high) return { status: "above_range", reasons: [] };
  return { status: "within_range", reasons: [] };
}

export function analyzeInvestigations(ctx) {
  const findings = [];
  const results = ctx.investigations
    .map((inv) => ({
      ref: inv.ref, name: inv.name, value: inv.value, unit: inv.unit ?? null, referenceRange: inv.referenceRange ?? null,
      collectedAt: inv.collectedAt, resultStatus: inv.status ?? "unknown", key: inv.key, unitKey: inv.unitKey, t: inv.t, ...interpret(inv),
    }))
    .sort((a, b) => a.t - b.t);

  // group by test (same key). Different units within one test are NOT compared.
  const byKey = new Map();
  for (const r of results) byKey.set(r.key, [...(byKey.get(r.key) ?? []), r]);

  const trends = [];
  for (const [key, list] of byKey) {
    const units = [...new Set(list.filter((r) => r.unit).map((r) => r.unitKey))];
    if (units.length > 1) {
      findings.push(makeFinding({ kind: "data_quality", category: "Data quality", ruleId: "dq-unit-mismatch", key, severity: "moderate", reviewRequired: false,
        title: `${list[0].name}: results use different units`, statement: "Results for the same test are reported in different units and were not compared.",
        what: `${list[0].name} appears with units ${list.map((r) => r.unit ?? "(none)").join(", ")}.`, why: "Units are never converted silently, so trend comparison is not performed across differing units.",
        evidenceRefs: list.map((r) => r.ref), missing: ["A consistent unit"], action: "Verify the units and compare manually." }));
      continue;
    }
    const numeric = list.filter((r) => typeof r.value === "number" && r.unit);
    if (numeric.length < 2) continue;
    const prev = numeric[numeric.length - 2];
    const last = numeric[numeric.length - 1];
    const deltaAbs = last.value - prev.value;
    const deltaPct = prev.value !== 0 ? (deltaAbs / Math.abs(prev.value)) * 100 : null;
    const direction = deltaAbs > 0 ? "increased" : deltaAbs < 0 ? "decreased" : "unchanged";
    let rangeShift = "no range comparison available";
    if (prev.status !== "not_interpreted" && last.status !== "not_interpreted") {
      if (prev.status === "within_range" && last.status !== "within_range") rangeShift = `moved from within range to ${last.status.replace("_", " ")}`;
      else if (prev.status !== "within_range" && last.status === "within_range") rangeShift = "returned to within range";
      else if (prev.status === last.status && last.status !== "within_range") {
        const away = last.status === "above_range" ? deltaAbs > 0 : deltaAbs < 0;
        rangeShift = deltaAbs === 0 ? `unchanged, still ${last.status.replace("_", " ")}` : away ? `moved further ${last.status.replace("_", " ")}` : `moved toward the range but still ${last.status.replace("_", " ")}`;
      } else rangeShift = "within range on both results";
    }
    const trend = { key, name: last.name, unit: last.unit, points: numeric.map((r) => ({ ref: r.ref, date: r.collectedAt, value: r.value, status: r.status })),
      direction, deltaAbs: Number(fmt(deltaAbs)), deltaPct: deltaPct === null ? null : Number(fmt(deltaPct)), rangeShift, refs: [prev.ref, last.ref] };
    trends.push(trend);
    if (rangeShift.startsWith("moved from within") || rangeShift.startsWith("moved further")) {
      findings.push(makeFinding({ kind: "investigation", category: "Investigation trend", ruleId: "inv-trend", key: `${key}`, severity: "moderate",
        title: `${last.name} ${direction}: ${rangeShift}`, statement: `Between the last two results, ${last.name} ${direction} and ${rangeShift}.`,
        what: `${last.name} went from ${prev.value} to ${last.value} ${last.unit} (${prev.collectedAt.slice(0, 10)} → ${last.collectedAt.slice(0, 10)}); ${rangeShift}.`,
        why: "Comparison uses each result's own supplied reference range and identical units. It does not establish cause.",
        evidenceRefs: [prev.ref, last.ref], missing: ["Clinical context", "Interval events between results"], action: "Clinician to review the trend in clinical context." }));
    }
  }

  // latest result per test that is outside its supplied range
  for (const list of byKey.values()) {
    const last = [...list].reverse().find((r) => r.status !== "not_interpreted") ?? list[list.length - 1];
    const latestAny = list[list.length - 1];
    if (latestAny.status === "above_range" || latestAny.status === "below_range") {
      const r = latestAny.referenceRange;
      findings.push(makeFinding({ kind: "investigation", category: "Abnormal result", ruleId: "inv-abnormal", key: latestAny.ref, severity: "moderate",
        title: `${latestAny.name} ${latestAny.status === "above_range" ? "above" : "below"} supplied reference range`,
        statement: `${latestAny.name} is ${latestAny.status.replace("_", " ")} of the range supplied with the result. Clinical significance depends on context.`,
        what: `${latestAny.name} ${latestAny.value} ${latestAny.unit} (collected ${latestAny.collectedAt.slice(0, 10)}); supplied range ${r.low ?? "…"}–${r.high ?? "…"}.`,
        why: "Direct comparison with the reference range that accompanied the result. No range was assumed by this system.",
        evidenceRefs: [latestAny.ref], missing: ["Clinical context", "Whether the result is preliminary or final"], action: "Clinician to interpret in clinical context and decide on follow-up." }));
    } else if (latestAny.status === "not_interpreted") {
      findings.push(makeFinding({ kind: "information_gap", category: "Investigation not interpreted", ruleId: "inv-not-interpreted", key: latestAny.ref, severity: "low", reviewRequired: false,
        title: `${latestAny.name} could not be interpreted`, statement: `${latestAny.name} was not interpreted: ${latestAny.reasons.join("; ")}.`,
        what: `${latestAny.name} ${latestAny.value}${latestAny.unit ? ` ${latestAny.unit}` : ""} was recorded but ${latestAny.reasons.join("; ")}.`,
        why: "The system only interprets a value against a supplied reference range and a known unit; it will not guess either.",
        evidenceRefs: [latestAny.ref], missing: latestAny.reasons.map((x) => x.replace(/^value is /, "Numeric value: ").replace(/ not provided$/, "")), action: "Obtain the unit and reference range from the laboratory report to allow interpretation." }));
    }
    void last;
  }

  const shaped = results.map(({ key: _k, unitKey: _u, t: _t, ...rest }) => rest);
  return { results: shaped, trends, findings };
}
