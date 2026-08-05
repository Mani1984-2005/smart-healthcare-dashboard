import { Router } from 'express';
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

router.post('/upload', upload.single('prescription'), validateUploadRequest, uploadPrescription);
router.get('/', validatePagination, listPrescriptions);
router.get('/:id', validateUuidParam('id'), getPrescription);
router.get('/:id/audit', validateUuidParam('id'), getPrescriptionAuditTrail);
router.delete('/:id', validateUuidParam('id'), deletePrescription);

export default router;
