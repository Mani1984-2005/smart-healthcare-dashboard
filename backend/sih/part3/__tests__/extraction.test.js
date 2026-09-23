import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { extractEntities } from "../services/extraction/index.js";
import { isGrounded } from "../services/extraction/grounding.js";
import { parseDate } from "../services/extraction/dates.js";
import { FIXTURE_DIR } from "../seed/fixtureCatalog.js";

const run = (text, docType = "other") => extractEntities({ text, docType });
const of = (result, kind) => result.entities.filter((e) => e.kind === kind);
const manifest = JSON.parse(fs.readFileSync(`${FIXTURE_DIR}/manifest.json`, "utf8"));
const transcript = (id) => fs.readFileSync(`${FIXTURE_DIR}/${id}.txt`, "utf8");

describe("medication extraction", () => {
  it("extracts name, dosage, frequency and directions exactly as written", () => {
    const [m] = of(run("Rx\n1. Tab Metformin 500 mg 1-0-1 after meals x 30 days"), "medication");
    expect(m.fields).toEqual({ name: "Metformin", form: "Tab", dosage: "500 mg", frequency: "1-0-1", directions: "after meals x 30 days" });
    expect(m.verificationStatus).toBe("EXTRACTED_UNVERIFIED");
  });
  it("keeps unknown fields unknown (never fabricates a dose or frequency)", () => {
    const [m] = of(run("Rx\n1. Tab Zincovit"), "medication");
    expect(m.fields).toMatchObject({ name: "Zincovit", dosage: null, frequency: null, directions: null });
    expect(m.unknownFields).toEqual(["dosage", "frequency", "directions"]);
  });
  it("reads abbreviations verbatim and puts the rest in directions", () => {
    const [m] = of(run("Medications:\n- Cap Omeprazole 20 mg OD before food"), "medication");
    expect(m.fields).toMatchObject({ name: "Omeprazole", dosage: "20 mg", frequency: "OD", directions: "before food" });
  });
  it("finds a form-prefixed medication line even without a section header, but not ordinary prose", () => {
    const r = run("Tab Aspirin 75 mg OD\nTake rest and drink water 500 ml daily");
    expect(of(r, "medication").map((m) => m.fields.name)).toEqual(["Aspirin"]);
  });
  it("warns about an unreadable line in the medication section instead of guessing", () => {
    const r = run("Rx\n1. Tab Aspirin 75 mg OD\n75 mg");
    expect(of(r, "medication")).toHaveLength(1);
    expect(r.warnings.some((w) => w.code === "UNPARSED_MEDICATION_LINE")).toBe(true);
  });
});

describe("diagnosis extraction", () => {
  it("splits on semicolons and numbered lists", () => {
    expect(of(run("Diagnosis: Type 2 diabetes mellitus; Essential hypertension"), "diagnosis").map((d) => d.fields.name)).toEqual(["Type 2 diabetes mellitus", "Essential hypertension"]);
    expect(of(run("Diagnosis:\n1. Anaemia\n2. Hypothyroidism"), "diagnosis").map((d) => d.fields.name)).toEqual(["Anaemia", "Hypothyroidism"]);
  });
  it("does not split comma-separated text (kept verbatim rather than guessed)", () => {
    expect(of(run("Diagnosis: Hypertension, Type 2 diabetes"), "diagnosis").map((d) => d.fields.name)).toEqual(["Hypertension, Type 2 diabetes"]);
  });
  it("ignores text outside a diagnosis section", () => {
    expect(of(run("Patient has a history of fever.\nAdvice: rest"), "diagnosis")).toHaveLength(0);
  });
});

describe("investigation extraction", () => {
  it("reads a table row with value, unit and reference range", () => {
    const text = "Test        Result   Unit    Reference Range\nHemoglobin  10.8     g/dL    13.0 - 17.0";
    const [inv] = of(run(text, "lab_report"), "investigation");
    expect(inv.fields).toMatchObject({ testName: "Hemoglobin", unit: "g/dL", value: { raw: "10.8", numeric: 10.8 }, referenceRange: { raw: "13.0 - 17.0", kind: "BETWEEN" } });
    expect(inv.fields.interpretation).toMatchObject({ status: "OUTSIDE_RANGE", direction: "BELOW" });
  });
  it("reads an inline result with a bracketed reference", () => {
    const [inv] = of(run("Investigations:\nTroponin I: 2.4 ng/mL (Ref: < 0.04)"), "investigation");
    expect(inv.fields).toMatchObject({ testName: "Troponin I", unit: "ng/mL", referenceRange: { kind: "LESS_THAN", high: 0.04 } });
    expect(inv.fields.interpretation.status).toBe("OUTSIDE_RANGE");
  });
  it("reads plain single-space OCR output", () => {
    const [inv] = of(run("Investigations:\nHbA1c 7.9 % 4.0 - 5.6"), "investigation");
    expect(inv.fields).toMatchObject({ testName: "HbA1c", unit: "%", value: { numeric: 7.9 } });
    expect(inv.fields.interpretation.status).toBe("OUTSIDE_RANGE");
  });
  it("leaves unit and range unknown when the document has none, and does not classify", () => {
    const [inv] = of(run("Investigations:\nRandom Blood Sugar: 212"), "investigation");
    expect(inv.fields).toMatchObject({ unit: null, referenceRange: null });
    expect(inv.unknownFields).toEqual(expect.arrayContaining(["unit", "referenceRange"]));
    expect(inv.fields.interpretation).toMatchObject({ status: "UNABLE_TO_DETERMINE", reason: "NO_REFERENCE_RANGE" });
  });
  it("keeps a non-numeric table result as text and cannot classify it", () => {
    const text = "Test    Result\nSerum Potassium   Sample haemolysed - result not reported";
    const [inv] = of(run(text, "lab_report"), "investigation");
    expect(inv.fields.value).toMatchObject({ raw: "Sample haemolysed - result not reported", numeric: null });
    expect(inv.fields.interpretation.reason).toBe("NON_NUMERIC_VALUE");
  });
  it("reads Indian-grouped numbers and treats an ambiguous decimal comma as non-numeric", () => {
    const r = run("Investigations:\nPlatelet Count: 1,20,000 /cumm (Ref: 1,50,000 - 4,10,000)\nSodium: 13,9 mmol/L");
    const [platelets, sodium] = of(r, "investigation");
    expect(platelets.fields.value.numeric).toBe(120000);
    expect(platelets.fields.interpretation).toMatchObject({ status: "OUTSIDE_RANGE", direction: "BELOW" });
    expect(sodium.fields.value.numeric).toBeNull();
  });
  it("does not turn blood pressure or dates into a single lab value", () => {
    expect(of(run("Investigations:\nBlood Pressure: 130/80 mmHg"), "investigation")).toHaveLength(0);
    const r = run("Investigations:\nBP 130/80 mmHg\nReport date 16/03/2025");
    expect(of(r, "investigation")).toHaveLength(0);
    expect(r.warnings.filter((w) => w.code === "UNPARSED_INVESTIGATION_LINE")).toHaveLength(1);
    expect(of(r, "date").map((d) => d.fields.rawText)).toEqual(["16/03/2025"]); // the date line is read as a date, not as a lab value
  });
  it("marks an unreadable reference range as UNPARSED and unable to determine", () => {
    const [inv] = of(run("Investigations:\nHaemoglobin: 10.8 g/dL (Adult: 13-17; Child: 11-15)"), "investigation");
    expect(inv.fields.referenceRange.kind).toBe("UNPARSED");
    expect(inv.fields.interpretation.status).toBe("UNABLE_TO_DETERMINE");
  });
  it("never invents a reference range when the range column is removed from a real fixture", () => {
    const stripped = transcript("lab-p001-2025-03").split("\n").map((l) => l.replace(/\s+(\d+(\.\d+)? - \d+(\.\d+)?|< 200)\s*$/, "")).join("\n");
    const invs = of(run(stripped, "lab_report"), "investigation");
    expect(invs.length).toBeGreaterThan(5);
    for (const inv of invs) {
      expect(inv.fields.referenceRange).toBeNull();
      expect(inv.fields.interpretation.status).toBe("UNABLE_TO_DETERMINE");
    }
  });
});

describe("procedure extraction", () => {
  it("captures the procedure and its inline date", () => {
    const [p] = of(run("Procedure: Percutaneous coronary intervention (PCI) to right coronary artery on 03/09/2025"), "procedure");
    expect(p.fields.name).toBe("Percutaneous coronary intervention (PCI) to right coronary artery");
    expect(p.fields.date).toMatchObject({ rawText: "03/09/2025", isoDate: "2025-09-03" });
  });
  it("leaves the date unknown when none is written", () => {
    const [p] = of(run("Surgery: Laparoscopic cholecystectomy"), "procedure");
    expect(p.fields.date).toBeNull();
    expect(p.unknownFields).toContain("date");
  });
  it("does not chop words that merely end in 'on'", () => {
    const [p] = of(run("Procedure: Excision 03/09/2025"), "procedure");
    expect(p.fields.name).toBe("Excision");
  });
});

describe("date extraction", () => {
  it("reads labelled dates with their roles", () => {
    const r = run("Date of Admission: 02/09/2025\nDate of Discharge: 06/09/2025\nFollow-up: 20/09/2025");
    expect(of(r, "date").map((d) => [d.fields.role, d.fields.isoDate])).toEqual([["ADMISSION_DATE", "2025-09-02"], ["DISCHARGE_DATE", "2025-09-06"], ["FOLLOW_UP_DATE", "2025-09-20"]]);
  });
  it("parses common formats (day-first for numeric dates)", () => {
    expect(parseDate("12/03/2025")).toMatchObject({ isoDate: "2025-03-12", format: "DAY_FIRST_ASSUMED" });
    expect(parseDate("2025-03-12").isoDate).toBe("2025-03-12");
    expect(parseDate("12 Mar 2025").isoDate).toBe("2025-03-12");
    expect(parseDate("March 12, 2025").isoDate).toBe("2025-03-12");
    expect(parseDate("12-Mar-2025").isoDate).toBe("2025-03-12");
  });
  it("does not guess two-digit years or impossible dates — the raw text is kept", () => {
    expect(parseDate("12/03/25")).toMatchObject({ isoDate: null, reason: "TWO_DIGIT_YEAR_UNSUPPORTED" });
    expect(parseDate("31/02/2025")).toMatchObject({ isoDate: null, reason: "INVALID_CALENDAR_DATE" });
    const r = run("Date: 31/02/2025", "prescription");
    const [d] = of(r, "date");
    expect(d.fields).toMatchObject({ rawText: "31/02/2025", isoDate: null });
    expect(r.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["DATE_UNPARSEABLE", "DOCUMENT_DATE_NOT_FOUND"]));
  });
  it("keeps other dates with their context and ignores dates of birth", () => {
    const r = run("DOB: 01/01/1970\nStarted insulin on 05/01/2025 after review");
    const dates = of(r, "date");
    expect(dates).toHaveLength(1);
    expect(dates[0].fields).toMatchObject({ role: "OTHER_DATE", isoDate: "2025-01-05", context: "Started insulin on 05/01/2025 after review" });
  });
  it("chooses the document date by document type and never falls back to upload time", () => {
    const text = "Sample collected: 15/03/2025    Report date: 16/03/2025";
    expect(run(text, "lab_report").documentDate).toMatchObject({ role: "REPORT_DATE", isoDate: "2025-03-16" });
    expect(run("Date of Admission: 02/09/2025\nDate of Discharge: 06/09/2025", "discharge_summary").documentDate).toMatchObject({ role: "DISCHARGE_DATE" });
    expect(run("Diagnosis: Cough", "prescription").documentDate).toBeNull();
  });
});

describe("fabrication safeguards", () => {
  it("produces nothing from empty or unrelated text", () => {
    expect(run("").entities).toEqual([]);
    expect(run("The quick brown fox jumps over the lazy dog.").entities).toEqual([]);
    expect(run("   \n\n  ").entities).toEqual([]);
  });
  it("every entity of every synthetic document is literally present in the OCR text", () => {
    for (const f of manifest) {
      const text = transcript(f.id);
      const result = run(text, f.docType);
      for (const e of result.entities) {
        expect(text.slice(e.source.start, e.source.end), `${f.id}/${e.id}`).toBe(e.source.text);
        expect(isGrounded(e), `${f.id}/${e.id}`).toBe(true);
      }
      expect(result.warnings.filter((w) => w.code === "UNGROUNDED_ENTITY_DROPPED")).toEqual([]);
    }
  });
  it("the grounding check rejects a value that is not in the source", () => {
    const [m] = of(run("Rx\n1. Tab Metformin 500 mg"), "medication");
    expect(isGrounded({ ...m, fields: { ...m.fields, dosage: "850 mg" } })).toBe(false);
    expect(isGrounded({ ...m, fields: { ...m.fields, directions: "with dinner" } })).toBe(false);
  });
  it("extraction is deterministic", () => {
    const text = transcript("dis-p001-2025-09");
    expect(run(text, "discharge_summary")).toEqual(run(text, "discharge_summary"));
  });
  it("skips absurdly long lines instead of processing them", () => {
    const r = run(`Rx\n${"Tab Aspirin 75 mg ".repeat(60)}`);
    expect(r.warnings.some((w) => w.code === "LINE_TOO_LONG")).toBe(true);
    expect(of(r, "medication")).toHaveLength(0);
  });
});

describe("synthetic documents (end-to-end extraction expectations)", () => {
  it("prescription", () => {
    const r = run(transcript("rx-p001-2025-03"), "prescription");
    console.log(r.warnings);
    expect(r.stats).toMatchObject({ medications: 3, diagnoses: 2, investigations: 0 });
    expect(r.documentDate.isoDate).toBe("2025-03-12");
  });
  it("laboratory report: statuses per row", () => {
    const r = run(transcript("lab-p001-2025-03"), "lab_report");
    const status = Object.fromEntries(of(r, "investigation").map((i) => [i.fields.testName, i.fields.interpretation.status]));
    expect(status).toEqual({
      Hemoglobin: "OUTSIDE_RANGE", "Fasting Glucose": "OUTSIDE_RANGE", HbA1c: "OUTSIDE_RANGE", "Serum Creatinine": "WITHIN_RANGE",
      "Total Cholesterol": "OUTSIDE_RANGE", "Serum Sodium": "WITHIN_RANGE", "Vitamin D (25-OH)": "UNABLE_TO_DETERMINE", "Serum Potassium": "UNABLE_TO_DETERMINE",
    });
  });
  it("discharge summary", () => {
    const r = run(transcript("dis-p001-2025-09"), "discharge_summary");
    expect(r.stats).toMatchObject({ medications: 4, diagnoses: 2, investigations: 3, procedures: 1 });
    expect(r.documentDate).toMatchObject({ role: "DISCHARGE_DATE", isoDate: "2025-09-06" });
  });
  it("undated prescription keeps its date unknown", () => {
    const r = run(transcript("rx-p002-undated"), "prescription");
    expect(r.documentDate).toBeNull();
    expect(of(r, "date")).toHaveLength(0);
  });
});
