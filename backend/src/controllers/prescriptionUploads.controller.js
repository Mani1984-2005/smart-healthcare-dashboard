// backend/src/controllers/prescriptionUploads.controller.js
//
// Dedicated OCR upload pipeline for the isolated `prescription_uploads`
// schema. The legacy `/api/prescriptions` controllers and their
// INTEGER-id `prescriptions` table are intentionally untouched.
//
// Pipeline: validate real file contents -> private storage + checksum ->
// DB record + audit -> status transitions -> PaddleOCR (images) or
// pdf-parse (PDFs) -> persist OCR result -> audit -> safe temp cleanup.

import fs from 'fs';
import sharp from 'sharp';

import pool from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { computeChecksum } from '../services/storage.service.js';
import { preprocessImage } from '../services/imagePreprocess.service.js';
import { runImageOcr, runPdfExtraction } from '../services/ocr.service.js';
import {
  sniffFileContent,
  hasPdfTrailer,
  generateStoredFilename,
  resolvePrivatePath,
  safePrivateDelete,
  privateFileExists,
  SUPPORTED_CONTENT_TYPES,
} from '../services/privateStorage.service.js';
import {
  withTransaction,
  insertUpload,
  updateUpload,
  getUploadById,
  listUploads,
  softDeleteUpload,
  insertAuditEntry,
  recordAuditSafe,
  auditContextFromRequest,
  sanitizeErrorMessage,
  serializeUpload,
  serializeAuditEntry,
  UPLOAD_SOURCES,
  UPLOAD_STATUSES,
} from '../services/prescriptionUploads.service.js';

function normalizeDeclaredMime(mime) {
  const value = String(mime || '').toLowerCase().trim();
  if (value === 'image/jpg' || value === 'image/pjpeg') return 'image/jpeg';
  return value;
}

function resolveUploadSource(bodyValue, detectedMime) {
  const inferred = detectedMime === 'application/pdf' ? 'pdf' : 'image';

  if (bodyValue === undefined || bodyValue === null || bodyValue === '') {
    return inferred;
  }

  const source = String(bodyValue).trim();
  if (!UPLOAD_SOURCES.includes(source)) {
    throw AppError.badRequest(
      `Invalid uploadSource "${source}". Must be one of: ${UPLOAD_SOURCES.join(', ')}.`
    );
  }

  if (detectedMime === 'application/pdf' && source !== 'pdf') {
    throw AppError.badRequest(
      'This document is a PDF — set uploadSource to "pdf".'
    );
  }

  if (detectedMime !== 'application/pdf' && source === 'pdf') {
    throw AppError.badRequest(
      'uploadSource "pdf" was supplied but the file content is not a PDF.'
    );
  }

  return source;
}

/**
 * Validates the ACTUAL bytes on disk (never trusts the browser MIME) and
 * returns { detectedMime, imageWidth, imageHeight }.
 * Throws AppError (415/400) for anything unsupported or malformed.
 */
async function validateStoredFile(file) {
  const declared = normalizeDeclaredMime(file.mimetype);
  const detected = await sniffFileContent(file.path);

  if (!detected || !SUPPORTED_CONTENT_TYPES.includes(detected)) {
    throw AppError.unsupportedMedia(
      'File content is not a supported JPEG, PNG, WebP or PDF document.'
    );
  }

  if (declared && detected !== declared) {
    throw AppError.unsupportedMedia(
      'File content does not match its declared type.'
    );
  }

  if (detected === 'application/pdf') {
    const ok = await hasPdfTrailer(file.path);
    if (!ok) {
      throw AppError.unsupportedMedia(
        'The PDF file is malformed (missing structural trailer).'
      );
    }
    return { detectedMime: detected, imageWidth: null, imageHeight: null };
  }

  // For images, require that the bytes actually decode (catches truncated
  // or deliberately corrupted uploads).
  let metadata;
  try {
    metadata = await sharp(file.path).metadata();
  } catch {
    throw AppError.unsupportedMedia(
      'The image file is corrupted or could not be decoded.'
    );
  }

  if (!metadata.width || !metadata.height) {
    throw AppError.unsupportedMedia('The image has invalid dimensions.');
  }

  const expectedFormat = detected.split('/')[1];
  if (metadata.format !== expectedFormat) {
    throw AppError.unsupportedMedia(
      'Image decoding format does not match the detected file signature.'
    );
  }

  return {
    detectedMime: detected,
    imageWidth: metadata.width,
    imageHeight: metadata.height,
  };
}

// ---------------------------------------------------------------------
// POST /api/prescription-uploads
// ---------------------------------------------------------------------

export const createUpload = asyncHandler(async (req, res) => {
  const file = req.file;
  const auditCtx = auditContextFromRequest(req);

  if (!file) {
    throw AppError.badRequest(
      'No file was uploaded. Attach a field named "prescription".'
    );
  }

  // 1. Validate real content + source coherence. On failure the stored
  //    temp file is removed because nothing has been recorded yet.
  let validated;
  let uploadSource;
  try {
    validated = await validateStoredFile(file);
    uploadSource = resolveUploadSource(
      req.body?.uploadSource,
      validated.detectedMime
    );
  } catch (err) {
    await safePrivateDelete(file.path);
    throw err;
  }

  let checksum;
  try {
    checksum = await computeChecksum(file.path);
  } catch (err) {
    await safePrivateDelete(file.path);
    throw AppError.internal(`Could not read uploaded file: ${err.message}`);
  }

  // 2. Persist the record + first audit entry atomically. On failure the
  //    temp file is removed and the error propagates (HTTP 500).
  let upload;
  try {
    upload = await withTransaction(async (client) => {
      const row = await insertUpload(client, {
        originalFilename: file.originalname,
        storedFilename: file.filename,
        filePath: file.path,
        fileSizeBytes: file.size,
        mimeType: validated.detectedMime,
        uploadSource,
        checksumSha256: checksum,
        imageWidth: validated.imageWidth,
        imageHeight: validated.imageHeight,
        patientId: null, // never guessed — no verified identity mapping
        doctorId: null,
      });

      await insertAuditEntry(client, {
        uploadId: row.id,
        action: 'UPLOAD_RECEIVED',
        details: {
          originalFilename: file.originalname,
          sizeBytes: file.size,
          mimeType: validated.detectedMime,
          uploadSource,
          checksumSha256: checksum,
          accessMode: req.ocrAccessMode || 'unknown',
        },
        ...auditCtx,
      });

      return row;
    });
  } catch (err) {
    await safePrivateDelete(file.path);
    logger.error('Failed to persist prescription upload record', {
      error: err.message,
    });
    throw err;
  }

  // 3. OCR / extraction pipeline. Errors never destroy the record — the
  //    status flips to `ocr_failed` with a sanitised message.
  let preprocessedPath = null;

  const cleanupPreprocessed = async () => {
    if (preprocessedPath) {
      await safePrivateDelete(preprocessedPath);
      preprocessedPath = null;
    }
  };

  try {
    await updateUpload(upload.id, { status: 'preprocessing' });

    let ocrResult;

    if (validated.detectedMime === 'application/pdf') {
      await updateUpload(upload.id, { status: 'ocr_running' });
      await recordAuditSafe({
        uploadId: upload.id,
        action: 'OCR_STARTED',
        details: { engine: 'pdf-parse', mode: 'embedded-text-extraction' },
        ...auditCtx,
      });

      ocrResult = await runPdfExtraction(file.path);
    } else {
      const pre = await preprocessImage(file.path);
      preprocessedPath = pre.preprocessedPath;

      await updateUpload(upload.id, {
        status: 'ocr_running',
        preprocessed_path: preprocessedPath,
      });

      await recordAuditSafe({
        uploadId: upload.id,
        action: 'OCR_STARTED',
        details: { engine: env.ocrEngine, mode: 'image-ocr' },
        ...auditCtx,
      });

      ocrResult = await runImageOcr(preprocessedPath);
    }

    // Derived (preprocessed) file is safe to remove — the original stays
    // preserved for audit / reprocessing.
    const hadPreprocessed = Boolean(preprocessedPath);
    await cleanupPreprocessed();

    await updateUpload(upload.id, {
      status: 'ocr_complete',
      raw_ocr_text: ocrResult.text,
      ocr_confidence: ocrResult.confidence ?? null,
      ocr_duration_ms: Math.round(ocrResult.durationMs ?? 0),
      ocr_language: env.ocrLang,
      ocr_engine: ocrResult.engine ?? null,
      error_message: null,
      preprocessed_path: null,
    });

    await recordAuditSafe({
      uploadId: upload.id,
      action: 'OCR_COMPLETED',
      details: {
        engine: ocrResult.engine,
        confidence: ocrResult.confidence,
        durationMs: ocrResult.durationMs,
        textLength: (ocrResult.text || '').length,
        preprocessedFileRemoved: hadPreprocessed,
      },
      ...auditCtx,
    });

    const finalRow = await getUploadById(upload.id);
    return res.status(201).json({ success: true, data: serializeUpload(finalRow) });
  } catch (err) {
    logger.error('Prescription OCR pipeline failed', {
      uploadId: upload.id,
      error: err.message,
    });

    const safeMessage = sanitizeErrorMessage(err.message);

    await cleanupPreprocessed();

    try {
      await updateUpload(upload.id, {
        status: 'ocr_failed',
        error_message: safeMessage,
        preprocessed_path: null,
      });
    } catch (dbErr) {
      // Never leave the client without an answer; the state is logged for
      // manual reconciliation.
      logger.error('Could not persist OCR failure state', {
        uploadId: upload.id,
        error: dbErr.message,
      });
    }

    await recordAuditSafe({
      uploadId: upload.id,
      action: 'OCR_FAILED',
      details: { error: safeMessage },
      ...auditCtx,
    });

    // The upload itself succeeded — the client receives `ocr_failed` and
    // can inspect the error and reprocess later.
    const finalRow = await getUploadById(upload.id).catch(() => null);
    return res
      .status(201)
      .json({ success: true, data: serializeUpload(finalRow) });
  }
});

// ---------------------------------------------------------------------
// GET /api/prescription-uploads
// ---------------------------------------------------------------------

export const listUploadsHandler = asyncHandler(async (req, res) => {
  const { page, limit, offset } = req.pagination;
  const query = req.query || {};

  const status = query.status || null;
  if (status && !UPLOAD_STATUSES.includes(status)) {
    throw AppError.badRequest(
      `Invalid status filter. Must be one of: ${UPLOAD_STATUSES.join(', ')}.`
    );
  }

  const uploadSource = query.uploadSource || null;
  if (uploadSource && !UPLOAD_SOURCES.includes(uploadSource)) {
    throw AppError.badRequest(
      `Invalid uploadSource filter. Must be one of: ${UPLOAD_SOURCES.join(', ')}.`
    );
  }

  const filenameQuery =
    typeof query.q === 'string' && query.q.trim() ? query.q.trim().slice(0, 200) : null;

  const includeDeleted = query.includeDeleted === 'true';

  const { rows, total } = await listUploads({
    limit,
    offset,
    status,
    uploadSource,
    filenameQuery,
    includeDeleted,
  });

  res.json({
    success: true,
    data: rows.map(serializeUpload),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ---------------------------------------------------------------------
// GET /api/prescription-uploads/:id
// ---------------------------------------------------------------------

export const getUpload = asyncHandler(async (req, res) => {
  const row = await getUploadById(req.params.id);

  if (!row) {
    throw AppError.notFound('Prescription upload not found');
  }

  res.json({ success: true, data: serializeUpload(row) });
});

// ---------------------------------------------------------------------
// GET /api/prescription-uploads/:id/audit
// ---------------------------------------------------------------------

export const getUploadAudit = asyncHandler(async (req, res) => {
  const upload = await getUploadById(req.params.id, { includeDeleted: true });

  if (!upload) {
    throw AppError.notFound('Prescription upload not found');
  }

  const result = await pool.query(
    `SELECT id, upload_id, action, details, actor_label, ip_address, user_agent, created_at
     FROM prescription_upload_audit
     WHERE upload_id = $1
     ORDER BY created_at ASC`,
    [req.params.id]
  );

  res.json({ success: true, data: result.rows.map(serializeAuditEntry) });
});

// ---------------------------------------------------------------------
// DELETE /api/prescription-uploads/:id  (soft delete only)
// ---------------------------------------------------------------------

export const deleteUpload = asyncHandler(async (req, res) => {
  const result = await softDeleteUpload(req.params.id);

  if (!result.found) {
    throw AppError.notFound('Prescription upload not found');
  }

  if (result.alreadyDeleted) {
    throw AppError.conflict('Prescription upload was already deleted');
  }

  // Files are intentionally retained: audit/retention rules govern
  // physical deletion, and authorization for that cannot yet be verified.
  res.json({
    success: true,
    data: { id: result.row.id, deletedAt: result.row.deleted_at },
  });
});

// ---------------------------------------------------------------------
// POST /api/prescription-uploads/:id/review  (human correction workflow)
// ---------------------------------------------------------------------

export const submitReview = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const reviewedText = body.reviewedText;
  const note = body.note;

  if (typeof reviewedText !== 'string' || !reviewedText.trim()) {
    throw AppError.badRequest('"reviewedText" is required.');
  }
  if (reviewedText.length > 100_000) {
    throw AppError.badRequest('"reviewedText" exceeds the 100000 character limit.');
  }
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 1000)) {
    throw AppError.badRequest('"note" must be a string of at most 1000 characters.');
  }

  const upload = await getUploadById(req.params.id);
  if (!upload) {
    throw AppError.notFound('Prescription upload not found');
  }

  await recordAuditSafe({
    uploadId: upload.id,
    action: 'OCR_REVIEWED',
    details: {
      reviewedText,
      note: note || null,
      machineTextLength: (upload.raw_ocr_text || '').length,
      reviewedTextLength: reviewedText.length,
      machineTextUnchanged: reviewedText === (upload.raw_ocr_text || ''),
    },
    ...auditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: { uploadId: upload.id, reviewed: true },
  });
});

// ---------------------------------------------------------------------
// GET /api/prescription-uploads/:id/document
// Streams the original file through the same access gate as the API.
// There is no public /uploads URL for these documents.
// ---------------------------------------------------------------------

export const getUploadDocument = asyncHandler(async (req, res) => {
  const row = await getUploadById(req.params.id);
  if (!row) {
    throw AppError.notFound('Prescription upload not found');
  }

  if (!SUPPORTED_CONTENT_TYPES.includes(row.mime_type)) {
    throw AppError.unsupportedMedia('Stored document has an unsupported media type.');
  }

  const absolutePath = resolvePrivatePath(row.stored_filename);

  if (!(await privateFileExists(absolutePath))) {
    throw AppError.notFound('Stored document file is no longer available');
  }

  const safeName =
    /^[A-Za-z0-9._-]+$/.test(row.original_filename || '')
      ? row.original_filename
      : `document${extensionFor(row.mime_type)}`;

  res.setHeader('Content-Type', row.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (err) => reject(AppError.internal('Failed to stream document')));
    stream.on('end', resolve);
    stream.pipe(res);
  });
});

function extensionFor(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  return map[mime] || '';
}
