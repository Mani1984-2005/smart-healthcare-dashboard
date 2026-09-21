import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Part3Store } from "../models/store.js";
import { actor, silentLogger, testContext, notAFixturePng, processFixture } from "./helpers.js";
import { createPart3Context } from "../index.js";
import { testConfig } from "./helpers.js";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "part3-store-"));

describe("persistence", () => {
  it("survives a restart: documents, blobs, OCR, extraction, timeline and audit", async () => {
    const dir = tmp();
    const config = testConfig({ dataDir: dir });
    const first = createPart3Context({ config, logger: silentLogger });
    const docId = await processFixture(first, "lab-p001-2025-03");

    const second = createPart3Context({ config, logger: silentLogger });
    expect(second.store.getDocument(docId)).toMatchObject({ status: "ON_TIMELINE", synthetic: true });
    expect(second.store.getBlob(docId).length).toBeGreaterThan(1000);
    expect(second.store.getOcrResult(docId).text).toContain("Hemoglobin");
    expect(second.store.getExtraction(docId).entities.length).toBeGreaterThan(5);
    expect(second.documents.getTimeline({ actor: actor(), requestId: "t", patientId: "DEMO-P001" }).events.length).toBe(9);
    expect(second.audit.list({}).length).toBeGreaterThan(3);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("recovers a document left mid-OCR by a crash", () => {
    const dir = tmp();
    const s = new Part3Store({ dataDir: dir, logger: silentLogger });
    s.insertDocument({ id: "doc_stuck00001", patientId: "DEMO-P001", status: "UPLOADED", uploadedAt: "2025-01-01T00:00:00Z" }, Buffer.from("x"));
    s.updateDocument("doc_stuck00001", { status: "OCR_IN_PROGRESS" });
    expect(new Part3Store({ dataDir: dir, logger: silentLogger }).getDocument("doc_stuck00001").status).toBe("UPLOADED");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("moves a corrupt store file aside and starts clean instead of crashing", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "store.json"), "{ this is not json");
    const s = new Part3Store({ dataDir: dir, logger: silentLogger });
    expect(s.listDocuments().total).toBe(0);
    expect(fs.readdirSync(dir).some((f) => f.includes("corrupt"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reset removes stored files and data", async () => {
    const dir = tmp();
    const ctx = createPart3Context({ config: testConfig({ dataDir: dir }), logger: silentLogger });
    const docId = await processFixture(ctx, "rx-p001-2025-03");
    ctx.store.resetAll();
    expect(fs.existsSync(path.join(dir, "files", `${docId}.bin`))).toBe(false);
    expect(ctx.store.listDocuments().total).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reports a storage failure as a safe 500 instead of pretending it saved", () => {
    const dir = tmp();
    const s = new Part3Store({ dataDir: dir, logger: silentLogger });
    fs.rmSync(dir, { recursive: true, force: true }); // disk vanished
    expect(() => s.insertDocument({ id: "doc_x0000000", patientId: "DEMO-P001", uploadedAt: "z" }, Buffer.from("x"))).toThrow();
  });

  it("returns copies so callers cannot mutate stored records", () => {
    const ctx = testContext();
    ctx.store.insertDocument({ id: "doc_copy000001", patientId: "DEMO-P001", status: "UPLOADED", uploadedAt: "z" }, Buffer.from("x"));
    ctx.store.getDocument("doc_copy000001").status = "HACKED";
    expect(ctx.store.getDocument("doc_copy000001").status).toBe("UPLOADED");
    void notAFixturePng;
  });
});
