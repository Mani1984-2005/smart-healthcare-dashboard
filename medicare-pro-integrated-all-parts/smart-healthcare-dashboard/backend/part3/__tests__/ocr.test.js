import { describe, expect, it } from "vitest";
import { actor, notAFixturePng, testContext } from "./helpers.js";
import { OcrError } from "../services/ocr/OcrError.js";

const who = actor("DOCTOR");
const base = { actor: who, requestId: "t" };
const stubProvider = (id, recognize, extra = {}) => ({ id, label: `Stub ${id}`, kind: "real", version: "0", description: "test", capabilities: { printed: true, handwritten: false, languages: ["en"], mimeTypes: ["image/png", "image/jpeg"] }, supports: () => true, recognize, ...extra });
const withProviders = (providers, overrides = {}) => testContext({ ocrProviders: providers, overrides: { ocr: { enabledProviders: ["synthetic-demo", ...providers.map((p) => p.id)], ...overrides } } });

describe("OCR processing", () => {
  it("processes a valid synthetic document with the labelled demo provider", async () => {
    const ctx = testContext();
    const { document } = await ctx.documents.ingestFixture({ ...base, fixtureId: "lab-p001-2025-03" });
    expect(document).toMatchObject({ status: "UPLOADED", synthetic: true, origin: "SYNTHETIC_FIXTURE" });
    const { ocr, document: after } = await ctx.documents.runOcr({ ...base, documentId: document.id });
    expect(after.status).toBe("OCR_COMPLETED");
    expect(ocr).toMatchObject({ status: "completed", provider: { id: "synthetic-demo", kind: "demo" }, providerConfidence: null });
    expect(ocr.text).toContain("Hemoglobin");
    expect(ocr.textLength).toBe(ocr.text.length);
  });

  it("reports an empty OCR result honestly and refuses to extract from it", async () => {
    const ctx = testContext();
    const { document } = await ctx.documents.ingestFixture({ ...base, fixtureId: "blank-p002-scan" });
    const { ocr, document: after } = await ctx.documents.runOcr({ ...base, documentId: document.id });
    expect(ocr.status).toBe("empty");
    expect(ocr.text).toBe("");
    expect(after.status).toBe("OCR_EMPTY");
    await expect(ctx.documents.runExtraction({ ...base, documentId: document.id })).rejects.toMatchObject({ status: 422, code: "NO_OCR_TEXT" });
  });

  it("rejects a document the demo provider does not know — it never invents text", async () => {
    const ctx = testContext();
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "prescription", filename: "scan.png", mimeType: "image/png", buffer: notAFixturePng() });
    expect(document.synthetic).toBe(false);
    await expect(ctx.documents.runOcr({ ...base, documentId: document.id })).rejects.toMatchObject({ status: 422, code: "UNSUPPORTED_DOCUMENT" });
    const bundle = ctx.documents.getBundle({ ...base, documentId: document.id });
    expect(bundle.document.status).toBe("OCR_FAILED");
    expect(bundle.ocr).toMatchObject({ status: "failed", text: "", errorCode: "UNSUPPORTED_DOCUMENT" });
    expect(bundle.extraction).toBeNull();
  });

  it("allows a retry after a failure", async () => {
    let calls = 0;
    const flaky = stubProvider("flaky", async () => { calls += 1; if (calls === 1) throw new OcrError("PROVIDER_UNAVAILABLE", "engine warming up"); return { text: "Diagnosis: Cough", pageCount: 1, detectedLanguages: ["en"], providerConfidence: 0.9 }; });
    const ctx = withProviders([flaky]);
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.png", mimeType: "image/png", buffer: notAFixturePng("retry") });
    await expect(ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "flaky" })).rejects.toMatchObject({ status: 503 });
    const { ocr } = await ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "flaky" });
    expect(ocr).toMatchObject({ status: "completed", providerConfidence: 0.9, detectedLanguages: ["en"] });
  });

  it("maps an unexpected provider crash to a generic failure without leaking internals", async () => {
    const ctx = withProviders([stubProvider("crashy", async () => { throw new Error("segfault at 0xDEADBEEF /srv/secret/path"); })]);
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.png", mimeType: "image/png", buffer: notAFixturePng("crash") });
    const err = await ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "crashy" }).catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: "OCR_FAILED" });
    expect(err.message).not.toContain("DEADBEEF");
    expect(ctx.store.getOcrResult(document.id).errorMessage).not.toContain("secret");
  });

  it("times out a provider that never answers", async () => {
    const ctx = withProviders([stubProvider("hang", () => new Promise(() => {}))], { timeoutMs: 40 });
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.png", mimeType: "image/png", buffer: notAFixturePng("hang") });
    await expect(ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "hang" })).rejects.toMatchObject({ status: 504, code: "OCR_TIMEOUT" });
    expect(ctx.store.getDocument(document.id).status).toBe("OCR_FAILED");
  });

  it("rejects a file type the provider cannot read", async () => {
    const ctx = testContext();
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("jpeg-ish")]);
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await expect(ctx.documents.runOcr({ ...base, documentId: document.id })).rejects.toMatchObject({ status: 422, code: "UNSUPPORTED_MIME" });
  });

  it("reports an unavailable provider", async () => {
    const ctx = withProviders([stubProvider("down", async () => ({ text: "x" }), { isAvailable: async () => ({ available: false, reason: "not installed" }) })]);
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.png", mimeType: "image/png", buffer: notAFixturePng("down") });
    await expect(ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "down" })).rejects.toMatchObject({ status: 503, code: "PROVIDER_UNAVAILABLE" });
  });

  it("does not run OCR twice: repeats are no-ops and concurrent runs are rejected", async () => {
    let release;
    const gate = new Promise((r) => { release = r; });
    let calls = 0;
    const slow = stubProvider("slow", async () => { calls += 1; await gate; return { text: "Diagnosis: Cough", pageCount: 1, detectedLanguages: null, providerConfidence: null }; });
    const ctx = withProviders([slow]);
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.png", mimeType: "image/png", buffer: notAFixturePng("slow") });
    const first = ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "slow" });
    await expect(ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "slow" })).rejects.toMatchObject({ status: 409, code: "OCR_IN_PROGRESS" });
    release();
    await first;
    const again = await ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "slow" });
    expect(again.alreadyDone).toBe(true);
    expect(calls).toBe(1);
  });

  it("refuses OCR output that is unreasonably large", async () => {
    const ctx = withProviders([stubProvider("huge", async () => ({ text: "x".repeat(600_000) }))]);
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.png", mimeType: "image/png", buffer: notAFixturePng("huge") });
    await expect(ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "huge" })).rejects.toMatchObject({ code: "TEXT_TOO_LARGE" });
  });

  it("strips control characters from provider output", async () => {
    const ctx = withProviders([stubProvider("dirty", async () => ({ text: "Diagnosis:\u0000 Cough\r\nRx\u0007" }))]);
    const { document } = await ctx.documents.ingest({ ...base, patientId: "DEMO-P001", docType: "other", filename: "a.png", mimeType: "image/png", buffer: notAFixturePng("dirty") });
    const { ocr } = await ctx.documents.runOcr({ ...base, documentId: document.id, providerId: "dirty" });
    expect(ocr.text).toBe("Diagnosis: Cough\nRx");
  });

  it("extraction requires successful OCR first", async () => {
    const ctx = testContext();
    const { document } = await ctx.documents.ingestFixture({ ...base, fixtureId: "rx-p001-2025-03" });
    await expect(ctx.documents.runExtraction({ ...base, documentId: document.id })).rejects.toMatchObject({ status: 409, code: "OCR_REQUIRED" });
  });
});
