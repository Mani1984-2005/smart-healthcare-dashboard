import path from 'path';
import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { computeChecksum, toPublicPath, safeDelete } from '../services/storage.service.js';
import { preprocessImage, isImageMimeType } from '../services/imagePreprocess.service.js';
import { runImageOcr, runPdfExtraction } from '../services/ocr.service.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/prescriptions/upload
 * Accepts a single file (image/pdf/camera capture), stores it,
 * runs preprocessing + OCR synchronously, and persists the result.
 */
export const uploadPrescription = asyncHandler(async (req, res) => {
  const { file } = req;
  const { uploadSource } = req.body;
  const auditCtx = auditContextFromRequest(req);

  const checksum = await computeChecksum(file.path);

  // 1. Persist the initial "uploaded" record
  const insertResult = await pool.query(
    `INSERT INTO prescriptions
      (user_id, original_filename, stored_filename, file_path, file_size_bytes,
       mime_type, upload_source, checksum_sha256, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded')
     RETURNING *`,
    [
      SYSTEM_USER_ID,
      file.originalname,
      file.filename,
      file.path,
      file.size,
      file.mimetype,
      uploadSource,
      checksum,
    ]
  );
  let prescription = insertResult.rows[0];

  await recordAudit({
    prescriptionId: prescription.id,
    action: 'FILE_UPLOADED',
    details: { filename: file.originalname, sizeBytes: file.size, mimeType: file.mimetype, uploadSource },
    ...auditCtx,
  });

  // 2. Preprocess + OCR pipeline (synchronous for Part 1 — no queue yet)
  try {
    await pool.query(`UPDATE prescriptions SET status = 'preprocessing' WHERE id = $1`, [prescription.id]);

    let ocrResult;
    let preprocessedPath = null;
    let dimensions = {};

    if (isImageMimeType(file.mimetype)) {
      const pre = await preprocessImage(file.path);
      preprocessedPath = pre.preprocessedPath;
      dimensions = { width: pre.width, height: pre.height };

      await pool.query(
        `UPDATE prescriptions SET status = 'ocr_running', preprocessed_path = $2,
          image_width = $3, image_height = $4 WHERE id = $1`,
        [prescription.id, preprocessedPath, dimensions.width, dimensions.height]
      );
      await recordAudit({ prescriptionId: prescription.id, action: 'OCR_STARTED', ...auditCtx });

      ocrResult = await runImageOcr(preprocessedPath);
    } else if (file.mimetype === 'application/pdf') {
      await pool.query(`UPDATE prescriptions SET status = 'ocr_running' WHERE id = $1`, [prescription.id]);
      await recordAudit({ prescriptionId: prescription.id, action: 'OCR_STARTED', ...auditCtx });

      ocrResult = await runPdfExtraction(file.path);
    } else {
      throw AppError.unsupportedMedia(`Cannot run OCR on mime type: ${file.mimetype}`);
    }

    const updateResult = await pool.query(
      `UPDATE prescriptions SET
         status = 'ocr_complete',
         raw_ocr_text = $2,
         ocr_confidence = $3,
         ocr_duration_ms = $4,
         ocr_language = $5
       WHERE id = $1
       RETURNING *`,
      [prescription.id, ocrResult.text, ocrResult.confidence, ocrResult.durationMs, process.env.OCR_LANG || 'eng']
    );
    prescription = updateResult.rows[0];

    await recordAudit({
      prescriptionId: prescription.id,
      action: 'OCR_COMPLETED',
      details: { confidence: ocrResult.confidence, durationMs: ocrResult.durationMs, textLength: ocrResult.text.length },
      ...auditCtx,
    });
  } catch (err) {
    logger.error('OCR pipeline failed', { prescriptionId: prescription.id, error: err.message });

    const failResult = await pool.query(
      `UPDATE prescriptions SET status = 'ocr_failed', error_message = $2 WHERE id = $1 RETURNING *`,
      [prescription.id, err.message]
    );
    prescription = failResult.rows[0];

    await recordAudit({
      prescriptionId: prescription.id,
      action: 'OCR_FAILED',
      details: { error: err.message },
      ...auditCtx,
    });
    // Note: we do NOT throw here — the upload itself succeeded. The client
    // sees status: 'ocr_failed' and can offer a retry.
  }

  res.status(201).json({
    success: true,
    data: serializePrescription(prescription),
  });
});

/**
 * GET /api/prescriptions
 * Paginated list, most recent first.
 */
export const listPrescriptions = asyncHandler(async (req, res) => {
  const { page, limit, offset } = req.pagination;

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM prescriptions`),
  ]);

  await recordAudit({ action: 'PRESCRIPTION_LIST_VIEWED', ...auditContextFromRequest(req) });

  res.json({
    success: true,
    data: rows.rows.map(serializePrescription),
    pagination: {
      page,
      limit,
      total: count.rows[0].total,
      totalPages: Math.ceil(count.rows[0].total / limit),
    },
  });
});

/**
 * GET /api/prescriptions/:id
 */
export const getPrescription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(`SELECT * FROM prescriptions WHERE id = $1`, [id]);

  if (result.rows.length === 0) {
    throw AppError.notFound('Prescription not found');
  }

  await recordAudit({
    prescriptionId: id,
    action: 'PRESCRIPTION_VIEWED',
    ...auditContextFromRequest(req),
  });

  res.json({ success: true, data: serializePrescription(result.rows[0]) });
});

/**
 * DELETE /api/prescriptions/:id
 * Removes the DB record and the underlying files.
 */
export const deletePrescription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(`SELECT * FROM prescriptions WHERE id = $1`, [id]);

  if (result.rows.length === 0) {
    throw AppError.notFound('Prescription not found');
  }
  const record = result.rows[0];

  await pool.query(`DELETE FROM prescriptions WHERE id = $1`, [id]);
  await safeDelete(record.file_path);
  if (record.preprocessed_path) await safeDelete(record.preprocessed_path);

  await recordAudit({
    prescriptionId: id,
    action: 'FILE_DELETED',
    details: { filename: record.original_filename },
    ...auditContextFromRequest(req),
  });

  res.json({ success: true, data: { id } });
});

/**
 * GET /api/prescriptions/:id/audit
 * Returns the audit trail for a single prescription (traceability).
 */
export const getPrescriptionAuditTrail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT id, action, details, ip_address, user_agent, created_at
     FROM audit_logs WHERE prescription_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  res.json({ success: true, data: result.rows });
});

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function serializePrescription(row) {
  return {
    id: row.id,
    originalFilename: row.original_filename,
    fileUrl: toPublicPath(row.file_path),
    preprocessedUrl: row.preprocessed_path ? toPublicPath(row.preprocessed_path) : null,
    fileSizeBytes: Number(row.file_size_bytes),
    mimeType: row.mime_type,
    uploadSource: row.upload_source,
    status: row.status,
    rawOcrText: row.raw_ocr_text,
    ocrConfidence: row.ocr_confidence !== null ? Number(row.ocr_confidence) : null,
    ocrEngine: row.ocr_engine,
    ocrLanguage: row.ocr_language,
    ocrDurationMs: row.ocr_duration_ms,
    errorMessage: row.error_message,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
