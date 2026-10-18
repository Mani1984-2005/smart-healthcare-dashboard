import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { validateUuidParam, validateLabReportCreate } from '../middleware/validate.js';
import { createLabReport, getLabReport } from '../controllers/labReports.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', requirePermission(PERMISSIONS.LAB_WRITE), validateLabReportCreate, createLabReport);
router.get('/:id', requireAnyPermission(PERMISSIONS.PATIENT_READ, PERMISSIONS.LAB_WRITE, PERMISSIONS.PRESCRIPTION_READ), validateUuidParam('id'), getLabReport);

export default router;

