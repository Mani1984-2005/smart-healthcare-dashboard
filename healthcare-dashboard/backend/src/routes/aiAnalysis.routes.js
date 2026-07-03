import { Router } from 'express';
import { validateUuidParam, validateAnalyzeRequest } from '../middleware/validate.js';
import { analyzePrescription, getPrescriptionAnalysis } from '../controllers/aiAnalysis.controller.js';

const router = Router();

// Mounted at the same base path as prescriptions.routes.js ('/api/prescriptions')
router.post('/:id/analyze', validateUuidParam('id'), validateAnalyzeRequest, analyzePrescription);
router.get('/:id/analysis', validateUuidParam('id'), getPrescriptionAnalysis);

export default router;
