// backend/src/services/prescriptionUploads.service.js
//
// Data access + audit helpers for the isolated prescription OCR tables
// (`public.prescription_uploads`, `public.prescription_upload_audit`).
//
// Hard rules enforced here:
//  - Transactions are used for multi-statement writes; clients are always
//    released back to the pool.
//  - No connection to the legacy INTEGER-id `prescriptions` table or the
//    Prisma TEXT-id "Prescription" table.
//  - patient_id / doctor_id stay NULL unless a verified INTEGER id is
//    explicitly supplied by an authorized caller.
//  - Serialized output never contains filesystem paths.

import pool from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const UPLOAD_SOURCES = ['image', 'pdf', 'camera'];
export const UPLOAD_STATUSES = [
  'uploaded',
  'preprocessing',
  'ocr_running',
  'ocr_complete',
  'ocr_failed',
];

const UPDATABLE_COLUMNS = {
  status: 'status',
  raw_ocr_text: 'raw_ocr_text',
  ocr_confidence: 'ocr_confidence',
  ocr_duration_ms: 'ocr_duration_ms',
  ocr_language: 'ocr_language',
  ocr_engine: 'ocr_engine',
  error_message: 'error_message',
  preprocessed_path: 'preprocessed_path',
  image_width: 'image_width',
  image_height: 'image_height',
};

/**
 * Runs `fn(client)` inside a transaction. Always rolls back on failure and
 * ALWAYS releases the client.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('Transaction rollback failed', { error: rollbackErr.message });
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function insertUpload(client, fields) {
  const result = await client.query(
    `INSERT INTO prescription_uploads
       (original_filename, stored_filename, file_path, file_size_bytes,
        mime_type, upload_source, checksum_sha256,
        image_width, image_height, patient_id, doctor_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'uploaded')
     RETURNING *`,
    [
      fields.originalFilename,
      fields.storedFilename,
      fields.filePath,
      fields.fileSizeBytes,
      fields.mimeType,
      fields.uploadSource,
      fields.checksumSha256,
      fields.imageWidth ?? null,
      fields.imageHeight ?? null,
      fields.patientId ?? null,
      fields.doctorId ?? null,
    ]
  );
  return result.rows[0];
}

/**
 * Patch-update with a strict column whitelist. Uses the shared pool when no
 * transaction client is supplied.
 */
export async function updateUpload(id, fields, client = null) {
  const entries = Object.entries(fields).filter(
    ([key]) => key in UPDATABLE_COLUMNS
  );

  if (entries.length === 0) {
    throw new Error('updateUpload called with no updatable fields');
  }

  const sets = entries.map(([key], i) => `${UPDATABLE_COLUMNS[key]} = $${i + 2}`);
  const values = [id, ...entries.map(([, value]) => value)];

  const runner = client || pool;
  const result = await runner.query(
    `UPDATE prescription_uploads SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function getUploadById(id, { includeDeleted = false, client = null } = {}) {
  const runner = client || pool;
  const result = await runner.query(
    `SELECT * FROM prescription_uploads
     WHERE id = $1${includeDeleted ? '' : ' AND deleted_at IS NULL'}`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Paginated list with parameterised, allow-listed filters only.
 */
export async function listUploads({
  limit,
  offset,
  status = null,
  uploadSource = null,
  filenameQuery = null,
  includeDeleted = false,
}) {
  const where = [];
  const values = [];
  const push = (clause, value) => {
    values.push(value);
    where.push(clause.replace('?', `$${values.length}`));
  };

  if (!includeDeleted) where.push('deleted_at IS NULL');
  if (status) push('status = ?', status);
  if (uploadSource) push('upload_source = ?', uploadSource);
  if (filenameQuery) {
    const escaped = filenameQuery.replace(/[\\%_]/g, (m) => `\\${m}`);
    push('original_filename ILIKE ?', `%${escaped}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM prescription_uploads ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM prescription_uploads ${whereSql}`,
      values
    ),
  ]);

  return { rows: rows.rows, total: count.rows[0].total };
}

export async function softDeleteUpload(id) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id, original_filename, deleted_at FROM prescription_uploads
       WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (existing.rows.length === 0) {
      return { found: false };
    }

    if (existing.rows[0].deleted_at) {
      return { found: true, alreadyDeleted: true };
    }

    const updated = await client.query(
      `UPDATE prescription_uploads
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await insertAuditEntry(client, {
      uploadId: id,
      action: 'UPLOAD_SOFT_DELETED',
      details: { originalFilename: existing.rows[0].original_filename },
    });

    return { found: true, row: updated.rows[0] };
  });
}

// ---------------------------------------------------------------------
// Audit trail — dedicated table, no dependency on the missing
// `audit_logs` table used by legacy modules.
// ---------------------------------------------------------------------

export async function insertAuditEntry(
  client,
  { uploadId, action, details = {}, actorLabel = null, ipAddress = null, userAgent = null }
) {
  await client.query(
    `INSERT INTO prescription_upload_audit
       (upload_id, action, details, actor_label, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      uploadId,
      action,
      JSON.stringify(details ?? {}),
      actorLabel,
      ipAddress || null,
      userAgent ? String(userAgent).slice(0, 500) : null,
    ]
  );
}

/**
 * Best-effort audit write outside a transaction — logging must never
 * break the primary flow. Errors are logged, never thrown.
 */
export async function recordAuditSafe(entry) {
  try {
    await insertAuditEntry(pool, entry);
  } catch (err) {
    logger.error('Failed to record prescription upload audit entry', {
      action: entry.action,
      error: err.message,
    });
  }
}

export function auditContextFromRequest(req) {
  return {
    actorLabel: req.ocrActorLabel || null,
    ipAddress: req.ip || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

// ---------------------------------------------------------------------
// Serialization + error hygiene
// ---------------------------------------------------------------------

/**
 * Strips secrets (OCR API token, DB password) and stack-trace noise from
 * an error message before it is stored in a user-visible field.
 */
export function sanitizeErrorMessage(message) {
  let msg = String(message ?? 'Unknown error');

  for (const secret of [env.paddleOcrToken, env.db?.password]) {
    if (secret && secret.length >= 6) {
      msg = msg.split(secret).join('[redacted]');
    }
  }

  // Collapse newlines (stack traces are never stored here).
  msg = msg.replace(/\s+/g, ' ').trim();

  if (msg.length > 480) {
    msg = `${msg.slice(0, 480)}...`;
  }

  return msg || 'Unknown error';
}

/**
 * Public JSON shape. Deliberately excludes file_path, stored_filename and
 * preprocessed_path — filesystem locations must never reach the client,
 * and no public /uploads URL is ever produced for these documents.
 */
export function serializeUpload(row) {
  if (!row) return null;

  return {
    id: row.id,
    patientId: row.patient_id ?? null,
    doctorId: row.doctor_id ?? null,
    originalFilename: row.original_filename,
    fileSizeBytes: Number(row.file_size_bytes),
    mimeType: row.mime_type,
    uploadSource: row.upload_source,
    checksumSha256: row.checksum_sha256 || null,
    imageWidth: row.image_width ?? null,
    imageHeight: row.image_height ?? null,
    status: row.status,
    rawOcrText: row.raw_ocr_text,
    ocrConfidence:
      row.ocr_confidence !== null && row.ocr_confidence !== undefined
        ? Number(row.ocr_confidence)
        : null,
    ocrDurationMs: row.ocr_duration_ms ?? null,
    ocrLanguage: row.ocr_language ?? null,
    ocrEngine: row.ocr_engine ?? null,
    errorMessage: row.error_message ?? null,
    deletedAt: row.deleted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Access to the original document goes through an authenticated API
    // route (never a static/public URL).
    documentUrl: `/api/prescription-uploads/${row.id}/document`,
  };
}

export function serializeAuditEntry(row) {
  return {
    id: row.id,
    uploadId: row.upload_id,
    action: row.action,
    details: row.details ?? {},
    actorLabel: row.actor_label ?? null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ?? null,
    createdAt: row.created_at,
  };
}
