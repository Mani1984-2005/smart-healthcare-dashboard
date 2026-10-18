import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { validateUuidParam, validateAnalyzeRequest } from '../middleware/validate.js';
import { analyzePrescription, getPrescriptionAnalysis } from '../controllers/aiAnalysis.controller.js';

const router = Router();

// Mounted at the same base path as prescriptions.routes.js ('/api/prescriptions')
router.use(authenticate);

router.post('/:id/analyze', requirePermission(PERMISSIONS.PRESCRIPTION_WRITE), validateUuidParam('id'), validateAnalyzeRequest, analyzePrescription);
router.get('/:id/analysis', requirePermission(PERMISSIONS.PRESCRIPTION_READ), validateUuidParam('id'), getPrescriptionAnalysis);

export default router;

