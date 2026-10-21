import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { requirePrescriptionAccess } from '../middleware/recordAccess.js';
import { PERMISSIONS } from '../config/roles.js';
import { validateUuidParam } from '../middleware/validate.js';
import { sendPrescriptionFile } from '../controllers/files.controller.js';

// -----------------------------------------------------------------------------
// Authorized prescription-file downloads (Phase 5).
//
// These routes REPLACE the old public static /uploads mount. Every request is
// checked three times before any bytes stream:
//   1. authenticate — a valid identity is required (401 otherwise);
//   2. requirePermission(prescription:read) — fine-grained permission gate;
//   3. requirePrescriptionAccess — ownership scoping for patient-portal
//      callers (404 for records they do not own, so the API cannot be used
//      as an existence oracle).
// Response headers (nosniff / sandbox CSP / no-store) are defense in depth,
// NOT the access control.
// -----------------------------------------------------------------------------
const router = Router();

router.use(authenticate);

router.get(
  '/prescriptions/:id',
  requirePermission(PERMISSIONS.PRESCRIPTION_READ),
  validateUuidParam('id'),
  requirePrescriptionAccess('id'),
  sendPrescriptionFile('original'),
);

router.get(
  '/prescriptions/:id/preprocessed',
  requirePermission(PERMISSIONS.PRESCRIPTION_READ),
  validateUuidParam('id'),
  requirePrescriptionAccess('id'),
  sendPrescriptionFile('preprocessed'),
);

export default router;
