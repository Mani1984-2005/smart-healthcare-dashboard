// =============================================================================
// Medicare Pro — Authorized prescription-file downloads (Phase 5)
//
// Controller for routes/files.routes.js. It NEVER decides who may read a
// record: that is done upstream, in this exact order, by the route chain
//
//   authenticate -> requirePermission(prescription:read)
//                -> validateUuidParam('id')
//                -> requirePrescriptionAccess('id')   [404 for non-owners]
//                -> sendPrescriptionFile(kind)
//
// This module only turns an ALREADY-AUTHORIZED request into bytes, applying
// three additional rules:
//
//   1. The location comes from the database row (prescriptions.file_path /
//      prescriptions.preprocessed_path) fetched through the record-access
//      service — NEVER from a query string, header, body field, request path
//      or filename supplied by the client.
//   2. The stored location must be absolute and must resolve INSIDE the
//      configured upload root twice: logically (no ".."/drive escape) and
//      physically (fs.realpath, so a symlink cannot point outside the root).
//      Serving uses res.sendFile({ root }), which re-enforces containment.
//   3. Content-Type is derived from the STORED EXTENSION and then checked
//      against the upload allowlist; the free-text mime_type column is
//      deliberately never read, so a poisoned row cannot make us serve
//      text/html or image/svg+xml.
//
// Every refusal is the same generic 404 ("File not found") so the API cannot
// be used to probe which ids or paths exist, and no absolute filesystem path
// or database detail is ever echoed into a response.
// =============================================================================
import fs from 'fs/promises';
import path from 'path';
import mimeTypes from 'mime-types';

import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { UPLOAD_ROOT_DIR } from '../middleware/upload.js';
import { getPrescriptionFilePaths } from '../services/recordAccess.service.js';

// The ONLY content types this endpoint will ever emit — mirrors the upload
// allowlist in middleware/upload.js. Anything else (including an unknown or
// attacker-chosen extension) degrades to application/octet-stream.
const SERVABLE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

// Test-only seam, same pattern as __setRepositoryForTests in rbac.service and
// recordAccess.service: lets tests point downloads at a throwaway directory
// OUTSIDE the repository instead of the real upload directory. It has no HTTP
// surface and cannot be reached by a request.
let activeRoot = UPLOAD_ROOT_DIR;

export function __setUploadRootForTests(root) {
  activeRoot = root || UPLOAD_ROOT_DIR;
}

/**
 * Containment check. Returns the path of `target` relative to `root` with
 * forward slashes (what res.sendFile expects), or null when `target` is the
 * root itself, lives outside it, or is on another drive (path.relative() then
 * returns an absolute path).
 */
function relativeToRoot(root, target) {
  const rel = path.relative(root, target);
  if (!rel) return null;
  if (path.isAbsolute(rel)) return null;
  if (rel.split(path.sep)[0] === '..') return null;
  return rel.split(path.sep).join('/');
}

/** One canonical refusal: identical body for "no record", "no path", "no file". */
function fileNotFound() {
  return AppError.notFound('File not found');
}

/**
 * Maps a filesystem/send error onto the existing error conventions:
 * anything that says "not there" or "not allowed" collapses into the generic
 * 404 above (no oracle); everything else is forwarded to the central error
 * handler, which never echoes runtime messages or paths to clients.
 */
function toPublicError(err) {
  if (!err) return fileNotFound();
  const code = err.code;
  if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'EACCES' || code === 'EPERM' || code === 'EISDIR') {
    return fileNotFound();
  }
  const status = err.status || err.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) return fileNotFound();
  return err;
}

/** Content-Type from the stored extension only, then allowlist-checked. */
function contentTypeFor(relativePath) {
  const type = mimeTypes.lookup(relativePath);
  if (type && SERVABLE_CONTENT_TYPES.has(type)) return type;
  return 'application/octet-stream';
}

/**
 * Factory matching the route contract:
 *   sendPrescriptionFile('original')     GET /api/files/prescriptions/:id
 *   sendPrescriptionFile('preprocessed') GET /api/files/prescriptions/:id/preprocessed
 */
export function sendPrescriptionFile(kind) {
  const usePreprocessed = kind === 'preprocessed';

  return asyncHandler(async (req, res, next) => {
    const prescriptionId = req.params.id;
    const root = activeRoot;

    // Ownership was already enforced by requirePrescriptionAccess; this lookup
    // only re-reads the (already authorized) row's file locations.
    const row = await getPrescriptionFilePaths(prescriptionId);
    if (!row) throw fileNotFound();

    const stored = usePreprocessed ? row.preprocessed_path : row.file_path;
    // Missing/nullable path for this variant -> same generic 404. There is no
    // fallback to the other path and no guessing from the filename.
    if (typeof stored !== 'string' || stored.trim() === '') throw fileNotFound();
    // The schema stores absolute paths (multer file.path). Anything else is
    // unexpected and therefore refused rather than resolved against cwd.
    if (!path.isAbsolute(stored)) {
      logger.warn('Refused prescription file download: stored path is not absolute', {
        prescriptionId, kind,
      });
      throw fileNotFound();
    }

    // --- logical containment (before touching the filesystem) -------------
    const candidate = path.resolve(stored);
    if (!relativeToRoot(root, candidate)) {
      logger.warn('Refused prescription file download: path escapes the upload root', {
        prescriptionId, kind,
      });
      throw fileNotFound();
    }

    // --- physical containment (symlink escapes) ---------------------------
    let realRoot;
    let realFile;
    try {
      realRoot = await fs.realpath(root);
      realFile = await fs.realpath(candidate);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'EPERM' || err.code === 'ENOTDIR') {
        throw fileNotFound();
      }
      throw err;
    }

    const realRel = relativeToRoot(realRoot, realFile);
    if (!realRel) {
      logger.warn('Refused prescription file download: realpath escapes the upload root', {
        prescriptionId, kind,
      });
      throw fileNotFound();
    }

    let stat;
    try {
      stat = await fs.stat(realFile);
    } catch (err) {
      throw toPublicError(err);
    }
    if (!stat.isFile()) throw fileNotFound();

    // --- headers: explicit, non-user-controlled, allowlisted --------------
    res.set({
      'Content-Type': contentTypeFor(realRel),
      'Content-Disposition': 'inline', // never reflects original_filename
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'",
      'Cache-Control': 'no-store',
    });

    // --- serve with containment re-enforced by send({ root }) -------------
    res.sendFile(realRel, {
      root: realRoot,
      dotfiles: 'deny',
      cacheControl: false,
      lastModified: false,
    }, (err) => {
      if (!err) return;
      if (res.headersSent) {
        // Mid-stream failure: the client already received a partial body, so
        // the only honest signal left is to tear the response down.
        logger.warn('Prescription file stream interrupted', { prescriptionId, kind });
        res.destroy();
        return;
      }
      next(toPublicError(err));
    });
  });
}
