import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), env.uploadDir);

// Ensure the upload directory exists at boot.
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || guessExt(file.mimetype);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    file.generatedFilename = uniqueName; // stash for controller use
    cb(null, uniqueName);
  },
});

function guessExt(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'application/pdf': '.pdf',
  };
  return map[mime] || '';
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(AppError.unsupportedMedia(
      `File type "${file.mimetype}" is not supported. Allowed: JPG, PNG, WEBP, HEIC, PDF.`
    ));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
});

export const UPLOAD_ROOT_DIR = UPLOAD_ROOT;
