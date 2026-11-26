// backend/src/routes/prescriptionUploads.routes.js
//
// Isolated namespace: /api/prescription-uploads
// Mounted separately from the legacy /api/prescriptions routes.

import { Router } from 'express';
import multer from 'multer';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { ocrAccess } from '../middleware/ocrAccess.js';
import {
  validateUuidParam,
  validatePagination,
} from '../middleware/validate.js';
import {
  getPrivateStorageRoot,
  generateStoredFilename,
} from '../services/privateStorage.service.js';
import {
  createUpload,
  listUploadsHandler,
  getUpload,
  getUploadAudit,
  deleteUpload,
  submitReview,
  getUploadDocument,
} from '../controllers/prescriptionUploads.controller.js';

const ALLOWED_DECLARED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

// Files are written directly into the PRIVATE storage root (outside the
// publicly served uploads directory) with server-generated names.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getPrivateStorageRoot());
  },
  filename: (req, file, cb) => {
    const name = generateStoredFilename(file.originalname);
    file.generatedFilename = name;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  const declared = String(file.mimetype || '').toLowerCase();
  if (!ALLOWED_DECLARED_TYPES.has(declared)) {
    return cb(
      AppError.unsupportedMedia(
        `File type "${file.mimetype}" is not supported. Allowed: JPG, PNG, WEBP, PDF.`
      )
    );
  }
  cb(null, true);
}

const uploadOcr = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
    files: 1,
    fields: 10,
  },
});

const router = Router();

// Every route behind the access gate (fail-closed in production,
// OIDC-enforced when AUTH_ENABLED=true, development-only otherwise).
router.use(ocrAccess);

router.post('/', uploadOcr.single('prescription'), createUpload);
router.get('/', validatePagination, listUploadsHandler);
router.get('/:id/document', validateUuidParam('id'), getUploadDocument);
router.get('/:id/audit', validateUuidParam('id'), getUploadAudit);
router.get('/:id', validateUuidParam('id'), getUpload);
router.post('/:id/review', validateUuidParam('id'), submitReview);
router.delete('/:id', validateUuidParam('id'), deleteUpload);

export default router;
