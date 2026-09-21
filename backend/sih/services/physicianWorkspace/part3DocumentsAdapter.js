// backend/services/physicianWorkspace/part3DocumentsAdapter.js
//
// Part 3 -> Part 5 integration boundary. Same shape as
// clinicalIntelligenceAdapter.js (Part 4 -> Part 5): reads the SAME
// Part3Store instance Part 3's own router uses (configured once from
// server.js), through Part 5's own auth boundary, never Part 3's.
//
// Part 3 documents have no `encounterId` field (confirmed by inspection —
// see docs/SIH_PARTS_1_2_5_6_INTEGRATION.md, Part 3 audit notes); the only
// identifier Part 3 and Part 5 actually share is `patientId`, so that is
// what this adapter joins on. Nothing here invents an encounter
// association Part 3's own data doesn't have.
//
// Provenance: OCR text is always returned tagged as OCR output, never as
// confirmed clinical fact, and only for documents whose OCR has actually
// completed (status OCR_COMPLETED/EXTRACTED/ON_TIMELINE) — the same
// "no text, no record" rule already used by the Part 1/3 -> Part 6 bridge
// (backend/part6/adapters/realRecordSource.js). A document still uploading
// or with failed/empty OCR is listed (so the physician knows it exists) but
// its `ocrText` is left null rather than fabricated.

const PAST_OCR = new Set(["OCR_COMPLETED", "EXTRACTED", "ON_TIMELINE"]);

let documentsStore = null;

/** Called once from server.js with the SAME Part3Store instance Part 3's own router uses. */
export function configureDocumentsStore(store) {
  documentsStore = store;
}

/** Test-only reset, mirroring intakeService.__setDepsForTesting's naming convention. */
export function __resetForTesting() {
  documentsStore = null;
}

/**
 * All of a patient's Part 3 documents, newest first, with OCR text attached
 * only where OCR has actually completed. Never returns another patient's
 * documents: listDocuments({ patientId }) is Part 3's own filter, not a
 * client-supplied one.
 */
export function listDocumentsForPatient(patientId) {
  if (!documentsStore || !patientId) return [];
  const { items } = documentsStore.listDocuments({ patientId, limit: 200 });
  return items.map((doc) => {
    const ocr = PAST_OCR.has(doc.status) ? documentsStore.getOcrResult(doc.id) : null;
    return {
      id: doc.id,
      docType: doc.docType,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      origin: doc.origin, // "USER_UPLOAD" | "SYNTHETIC_FIXTURE" — Part 3's own label, carried through unchanged
      ocrText: ocr?.text ?? null,
      ocrProvider: ocr?.provider?.id ?? null,
    };
  });
}
