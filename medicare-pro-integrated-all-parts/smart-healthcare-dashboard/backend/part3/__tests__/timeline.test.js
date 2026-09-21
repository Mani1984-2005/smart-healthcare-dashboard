import { describe, expect, it } from "vitest";
import { actor, processFixture, testContext } from "./helpers.js";
import { buildTimelineEvents, sortTimelineEvents } from "../services/timeline/timelineBuilder.js";

const who = actor("DOCTOR");
const timeline = (ctx, patientId, query = {}) => ctx.documents.getTimeline({ actor: who, requestId: "t", patientId, ...query });
const P001 = ["rx-p001-2025-03", "lab-p001-2025-03", "dis-p001-2025-09", "lab-p001-2025-12"];

async function loadedContext(ids = P001) {
  const ctx = testContext();
  for (const id of ids) await processFixture(ctx, id);
  return ctx;
}

describe("chronological timeline", () => {
  it("orders events chronologically across several documents", async () => {
    const ctx = await loadedContext();
    const { events, undated, counts } = timeline(ctx, "DEMO-P001");
    expect(undated).toEqual([]);
    const dates = events.map((e) => e.eventDate);
    expect(dates).toEqual([...dates].sort());
    expect(dates[0]).toBe("2025-03-12");
    expect(dates.at(-1)).toBe("2025-12-10");
    expect(new Set(events.map((e) => e.documentId)).size).toBe(4);
    expect(counts.byType).toMatchObject({ DOCUMENT: 4, DIAGNOSIS: 4, MEDICATION: 7, PROCEDURE: 1, CLINICAL_EVENT: 2 });
  });

  it("supports newest-first order", async () => {
    const ctx = await loadedContext();
    const dates = timeline(ctx, "DEMO-P001", { order: "desc" }).events.map((e) => e.eventDate);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("dates each event from the document, using the sample date for lab results and the procedure's own date", async () => {
    const ctx = await loadedContext();
    const { events } = timeline(ctx, "DEMO-P001");
    const hb = events.find((e) => e.title.startsWith("Hemoglobin: 10.8"));
    expect(hb).toMatchObject({ eventDate: "2025-03-15", dateBasis: "SAMPLE_COLLECTION_DATE" });
    expect(hb.dateSource.text).toContain("Sample collected");
    const rx = events.find((e) => e.title === "Medication: Metformin 500 mg");
    expect(rx).toMatchObject({ eventDate: "2025-03-12", dateBasis: "DOCUMENT_DATE" });
    expect(events.find((e) => e.eventType === "PROCEDURE")).toMatchObject({ eventDate: "2025-09-03", dateBasis: "PROCEDURE_DATE" });
    expect(events.filter((e) => e.eventType === "CLINICAL_EVENT").map((e) => [e.title, e.eventDate])).toEqual([["Admitted", "2025-09-02"], ["Discharged", "2025-09-06"]]);
  });

  it("keeps provenance: every event points at its source document and the exact text it came from", async () => {
    const ctx = await loadedContext();
    for (const e of timeline(ctx, "DEMO-P001").events) {
      const ocr = ctx.store.getOcrResult(e.documentId);
      expect(e.source.documentId).toBe(e.documentId);
      expect(e.source.ocrResultId).toBe(ocr.id);
      expect(e.verificationStatus).toBe("EXTRACTED_UNVERIFIED");
      expect(e.synthetic).toBe(true);
      if (e.source.text !== null) expect(ocr.text.slice(e.source.start, e.source.end)).toBe(e.source.text);
    }
  });

  it("carries the abnormal-lab classification onto investigation events", async () => {
    const ctx = await loadedContext(["lab-p001-2025-03"]);
    const status = Object.fromEntries(timeline(ctx, "DEMO-P001").events.filter((e) => e.eventType === "INVESTIGATION").map((e) => [e.title.split(":")[0], e.interpretationStatus]));
    expect(status.Hemoglobin).toBe("OUTSIDE_RANGE");
    expect(status["Serum Creatinine"]).toBe("WITHIN_RANGE");
    expect(status["Vitamin D (25-OH)"]).toBe("UNABLE_TO_DETERMINE");
  });

  it("places events from a document with no readable date in an undated group — never by upload time", async () => {
    const ctx = await loadedContext(["rx-p002-undated"]);
    const { events, undated } = timeline(ctx, "DEMO-P002");
    expect(events).toEqual([]);
    expect(undated.length).toBeGreaterThan(0);
    for (const e of undated) expect(e).toMatchObject({ eventDate: null, dateBasis: "UNKNOWN", dateSource: null });
  });

  it("mixes dated and undated documents correctly", async () => {
    const ctx = await loadedContext(["rx-p001-2025-03"]);
    await processFixture(ctx, "rx-p002-undated");
    expect(timeline(ctx, "DEMO-P001").undated).toEqual([]);
    expect(timeline(ctx, "DEMO-P002").events).toEqual([]);
  });

  it("keeps patients separate", async () => {
    const ctx = await loadedContext(["rx-p001-2025-03", "rx-p002-undated"]);
    expect(timeline(ctx, "DEMO-P001").events.every((e) => e.patientId === "DEMO-P001")).toBe(true);
    expect([...timeline(ctx, "DEMO-P002").undated].every((e) => e.patientId === "DEMO-P002")).toBe(true);
  });

  it("filters by type and date range", async () => {
    const ctx = await loadedContext();
    const onlyDx = timeline(ctx, "DEMO-P001", { types: ["DIAGNOSIS"] });
    expect(onlyDx.events.every((e) => e.eventType === "DIAGNOSIS")).toBe(true);
    const sept = timeline(ctx, "DEMO-P001", { from: "2025-09-01", to: "2025-09-30" });
    expect(sept.events.every((e) => e.eventDate.startsWith("2025-09"))).toBe(true);
    expect(sept.events.length).toBeGreaterThan(5);
  });

  it("adding to the timeline twice does not duplicate events", async () => {
    const ctx = await loadedContext(["rx-p001-2025-03"]);
    const before = timeline(ctx, "DEMO-P001").counts.dated;
    const [document] = ctx.store.listDocuments({ patientId: "DEMO-P001" }).items;
    const again = await ctx.documents.addToTimeline({ actor: who, requestId: "t", documentId: document.id });
    expect(again.alreadyDone).toBe(true);
    expect(timeline(ctx, "DEMO-P001").counts.dated).toBe(before);
  });

  it("requires extraction before a document can be added", async () => {
    const ctx = testContext();
    const { document } = await ctx.documents.ingestFixture({ actor: who, requestId: "t", fixtureId: "rx-p001-2025-03" });
    await expect(ctx.documents.addToTimeline({ actor: who, requestId: "t", documentId: document.id })).rejects.toMatchObject({ status: 409, code: "EXTRACTION_REQUIRED" });
  });

  it("returns an empty timeline for a patient with no documents, and 404 for an unknown patient", () => {
    const ctx = testContext();
    expect(timeline(ctx, "DEMO-P001")).toMatchObject({ events: [], undated: [], counts: { dated: 0, undated: 0 } });
    expect(() => timeline(ctx, "NOPE-1")).toThrow(expect.objectContaining({ status: 404 }));
  });

  it("sorts deterministically when several events share a date", () => {
    const mk = (id, type, start) => ({ id, documentId: "d1", eventType: type, eventDate: "2025-01-01", source: { start } });
    const { dated } = sortTimelineEvents([mk("c", "MEDICATION", 5), mk("b", "DIAGNOSIS", 9), mk("a", "DOCUMENT", null)]);
    expect(dated.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("buildTimelineEvents never invents a date", () => {
    const events = buildTimelineEvents({
      document: { id: "d", patientId: "DEMO-P001", docType: "prescription", synthetic: true },
      ocrResultId: "ocr_d",
      extraction: { entities: [{ id: "dx-1", kind: "diagnosis", fields: { name: "Cough" }, source: { start: 0, end: 5, line: 1, text: "Cough" } }], documentDate: null },
    });
    expect(events.every((e) => e.eventDate === null)).toBe(true);
  });
});
