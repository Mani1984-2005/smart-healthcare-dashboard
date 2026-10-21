import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { requirePrescriptionAccess } from '../middleware/recordAccess.js';
import { PERMISSIONS } from '../config/roles.js';
import { upload } from '../middleware/upload.js';
import { validateUploadRequest, validateUuidParam, validatePagination } from '../middleware/validate.js';
import {
  uploadPrescription,
  listPrescriptions,
  getPrescription,
  deletePrescription,
  getPrescriptionAuditTrail,
} from '../controllers/prescriptions.controller.js';

const router = Router();

router.use(authenticate);

router.post('/upload', requirePermission(PERMISSIONS.PRESCRIPTION_WRITE), upload.single('prescription'), validateUploadRequest, uploadPrescription);
// The list is additionally scoped in the controller for patient-portal
// callers (WHERE user_id = caller) — see listPrescriptions.
router.get('/', requirePermission(PERMISSIONS.PRESCRIPTION_READ), validatePagination, listPrescriptions);
router.get('/:id', requirePermission(PERMISSIONS.PRESCRIPTION_READ), validateUuidParam('id'), requirePrescriptionAccess('id'), getPrescription);
router.get('/:id/audit', requirePermission(PERMISSIONS.PRESCRIPTION_READ), validateUuidParam('id'), requirePrescriptionAccess('id'), getPrescriptionAuditTrail);
router.delete('/:id', requirePermission(PERMISSIONS.PRESCRIPTION_WRITE), validateUuidParam('id'), requirePrescriptionAccess('id'), deletePrescription);

export default router;

