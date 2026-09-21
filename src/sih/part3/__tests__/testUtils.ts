import { createElement, ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { Part3ClientContext } from "../services/clientContext";
import type { Part3Client } from "../services/client";
import type { Extraction, ExtractedEntity, InterpretationStatus, InvestigationEntity, TimelineEvent } from "../types/part3";

/** A client whose every method fails loudly unless the test provides it. */
export function fakeClient(overrides: Record<string, unknown> = {}): Part3Client {
  const notMocked = new Proxy({}, { get: (_t, name) => vi.fn(() => Promise.reject(new Error(`client.${String(name)} was not mocked`))) });
  return { ...(notMocked as object), ...overrides } as unknown as Part3Client;
}

export function renderWithClient(ui: ReactElement, client: Part3Client, route = "/") {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [route] }, createElement(Part3ClientContext.Provider, { value: client }, children));
  return render(ui, { wrapper: Wrapper });
}

const span = (start: number, text: string) => ({ start, end: start + text.length, line: 1, text });

export function inv(id: string, testName: string, raw: string, unit: string | null, range: string | null, status: InterpretationStatus, direction: "BELOW" | "ABOVE" | null = null, start = 0): InvestigationEntity {
  const numeric = Number(raw);
  return {
    id, kind: "investigation", verificationStatus: "EXTRACTED_UNVERIFIED", unknownFields: [], source: span(start, `${testName} ${raw}`),
    fields: {
      testName, value: { raw, numeric: Number.isNaN(numeric) ? null : numeric, comparator: null }, unit,
      referenceRange: range ? { raw: range, kind: "BETWEEN", low: null, high: null, lowInclusive: true, highInclusive: true, unit: null } : null,
      interpretation: { status, direction, reason: status, explanation: `${testName} explanation (${status})` },
    },
  };
}

export function makeExtraction(entities: ExtractedEntity[], extra: Partial<Extraction> = {}): Extraction {
  const count = (k: string) => entities.filter((e) => e.kind === k).length;
  return {
    id: "ext_1", documentId: "doc_1", ocrResultId: "ocr_doc_1", extractedAt: "2025-03-16T00:00:00Z", extractor: { id: "rule-based-extractor", version: "1.0.0", kind: "rule-based" },
    verificationStatus: "EXTRACTED_UNVERIFIED", entities, warnings: [], documentDate: null,
    stats: { medications: count("medication"), diagnoses: count("diagnosis"), investigations: count("investigation"), procedures: count("procedure"), dates: count("date") },
    ...extra,
  };
}

export function event(partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "title">): TimelineEvent {
  return {
    patientId: "DEMO-P001", documentId: "doc_1", docType: "lab_report", entityId: "x", eventType: "INVESTIGATION", eventDate: "2025-03-15", dateBasis: "SAMPLE_COLLECTION_DATE", dateSource: null,
    details: {}, source: { documentId: "doc_1", ocrResultId: "ocr_doc_1", start: 10, end: 20, line: 3, text: "abc" }, verificationStatus: "EXTRACTED_UNVERIFIED", synthetic: true, createdAt: "2025-03-16T00:00:00Z",
    ...partial,
  };
}

export const safety = { verificationStatus: "EXTRACTED_UNVERIFIED" as const, generatedBy: "test", notice: "notice" };
