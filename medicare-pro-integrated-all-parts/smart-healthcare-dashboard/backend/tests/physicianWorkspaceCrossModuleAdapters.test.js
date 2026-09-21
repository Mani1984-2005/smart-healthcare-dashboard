// backend/tests/physicianWorkspaceCrossModuleAdapters.test.js
//
// Tests for the Part 4 -> Part 5 bridge (clinicalIntelligenceAdapter.js)
// and the Part 3 -> Part 5 bridge (part3DocumentsAdapter.js).

import { describe, it, expect, afterEach } from "vitest";
import {
  configureClinicalIntelligenceStore,
  listClinicalIntelligenceForPatient,
  __resetForTesting as resetCI,
} from "../services/physicianWorkspace/clinicalIntelligenceAdapter.js";
import {
  configureDocumentsStore,
  listDocumentsForPatient,
  __resetForTesting as resetDocs,
} from "../services/physicianWorkspace/part3DocumentsAdapter.js";
import { AnalysisStore } from "../clinical-intelligence/service/stores.js";
import { Part3Store } from "../part3/models/store.js";

describe("Part 4 -> Part 5: clinicalIntelligenceAdapter", () => {
  afterEach(() => resetCI());

  it("returns nothing until configured, and never throws", () => {
    expect(listClinicalIntelligenceForPatient("patient-x")).toEqual([]);
  });

  it("lists a patient's analyses, most recent first, with origin/reviewRequired preserved per finding", () => {
    const store = new AnalysisStore();
    const older = {
      analysisId: "A1", generatedAt: "2026-01-01T00:00:00Z", mode: "demo", disclaimer: "d",
      patient: { id: "patient-x" },
      summary: { aiNarrative: null },
      findings: [{ id: "f1", kind: "red_flag", category: "cat", title: "t", statement: "s", severity: "high", origin: "rules", reviewRequired: true }],
      reviewItems: ["summary"], generatedBy: { id: "doc-1", role: "DOCTOR" },
    };
    const newer = {
      analysisId: "A2", generatedAt: "2026-01-02T00:00:00Z", mode: "demo", disclaimer: "d",
      patient: { id: "patient-x" },
      summary: { aiNarrative: "an AI-suggested read of the case" },
      findings: [{ id: "f2", kind: "consideration", category: "AI-suggested consideration", title: "t2", statement: "s2", severity: "low", origin: "ai", reviewRequired: true }],
      reviewItems: ["summary", "ai-narrative"], generatedBy: { id: "doc-1", role: "DOCTOR" },
    };
    const other = { ...older, analysisId: "A3", patient: { id: "patient-other" } };
    store.save(older);
    store.save(newer);
    store.save(other);

    configureClinicalIntelligenceStore(store);
    const result = listClinicalIntelligenceForPatient("patient-x");
    expect(result.map((a) => a.analysisId)).toEqual(["A2", "A1"]); // newest first
    expect(result.every((a) => a.analysisId !== "A3")).toBe(true); // never another patient's analysis
    expect(result[1].findings[0].origin).toBe("rules");
    expect(result[0].findings[0].origin).toBe("ai");
    expect(result[0].findings[0].reviewRequired).toBe(true);
    expect(result[0].aiNarrative).toBe("an AI-suggested read of the case");
  });

  it("a patient with no analyses gets an empty list, never a fabricated one", () => {
    configureClinicalIntelligenceStore(new AnalysisStore());
    expect(listClinicalIntelligenceForPatient("nobody-analyzed-yet")).toEqual([]);
  });
});

describe("Part 3 -> Part 5: part3DocumentsAdapter", () => {
  afterEach(() => resetDocs());

  function baseDoc(overrides) {
    return {
      id: "doc_1", patientId: "patient-x", docType: "lab_report", originalFilename: "x.png", mimeType: "image/png",
      sizeBytes: 1, sha256: "s1", uploadedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
      uploadedBy: { id: "u1", role: "DOCTOR" }, origin: "USER_UPLOAD", synthetic: false, fixtureId: null,
      status: "UPLOADED", ...overrides,
    };
  }

  it("returns nothing until configured, and never throws", () => {
    expect(listDocumentsForPatient("patient-x")).toEqual([]);
  });

  it("a document with completed OCR includes the OCR text; a document without it does not", () => {
    const store = new Part3Store();
    store.insertDocument(baseDoc({ id: "doc_ocr", status: "OCR_COMPLETED" }), Buffer.from("x"));
    store.setOcrResult({ documentId: "doc_ocr", text: "BP 120/80", provider: { id: "mock-ocr" } });
    store.insertDocument(baseDoc({ id: "doc_pending", status: "UPLOADED" }), Buffer.from("x"));

    configureDocumentsStore(store);
    const docs = listDocumentsForPatient("patient-x");
    const withOcr = docs.find((d) => d.id === "doc_ocr");
    const pending = docs.find((d) => d.id === "doc_pending");
    expect(withOcr.ocrText).toBe("BP 120/80");
    expect(withOcr.ocrProvider).toBe("mock-ocr");
    expect(pending.ocrText).toBeNull(); // never fabricated for a document with no completed OCR
  });

  it("never returns another patient's documents", () => {
    const store = new Part3Store();
    store.insertDocument(baseDoc({ id: "doc_mine", patientId: "patient-x" }), Buffer.from("x"));
    store.insertDocument(baseDoc({ id: "doc_theirs", patientId: "patient-y" }), Buffer.from("x"));
    configureDocumentsStore(store);
    const docs = listDocumentsForPatient("patient-x");
    expect(docs.map((d) => d.id)).toEqual(["doc_mine"]);
  });
});
