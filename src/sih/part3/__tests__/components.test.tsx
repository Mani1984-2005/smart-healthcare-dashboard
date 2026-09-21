import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EntitiesPane from "../components/EntitiesPane";
import LabResultsPane from "../components/LabResultsPane";
import OcrTextPane from "../components/OcrTextPane";
import WorkflowStepper from "../components/WorkflowStepper";
import { InterpretationBadge, ProviderBadge, SafetyBanner } from "../components/badges";
import { inv, makeExtraction } from "./testUtils";
import type { MedicationEntity, OcrResult } from "../types/part3";

describe("safety labelling", () => {
  it("the safety notice says the data is unverified and not a diagnosis", () => {
    render(<SafetyBanner />);
    const note = screen.getByRole("note", { name: /medical safety notice/i });
    expect(note).toHaveTextContent(/not clinician-confirmed/i);
    expect(note).toHaveTextContent(/nothing here is a diagnosis/i);
    expect(note).toHaveTextContent(/synthetic or de-identified/i);
  });
  it("labels the demo OCR provider as a recorded transcript, not real recognition", () => {
    render(<ProviderBadge provider={{ id: "synthetic-demo", label: "x", kind: "demo", version: "1" }} />);
    expect(screen.getByText(/Demo OCR · recorded transcript/)).toBeInTheDocument();
  });
  it("shows a real engine by name", () => {
    render(<ProviderBadge provider={{ id: "tess", label: "Tesseract", kind: "real", version: "5" }} />);
    expect(screen.getByText(/OCR engine: Tesseract/)).toBeInTheDocument();
  });
});

describe("abnormal-lab badge (three states, always text — never colour alone)", () => {
  it.each([
    ["WITHIN_RANGE", null, "Within provided range"],
    ["OUTSIDE_RANGE", "ABOVE", "Above provided range"],
    ["OUTSIDE_RANGE", "BELOW", "Below provided range"],
    ["UNABLE_TO_DETERMINE", null, "Unable to determine"],
  ] as const)("%s / %s → “%s”", (status, direction, text) => {
    render(<InterpretationBadge status={status} direction={direction} explanation="why" />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText(text).closest("span")).toHaveAttribute("title", "why");
  });
});

describe("LabResultsPane", () => {
  const extraction = makeExtraction([
    inv("inv-1", "Hemoglobin", "10.8", "g/dL", "13.0 - 17.0", "OUTSIDE_RANGE", "BELOW", 10),
    inv("inv-2", "Fasting Glucose", "146", "mg/dL", "70 - 100", "OUTSIDE_RANGE", "ABOVE", 40),
    inv("inv-3", "Serum Creatinine", "1.0", "mg/dL", "0.7 - 1.3", "WITHIN_RANGE", null, 70),
    inv("inv-4", "Vitamin D (25-OH)", "18", "ng/mL", null, "UNABLE_TO_DETERMINE", null, 100),
    inv("inv-5", "Serum Potassium", "Sample haemolysed", null, null, "UNABLE_TO_DETERMINE", null, 130),
  ]);

  it("summarises and highlights results outside the range printed in the document", () => {
    render(<LabResultsPane extraction={extraction} onShowInText={vi.fn()} />);
    expect(screen.getByText(/2 outside provided range/)).toBeInTheDocument();
    const row = (name: string) => screen.getByRole("row", { name: new RegExp(name) });
    expect(row("Hemoglobin")).toHaveAttribute("data-status", "OUTSIDE_RANGE");
    expect(within(row("Hemoglobin")).getByText("Below provided range")).toBeInTheDocument();
    expect(within(row("Fasting Glucose")).getByText("Above provided range")).toBeInTheDocument();
    expect(within(row("Serum Creatinine")).getByText("Within provided range")).toBeInTheDocument();
    expect(row("Hemoglobin").className).toMatch(/rose/); // visual emphasis in addition to the text
    expect(row("Serum Creatinine").className).not.toMatch(/rose/);
  });
  it("never classifies a result that has no printed range, and says so", () => {
    render(<LabResultsPane extraction={extraction} onShowInText={vi.fn()} />);
    const vitD = screen.getByRole("row", { name: /Vitamin D/ });
    expect(within(vitD).getByText("Unable to determine")).toBeInTheDocument();
    expect(within(vitD).getByText("Not printed in document")).toBeInTheDocument();
    expect(within(vitD).queryByText(/provided range/)).not.toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Serum Potassium/ })).getByText("unit not stated")).toBeInTheDocument(); // no unit printed
  });
  it("states that only the document's own range is used", () => {
    render(<LabResultsPane extraction={extraction} onShowInText={vi.fn()} />);
    expect(screen.getByText(/only/i, { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/no other ranges are used/i)).toBeInTheDocument();
  });
  it("links each row back to its exact place in the OCR text", async () => {
    const onShow = vi.fn();
    render(<LabResultsPane extraction={extraction} onShowInText={onShow} />);
    await userEvent.click(within(screen.getByRole("row", { name: /Hemoglobin/ })).getByRole("button", { name: /show in text/i }));
    expect(onShow).toHaveBeenCalledWith({ start: 10, end: 10 + "Hemoglobin 10.8".length });
  });
  it("has helpful empty states", () => {
    const { rerender } = render(<LabResultsPane extraction={null} onShowInText={vi.fn()} />);
    expect(screen.getByText("No extracted data yet")).toBeInTheDocument();
    rerender(<LabResultsPane extraction={makeExtraction([])} onShowInText={vi.fn()} />);
    expect(screen.getByText("No laboratory results found")).toBeInTheDocument();
  });
});

describe("EntitiesPane", () => {
  const med = (over: Partial<MedicationEntity["fields"]>): MedicationEntity => ({
    id: "med-1", kind: "medication", verificationStatus: "EXTRACTED_UNVERIFIED", unknownFields: [], source: { start: 5, end: 25, line: 2, text: "Tab Zincovit" },
    fields: { name: "Zincovit", form: "Tab", dosage: null, frequency: null, directions: null, ...over },
  });
  it("shows unknown medication fields as 'Not stated' rather than leaving blanks or guessing", () => {
    render(<EntitiesPane extraction={makeExtraction([med({})])} onShowInText={vi.fn()} />);
    const row = screen.getByRole("row", { name: /Zincovit/ });
    expect(within(row).getAllByText("Not stated")).toHaveLength(3);
    expect(screen.getByText(/not clinician-confirmed/i)).toBeInTheDocument();
  });
  it("marks which date was used as the document date, and flags unreadable dates", () => {
    const dates = [
      { id: "date-1", kind: "date" as const, verificationStatus: "EXTRACTED_UNVERIFIED" as const, unknownFields: [], source: { start: 0, end: 10, line: 1, text: "x" }, fields: { role: "REPORT_DATE", label: "Report date", rawText: "16/03/2025", isoDate: "2025-03-16", format: "DAY_FIRST_ASSUMED" } },
      { id: "date-2", kind: "date" as const, verificationStatus: "EXTRACTED_UNVERIFIED" as const, unknownFields: [], source: { start: 20, end: 30, line: 2, text: "y" }, fields: { role: "OTHER_DATE", label: null, rawText: "31/02/2025", isoDate: null, format: "DAY_FIRST_ASSUMED", reason: "INVALID_CALENDAR_DATE" } },
    ];
    render(<EntitiesPane extraction={makeExtraction(dates, { documentDate: { entityId: "date-1", role: "REPORT_DATE", isoDate: "2025-03-16", rawText: "16/03/2025", source: dates[0].source } })} onShowInText={vi.fn()} />);
    expect(screen.getByText("16 Mar 2025")).toBeInTheDocument();
    expect(screen.getByText("Used as document date")).toBeInTheDocument();
    expect(screen.getByText(/could not be converted to a date/)).toBeInTheDocument();
  });
  it("explains that a document with no dates will be undated", () => {
    render(<EntitiesPane extraction={makeExtraction([])} onShowInText={vi.fn()} />);
    expect(screen.getByText(/shown as undated/i)).toBeInTheDocument();
  });
  it("lists extraction notes", () => {
    render(<EntitiesPane extraction={makeExtraction([], { warnings: [{ code: "UNPARSED_MEDICATION_LINE", message: "A line could not be read.", line: 7 }] })} onShowInText={vi.fn()} />);
    expect(screen.getByText("1 note from extraction")).toBeInTheDocument();
    expect(screen.getByText(/A line could not be read\. \(line 7\)/)).toBeInTheDocument();
  });
  it("prompts to run extraction first", () => {
    render(<EntitiesPane extraction={null} onShowInText={vi.fn()} />);
    expect(screen.getByText("No extracted data yet")).toBeInTheDocument();
  });
});

describe("OcrTextPane", () => {
  const ocr = (over: Partial<OcrResult> = {}): OcrResult => ({
    id: "ocr_1", documentId: "doc_1", provider: { id: "synthetic-demo", label: "Demo", kind: "demo", version: "1" }, status: "completed", text: "Alpha\nBeta gamma\nDelta",
    textLength: 21, pageCount: 1, languageHints: [], detectedLanguages: null, providerConfidence: null, startedAt: "", completedAt: "", durationMs: 3, ...over,
  });
  it("shows the text as returned, with the provider and an honest confidence note", () => {
    render(<OcrTextPane ocr={ocr()} status="OCR_COMPLETED" highlight={null} />);
    expect(screen.getByLabelText("Text read from the document")).toHaveTextContent(/Beta gamma/);
    expect(screen.getByText(/Demo OCR · recorded transcript/)).toBeInTheDocument();
    expect(screen.getByText(/not reported by provider/)).toBeInTheDocument();
    expect(screen.getByText(/has not been edited or corrected/)).toBeInTheDocument();
  });
  it("highlights the exact source span and scrolls it into view", () => {
    render(<OcrTextPane ocr={ocr()} status="OCR_COMPLETED" highlight={{ start: 6, end: 16 }} />);
    expect(screen.getByText("Beta gamma").tagName).toBe("MARK");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
  it("ignores an out-of-range highlight instead of showing something wrong", () => {
    render(<OcrTextPane ocr={ocr()} status="OCR_COMPLETED" highlight={{ start: 5, end: 9999 }} />);
    expect(document.querySelector("mark")).toBeNull();
  });
  it("reports a failed read without inventing text", () => {
    render(<OcrTextPane ocr={ocr({ status: "failed", text: "", errorCode: "UNSUPPORTED_DOCUMENT", errorMessage: "Cannot read this." })} status="OCR_FAILED" highlight={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Cannot read this\./);
    expect(screen.getByRole("alert")).toHaveTextContent(/none has been guessed/);
  });
  it("handles empty, not-run and running states", () => {
    const { rerender } = render(<OcrTextPane ocr={ocr({ status: "empty", text: "" })} status="OCR_EMPTY" highlight={null} />);
    expect(screen.getByText("No text was found")).toBeInTheDocument();
    rerender(<OcrTextPane ocr={null} status="UPLOADED" highlight={null} />);
    expect(screen.getByText("OCR has not been run")).toBeInTheDocument();
    rerender(<OcrTextPane ocr={null} status="OCR_IN_PROGRESS" highlight={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/Reading the document/);
  });
});

describe("WorkflowStepper", () => {
  const stepper = (status: Parameters<typeof WorkflowStepper>[0]["status"], busy: Parameters<typeof WorkflowStepper>[0]["busyStep"] = null) => {
    const onRun = vi.fn();
    const onAll = vi.fn();
    render(<WorkflowStepper status={status} busyStep={busy} canRunRemaining onRun={onRun} onRunRemaining={onAll} />);
    return { onRun, onAll };
  };
  it("offers only the next valid step", async () => {
    const { onRun } = stepper("UPLOADED");
    expect(screen.getByRole("button", { name: "Run OCR" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Extract data" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to timeline" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Run OCR" }));
    expect(onRun).toHaveBeenCalledWith("ocr");
  });
  it("offers a retry after a failure", () => {
    stepper("OCR_FAILED");
    expect(screen.getByRole("button", { name: "Retry OCR" })).toBeInTheDocument();
  });
  it("moves on step by step", () => {
    stepper("OCR_COMPLETED");
    expect(screen.getByRole("button", { name: "Extract data" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /OCR/ })).not.toBeInTheDocument();
  });
  it("shows everything as done once on the timeline", () => {
    stepper("ON_TIMELINE");
    expect(screen.getAllByText(/^Done/)).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Run OCR|Extract data|Add to timeline/ })).not.toBeInTheDocument();
  });
  it("disables actions while a step is running (no double submit)", () => {
    stepper("UPLOADED", "ocr");
    expect(screen.queryByRole("button", { name: "Run OCR" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run all remaining steps/ })).toBeDisabled();
    expect(screen.getByText(/Running…/)).toBeInTheDocument();
  });
  it("can run all remaining steps", async () => {
    const { onAll } = stepper("UPLOADED");
    fireEvent.click(screen.getByRole("button", { name: /Run all remaining steps/ }));
    expect(onAll).toHaveBeenCalledOnce();
  });
});
