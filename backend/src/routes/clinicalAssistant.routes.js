import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateUuidParam } from '../middleware/validate.js';
import { validateClinicalAssistantQuery } from '../middleware/validateWorkflow.js';
import { PERMISSIONS } from '../config/roles.js';
import { askAssistant, getSessionHistory, getPrescriptionSessionHistory } from '../controllers/clinicalAssistant.controller.js';

const router = Router();

router.post('/query', authenticate, requirePermission(PERMISSIONS.CLINICAL_ASSISTANT_USE), validateClinicalAssistantQuery, askAssistant);
router.get('/sessions/:sessionId', authenticate, requirePermission(PERMISSIONS.CLINICAL_ASSISTANT_USE), validateUuidParam('sessionId'), getSessionHistory);
router.get('/prescriptions/:id', authenticate, requirePermission(PERMISSIONS.CLINICAL_ASSISTANT_USE), validateUuidParam('id'), getPrescriptionSessionHistory);

export default router;
