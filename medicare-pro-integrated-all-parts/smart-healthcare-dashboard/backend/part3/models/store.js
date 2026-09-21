// Part 3 — self-contained persistence. In-memory maps with optional write-through JSON file + blob files.
// No dependency on the repo's Postgres/Mongo layers. Swap for a database by re-implementing this interface.
import fs from "node:fs";
import path from "node:path";
import { AppError } from "../middleware/errors.js";

const clone = (v) => (v === undefined ? v : structuredClone(v));
const STORE_VERSION = 1;

export class Part3Store {
  constructor({ dataDir = null, logger = console } = {}) {
    this.dataDir = dataDir;
    this.logger = logger;
    this.#clear();
    if (dataDir) {
      fs.mkdirSync(path.join(dataDir, "files"), { recursive: true });
      this.#load();
    }
  }

  #clear() {
    this.documents = new Map();
    this.ocrResults = new Map(); // by documentId
    this.extractions = new Map(); // by documentId
    this.timelineEvents = new Map(); // by event id
    this.auditEvents = [];
    this.blobs = new Map();
  }

  get storeFile() { return path.join(this.dataDir, "store.json"); }
  blobFile(id) { return path.join(this.dataDir, "files", `${id}.bin`); }

  #load() {
    if (!fs.existsSync(this.storeFile)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.storeFile, "utf8"));
      for (const d of raw.documents ?? []) this.documents.set(d.id, d);
      for (const o of raw.ocrResults ?? []) this.ocrResults.set(o.documentId, o);
      for (const x of raw.extractions ?? []) this.extractions.set(x.documentId, x);
      for (const e of raw.timelineEvents ?? []) this.timelineEvents.set(e.id, e);
      this.auditEvents = raw.auditEvents ?? [];
      // A crash mid-OCR must not leave a document stuck.
      for (const d of this.documents.values()) if (d.status === "OCR_IN_PROGRESS") d.status = "UPLOADED";
    } catch (err) {
      const backup = `${this.storeFile}.corrupt-${Date.now()}`;
      this.logger.error(JSON.stringify({ level: "error", service: "part3", code: "STORE_CORRUPT", message: err.message, movedTo: backup }));
      fs.renameSync(this.storeFile, backup);
      this.#clear();
    }
  }

  #save() {
    if (!this.dataDir) return;
    try {
      const payload = {
        version: STORE_VERSION,
        documents: [...this.documents.values()],
        ocrResults: [...this.ocrResults.values()],
        extractions: [...this.extractions.values()],
        timelineEvents: [...this.timelineEvents.values()],
        auditEvents: this.auditEvents,
      };
      const tmp = `${this.storeFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(payload));
      fs.renameSync(tmp, this.storeFile);
    } catch (err) {
      this.logger.error(JSON.stringify({ level: "error", service: "part3", code: "STORE_WRITE_FAILED", message: err.message }));
      throw new AppError(500, "STORAGE_ERROR", "The record could not be saved. Please retry.");
    }
  }

  // ---- documents
  insertDocument(doc, buffer) {
    this.documents.set(doc.id, clone(doc));
    if (this.dataDir) fs.writeFileSync(this.blobFile(doc.id), buffer);
    else this.blobs.set(doc.id, Buffer.from(buffer));
    this.#save();
    return clone(doc);
  }
  getDocument(id) { return clone(this.documents.get(id)); }
  findDocumentByHash(patientId, sha256) {
    for (const d of this.documents.values()) if (d.patientId === patientId && d.sha256 === sha256) return clone(d);
    return undefined;
  }
  listDocuments({ patientId, status, offset = 0, limit = 20 } = {}) {
    const all = [...this.documents.values()]
      .filter((d) => (!patientId || d.patientId === patientId) && (!status || d.status === status))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || a.id.localeCompare(b.id));
    return { items: all.slice(offset, offset + limit).map(clone), total: all.length };
  }
  updateDocument(id, patch) {
    const current = this.documents.get(id);
    if (!current) return undefined;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.documents.set(id, next);
    this.#save();
    return clone(next);
  }
  getBlob(id) {
    if (!this.documents.has(id)) return undefined;
    if (!this.dataDir) return this.blobs.get(id);
    try { return fs.readFileSync(this.blobFile(id)); } catch { return undefined; }
  }
  countDocumentsByPatient() {
    const counts = {};
    for (const d of this.documents.values()) counts[d.patientId] = (counts[d.patientId] ?? 0) + 1;
    return counts;
  }

  // ---- OCR / extraction
  setOcrResult(result) { this.ocrResults.set(result.documentId, clone(result)); this.#save(); return clone(result); }
  getOcrResult(documentId) { return clone(this.ocrResults.get(documentId)); }
  setExtraction(extraction) { this.extractions.set(extraction.documentId, clone(extraction)); this.#save(); return clone(extraction); }
  getExtraction(documentId) { return clone(this.extractions.get(documentId)); }

  // ---- timeline
  addTimelineEvents(events) {
    for (const e of events) if (!this.timelineEvents.has(e.id)) this.timelineEvents.set(e.id, clone(e));
    this.#save();
  }
  listTimelineEvents({ patientId, documentId } = {}) {
    return [...this.timelineEvents.values()].filter((e) => (!patientId || e.patientId === patientId) && (!documentId || e.documentId === documentId)).map(clone);
  }

  // ---- audit (append-only from the application's point of view)
  appendAudit(event) {
    this.auditEvents.push(clone(event));
    if (this.auditEvents.length > 5000) this.auditEvents.splice(0, this.auditEvents.length - 5000);
    this.#save();
  }
  listAudit({ documentId, patientId, limit = 100 } = {}) {
    return this.auditEvents
      .filter((e) => (!documentId || e.resourceId === documentId) && (!patientId || e.patientId === patientId))
      .slice(-limit).reverse().map(clone);
  }

  resetAll() {
    if (this.dataDir) {
      for (const id of this.documents.keys()) fs.rmSync(this.blobFile(id), { force: true });
    }
    this.#clear();
    this.#save();
  }
}
