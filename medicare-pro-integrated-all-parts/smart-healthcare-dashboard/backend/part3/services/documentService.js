// Orchestrates the Part 3 workflow: ingest -> OCR -> extraction -> timeline. Every step is idempotent and audited.
import { AppError, badRequest, conflict, notFound, unprocessable } from "../middleware/errors.js";
import { findPatient } from "../seed/patients.js";
import { sha256 } from "../seed/fixtureCatalog.js";
import { OCR_ERROR_STATUS, OcrError } from "./ocr/OcrError.js";
import { EXTRACTOR, extractEntities } from "./extraction/index.js";
import { normalizeOcrText } from "./extraction/text.js";
import { buildTimelineEvents, sortTimelineEvents } from "./timeline/timelineBuilder.js";
import { withSafety } from "./safety.js";

export const DOC_TYPES = ["prescription", "lab_report", "discharge_summary", "other"];
export const STATUSES = ["UPLOADED", "OCR_IN_PROGRESS", "OCR_COMPLETED", "OCR_EMPTY", "OCR_FAILED", "EXTRACTED", "ON_TIMELINE"];
const PAST_OCR = ["OCR_COMPLETED", "EXTRACTED", "ON_TIMELINE"];

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new OcrError("OCR_TIMEOUT", `OCR did not finish within ${Math.round(ms / 1000)} seconds.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createDocumentService({ store, ocr, fixtures, config, audit, logger = console }) {
  const mustGet = (id) => {
    const doc = store.getDocument(id);
    if (!doc) throw notFound("DOCUMENT_NOT_FOUND", "Document not found.");
    return doc;
  };
  const mustPatient = (id) => {
    const patient = findPatient(id);
    if (!patient) throw notFound("PATIENT_NOT_FOUND", "Patient not found.");
    return patient;
  };

  async function ingest({ actor, requestId, patientId, docType, filename, mimeType, buffer, viaFixture = false }) {
    mustPatient(patientId);
    const hash = sha256(buffer);
    const existing = store.findDocumentByHash(patientId, hash);
    if (existing) return { document: existing, duplicate: true };

    const fixture = fixtures.findByHash(hash);
    const id = `doc_${sha256(`${patientId}:${hash}`).slice(0, 10)}`;
    const now = new Date().toISOString();
    const document = store.insertDocument(
      {
        id, patientId,
        docType: fixture ? fixture.docType : docType,
        originalFilename: filename, mimeType, sizeBytes: buffer.length, sha256: hash,
        uploadedAt: now, updatedAt: now, uploadedBy: { id: actor.id, role: actor.role },
        origin: fixture ? "SYNTHETIC_FIXTURE" : "USER_UPLOAD",
        synthetic: Boolean(fixture), fixtureId: fixture?.id ?? null,
        status: "UPLOADED",
      },
      buffer,
    );
    audit.record({ actor, action: viaFixture ? "DOCUMENT_INGESTED_FIXTURE" : "DOCUMENT_UPLOADED", resourceType: "document", resourceId: id, patientId, requestId, details: { docType: document.docType, sizeBytes: buffer.length, mimeType, synthetic: document.synthetic } });
    return { document, duplicate: false };
  }

  function ingestFixture({ actor, requestId, fixtureId }) {
    const fixture = fixtures.get(fixtureId);
    if (!fixture) throw notFound("FIXTURE_NOT_FOUND", "Synthetic demo document not found.");
    return ingest({ actor, requestId, patientId: fixture.patientId, docType: fixture.docType, filename: fixture.imageFile, mimeType: fixture.mimeType, buffer: fixtures.getImage(fixtureId), viaFixture: true });
  }

  async function failOcr({ doc, provider, err, startedAt, actor, requestId }) {
    const known = err instanceof OcrError;
    if (!known) logger.error(JSON.stringify({ level: "error", service: "part3", code: "OCR_PROVIDER_ERROR", providerId: provider.id, requestId, message: err?.message }));
    const code = known ? err.code : "OCR_FAILED";
    const message = known ? err.message : "The OCR provider failed to process this document.";
    const now = new Date();
    store.setOcrResult({
      id: `ocr_${doc.id}`, documentId: doc.id,
      provider: { id: provider.id, label: provider.label, kind: provider.kind, version: provider.version },
      status: "failed", text: "", textLength: 0, pageCount: 0, languageHints: [], detectedLanguages: null, providerConfidence: null,
      errorCode: code, errorMessage: message, startedAt, completedAt: now.toISOString(), durationMs: now.getTime() - new Date(startedAt).getTime(),
    });
    store.updateDocument(doc.id, { status: "OCR_FAILED" });
    audit.record({ actor, action: "OCR_RUN", resourceType: "document", resourceId: doc.id, patientId: doc.patientId, outcome: "failure", requestId, details: { providerId: provider.id, errorCode: code } });
    throw new AppError(OCR_ERROR_STATUS[code] ?? 502, code, message);
  }

  async function runOcr({ actor, requestId, documentId, providerId, languageHints = [] }) {
    const doc = mustGet(documentId);
    if (doc.status === "OCR_IN_PROGRESS") throw conflict("OCR_IN_PROGRESS", "OCR is already running for this document.");
    if (PAST_OCR.includes(doc.status)) return { document: doc, ocr: store.getOcrResult(documentId), alreadyDone: true };

    const provider = ocr.get(providerId);
    if (!provider) throw badRequest("UNKNOWN_OCR_PROVIDER", providerId ? `OCR provider "${providerId}" is not enabled.` : "No OCR provider is enabled.");
    const availability = provider.isAvailable ? await provider.isAvailable() : { available: true };
    if (!availability.available) throw new AppError(503, "PROVIDER_UNAVAILABLE", `${provider.label} is unavailable${availability.reason ? `: ${availability.reason}` : "."}`);

    const startedAt = new Date().toISOString();
    if (!provider.supports(doc.mimeType)) {
      return failOcr({ doc, provider, startedAt, actor, requestId, err: new OcrError("UNSUPPORTED_MIME", `${provider.label} cannot process ${doc.mimeType} files.`) });
    }

    store.updateDocument(doc.id, { status: "OCR_IN_PROGRESS" }); // in-flight lock against double submits
    let output;
    try {
      output = await withTimeout(provider.recognize({ buffer: store.getBlob(doc.id), mimeType: doc.mimeType, languageHints }), config.ocr.timeoutMs);
    } catch (err) {
      return failOcr({ doc, provider, err, startedAt, actor, requestId });
    }

    const text = normalizeOcrText(output?.text);
    if (text.length > config.maxOcrTextChars) {
      return failOcr({ doc, provider, startedAt, actor, requestId, err: new OcrError("TEXT_TOO_LARGE", "The OCR output is too large to process safely.") });
    }
    const completedAt = new Date();
    const status = text.trim() ? "completed" : "empty";
    const result = store.setOcrResult({
      id: `ocr_${doc.id}`, documentId: doc.id,
      provider: { id: provider.id, label: provider.label, kind: provider.kind, version: provider.version },
      status, text, textLength: text.length, pageCount: output?.pageCount ?? 1, languageHints,
      detectedLanguages: output?.detectedLanguages ?? null, providerConfidence: output?.providerConfidence ?? null,
      startedAt, completedAt: completedAt.toISOString(), durationMs: completedAt.getTime() - new Date(startedAt).getTime(),
    });
    const updated = store.updateDocument(doc.id, { status: status === "completed" ? "OCR_COMPLETED" : "OCR_EMPTY" });
    audit.record({ actor, action: "OCR_RUN", resourceType: "document", resourceId: doc.id, patientId: doc.patientId, requestId, details: { providerId: provider.id, providerKind: provider.kind, status, textLength: text.length } });
    return { document: updated, ocr: result, alreadyDone: false };
  }

  async function runExtraction({ actor, requestId, documentId }) {
    const doc = mustGet(documentId);
    if (doc.status === "EXTRACTED" || doc.status === "ON_TIMELINE") return { document: doc, extraction: store.getExtraction(documentId), alreadyDone: true };
    if (doc.status === "OCR_EMPTY") throw unprocessable("NO_OCR_TEXT", "OCR found no text in this document, so there is nothing to extract.");
    if (doc.status !== "OCR_COMPLETED") throw conflict("OCR_REQUIRED", "Run OCR successfully before extracting entities.");

    const ocrResult = store.getOcrResult(documentId);
    const result = extractEntities({ text: ocrResult.text, docType: doc.docType });
    const extraction = store.setExtraction({ id: `ext_${documentId}`, documentId, ocrResultId: ocrResult.id, extractedAt: new Date().toISOString(), ...result });
    const updated = store.updateDocument(documentId, { status: "EXTRACTED" });
    audit.record({ actor, action: "EXTRACTION_RUN", resourceType: "document", resourceId: documentId, patientId: doc.patientId, requestId, details: { extractor: EXTRACTOR.id, extractorVersion: EXTRACTOR.version, stats: result.stats, warnings: result.warnings.length } });
    return { document: updated, extraction, alreadyDone: false };
  }

  async function addToTimeline({ actor, requestId, documentId }) {
    const doc = mustGet(documentId);
    if (doc.status === "ON_TIMELINE") return { document: doc, events: store.listTimelineEvents({ documentId }), alreadyDone: true };
    if (doc.status !== "EXTRACTED") throw conflict("EXTRACTION_REQUIRED", "Extract entities from this document before adding it to the timeline.");
    const extraction = store.getExtraction(documentId);
    const events = buildTimelineEvents({ document: doc, ocrResultId: extraction.ocrResultId, extraction });
    store.addTimelineEvents(events);
    const updated = store.updateDocument(documentId, { status: "ON_TIMELINE" });
    audit.record({ actor, action: "TIMELINE_ADDED", resourceType: "document", resourceId: documentId, patientId: doc.patientId, requestId, details: { eventCount: events.length, undated: events.filter((e) => !e.eventDate).length } });
    return { document: updated, events, alreadyDone: false };
  }

  function getBundle({ actor, requestId, documentId }) {
    const doc = mustGet(documentId);
    audit.record({ actor, action: "DOCUMENT_VIEWED", resourceType: "document", resourceId: documentId, patientId: doc.patientId, requestId });
    return withSafety({ document: doc, ocr: store.getOcrResult(documentId) ?? null, extraction: store.getExtraction(documentId) ?? null });
  }

  function getFile({ actor, requestId, documentId }) {
    const doc = mustGet(documentId);
    const buffer = store.getBlob(documentId);
    if (!buffer) throw notFound("FILE_NOT_FOUND", "The stored file is missing.");
    audit.record({ actor, action: "DOCUMENT_FILE_ACCESSED", resourceType: "document", resourceId: documentId, patientId: doc.patientId, requestId });
    return { doc, buffer };
  }

  function listDocuments({ patientId, status, page = 1, limit = 20 }) {
    if (patientId) mustPatient(patientId);
    const { items, total } = store.listDocuments({ patientId, status, offset: (page - 1) * limit, limit });
    return { items, total, page, limit };
  }

  function getTimeline({ actor, requestId, patientId, order = "asc", types = null, from = null, to = null }) {
    mustPatient(patientId);
    let events = store.listTimelineEvents({ patientId });
    if (types) events = events.filter((e) => types.includes(e.eventType));
    const { dated, undated } = sortTimelineEvents(events, order);
    const inRange = dated.filter((e) => (!from || e.eventDate >= from) && (!to || e.eventDate <= to));
    audit.record({ actor, action: "TIMELINE_VIEWED", resourceType: "patient_timeline", resourceId: patientId, patientId, requestId });
    const byType = {};
    for (const e of [...inRange, ...undated]) byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
    return withSafety({ patientId, order, events: inRange, undated, counts: { dated: inRange.length, undated: undated.length, byType } });
  }

  return { ingest, ingestFixture, runOcr, runExtraction, addToTimeline, getBundle, getFile, listDocuments, getTimeline, mustPatient };
}
