import fs from 'fs';
import fs_promises from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { UPLOAD_ROOT_DIR } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';

/**
 * Computes a SHA-256 checksum of a file for integrity verification
 * and future duplicate-detection.
 */
export async function computeChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function toPublicPath(absolutePath) {
  return `/uploads/${path.relative(UPLOAD_ROOT_DIR, absolutePath)}`;
}

export async function safeDelete(absolutePath) {
  try {
    await fs_promises.unlink(absolutePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn('Failed to delete file', { path: absolutePath, error: err.message });
    }
    return false;
  }
}
