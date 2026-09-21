import { describe, expect, it } from "vitest";
import { formatDate, groupFindings, reviewLabel } from "../helpers";
import { analysisFor } from "./testUtils";

describe("helpers", () => {
  it("formatDate reads the string itself, so the day never shifts with timezone", () => {
    expect(formatDate("2026-09-20")).toBe("20 Sep 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatDate("2026-09-20T08:30")).toBe("20 Sep 2026, 08:30");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("garbage")).toBe("garbage");
  });

  it("groupFindings routes each finding to exactly one tab", () => {
    const a = analysisFor("CI-DEMO-003");
    const g = groupFindings(a);
    expect(g.redFlags.length + g.insights.length + g.medication.length + g.investigation.length).toBe(a.findings.length);
    expect(g.medication.every((f) => f.kind === "medication")).toBe(true);
    expect(g.investigation.some((f) => f.ruleId.startsWith("inv-"))).toBe(true);
  });

  it("reviewLabel", () => {
    expect(reviewLabel({ state: "needs_review" })).toBe("Needs review");
    expect(reviewLabel({ state: "not_required" })).toBe("No review needed");
    expect(reviewLabel({ state: "reviewed", decision: "modified", note: null, modifiedText: "x", reviewer: { id: "1", name: "n", role: "DOCTOR" }, reviewedAt: "2026-01-01T00:00:00Z" })).toBe("Modified");
  });

  it("fixtures are real backend output: every finding has the five explanation parts", () => {
    for (const id of ["CI-DEMO-001", "CI-DEMO-002", "CI-DEMO-003", "CI-DEMO-004", "CI-DEMO-005", "CI-DEMO-006"]) {
      for (const f of analysisFor(id).findings) {
        expect(f.explanation.what && f.explanation.why && f.explanation.action).toBeTruthy();
        expect(Array.isArray(f.explanation.missing) && Array.isArray(f.explanation.sources)).toBe(true);
      }
    }
  });
});
