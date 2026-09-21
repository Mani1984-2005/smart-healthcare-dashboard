import { describe, expect, it } from "vitest";
import { docTypeLabel, formatBytes, formatDay, statusLabel } from "../services/format";
import { remainingSteps } from "../hooks/useDocumentWorkflow";
import { describeError } from "../services/errors";
import { Part3ApiError } from "../services/client";

describe("formatting", () => {
  it("formats document dates without timezone shifting", () => {
    expect(formatDay("2025-03-15")).toBe("15 Mar 2025");
    expect(formatDay("2025-12-31")).toBe("31 Dec 2025");
    expect(formatDay("2025-09-06")).toBe("06 Sep 2025"); // identical in every browser locale
    expect(formatDay("2025-13-01")).toBe("Unknown date");
  });
  it("never invents a date for missing or malformed values", () => {
    expect(formatDay(null)).toBe("Unknown date");
    expect(formatDay("15/03/2025")).toBe("Unknown date");
  });
  it("formats sizes and labels, falling back to the raw value", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(docTypeLabel("lab_report")).toBe("Laboratory report");
    expect(docTypeLabel("mystery")).toBe("mystery");
    expect(statusLabel("OCR_FAILED")).toBe("OCR failed");
  });
  it("knows which steps are left for each document status", () => {
    expect(remainingSteps("UPLOADED")).toEqual(["ocr", "extract", "timeline"]);
    expect(remainingSteps("OCR_FAILED")).toEqual(["ocr", "extract", "timeline"]);
    expect(remainingSteps("OCR_COMPLETED")).toEqual(["extract", "timeline"]);
    expect(remainingSteps("EXTRACTED")).toEqual(["timeline"]);
    expect(remainingSteps("ON_TIMELINE")).toEqual([]);
    expect(remainingSteps(undefined)).toEqual([]);
  });
  it("turns API errors into plain-language messages", () => {
    expect(describeError(new Part3ApiError(0, "NETWORK_ERROR", "x"))).toMatch(/Cannot reach the Part 3 service/);
    expect(describeError(new Part3ApiError(403, "FORBIDDEN", "x"))).toMatch(/role is not permitted/);
    expect(describeError(new Part3ApiError(409, "OCR_REQUIRED", "Run OCR first."))).toBe("Run OCR first.");
    expect(describeError(new Error("secret internals"))).not.toContain("secret");
  });
});
