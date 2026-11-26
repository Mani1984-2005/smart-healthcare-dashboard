// backend/src/services/privateStorage.service.js
//
// Dedicated PRIVATE storage for prescription OCR documents.
//
// The existing `UPLOAD_ROOT_DIR` is served publicly via
// `app.use('/uploads', express.static(UPLOAD_ROOT_DIR))`, so OCR medical
// documents must never be written there. This module owns a separate root
// directory OUTSIDE the public upload root and enforces path containment
// so no traversal can escape it.

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import { UPLOAD_ROOT_DIR } from '../middleware/upload.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

function isPathInside(childPath, parentPath) {
  const rel = path.relative(parentPath, childPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

const PRIVATE_ROOT_DIR = path.resolve(
  process.cwd(),
  process.env.PRIVATE_STORAGE_DIR || 'private-prescription-uploads'
);

// Fail fast if the private root would land inside the publicly served
// directory — this would silently expose medical documents.
if (isPathInside(PRIVATE_ROOT_DIR, UPLOAD_ROOT_DIR)) {
  throw new Error(
    'PRIVATE_STORAGE_DIR must be outside the public uploads directory'
  );
}

fs.mkdirSync(PRIVATE_ROOT_DIR, { recursive: true });

export function getPrivateStorageRoot() {
  return PRIVATE_ROOT_DIR;
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

/**
 * Builds a server-generated filename from randomness only.
 * The client-supplied extension is used only after allowlist validation,
 * so a name like `evil.exe` or `../../x.png` can never influence storage.
 */
export function generateStoredFilename(originalName) {
  const ext = safeExtensionFor(originalName);
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

function safeExtensionFor(originalName) {
  let ext = '';
  try {
    ext = path.extname(String(originalName || '')).toLowerCase();
  } catch {
    ext = '';
  }
  return ALLOWED_EXTENSIONS.has(ext) ? ext : '';
}

/**
 * Resolves a stored filename to an absolute path inside the private root.
 * Throws if the value is not a plain filename contained in the private root.
 */
export function resolvePrivatePath(storedFilename) {
  const raw = String(storedFilename ?? '');

  // Stored names are server-generated: strict allowlist, no separators,
  // no dot-only segments.
  const looksSafe =
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(raw) && !raw.includes('..');

  const base = path.basename(raw);
  const absolute = path.resolve(PRIVATE_ROOT_DIR, base);

  if (
    !looksSafe ||
    !base ||
    base !== raw ||
    !isPathInside(absolute, PRIVATE_ROOT_DIR)
  ) {
    throw AppError.badRequest('Invalid file reference');
  }

  return absolute;
}

export async function safePrivateDelete(absolutePath) {
  try {
    await fsPromises.unlink(absolutePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn('Failed to delete private file', {
        error: err.message,
      });
    }
    return false;
  }
}

export async function privateFileExists(absolutePath) {
  try {
    const stat = await fsPromises.stat(absolutePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// Content sniffing — validates ACTUAL file bytes, never the
// browser-supplied MIME type.
// ---------------------------------------------------------------------

const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURE_JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const SIGNATURE_RIFF = Buffer.from('RIFF', 'latin1');
const SIGNATURE_WEBP = Buffer.from('WEBP', 'latin1');
const SIGNATURE_PDF = Buffer.from('%PDF-', 'latin1');

export const SUPPORTED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/**
 * Returns the detected content type ('image/jpeg' | 'image/png' |
 * 'image/webp' | 'application/pdf') or null when the bytes do not match
 * any supported format.
 */
export async function sniffFileContent(filePath) {
  const handle = await fsPromises.open(filePath, 'r');
  try {
    const { size } = await handle.stat();
    if (size <= 0) return null;

    const header = Buffer.alloc(Math.min(size, 4096));
    await handle.read(header, 0, header.length, 0);

    if (header.subarray(0, 8).equals(SIGNATURE_PNG)) {
      return 'image/png';
    }
    if (
      header.length >= 3 &&
      header.subarray(0, 3).equals(SIGNATURE_JPEG)
    ) {
      return 'image/jpeg';
    }
    if (
      header.length >= 12 &&
      header.subarray(0, 4).equals(SIGNATURE_RIFF) &&
      header.subarray(8, 12).equals(SIGNATURE_WEBP)
    ) {
      return 'image/webp';
    }

    // PDF spec: the %PDF- header must appear within the first 1024 bytes.
    const pdfHeader = header.subarray(0, 1024).indexOf(SIGNATURE_PDF);
    if (pdfHeader !== -1) {
      return 'application/pdf';
    }

    return null;
  } finally {
    await handle.close();
  }
}

/**
 * Cheap structural sanity check for PDFs: header (checked by sniffing)
 * plus a `%%EOF` trailer near the end of the file. Deep validation happens
 * later during pdf-parse extraction.
 */
export async function hasPdfTrailer(filePath, maxTailBytes = 2048) {
  try {
    const stat = await fsPromises.stat(filePath);
    if (stat.size < 100) return false;
    const length = Math.min(stat.size, maxTailBytes);
    const handle = await fsPromises.open(filePath, 'r');
    try {
      const tail = Buffer.alloc(length);
      await handle.read(tail, 0, length, stat.size - length);
      return tail.indexOf(Buffer.from('%%EOF', 'latin1')) !== -1;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}
