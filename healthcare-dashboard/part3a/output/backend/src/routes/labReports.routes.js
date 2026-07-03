import { Router } from 'express';
import { validateUuidParam, validateLabReportCreate } from '../middleware/validate.js';
import { createLabReport, getLabReport } from '../controllers/labReports.controller.js';

const router = Router();

router.post('/', validateLabReportCreate, createLabReport);
router.get('/:id', validateUuidParam('id'), getLabReport);

export default router;
