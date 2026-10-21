import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { getAnalyticsDashboard } from '../controllers/analytics.controller.js';

const router = Router();

router.use(authenticate);

// Staff-only: the dashboard aggregates every patient's data, so billing:read and
// prescription:read (both held by the patient portal) are no longer accepted here.
router.get('/dashboard', requirePermission(PERMISSIONS.PATIENT_READ), getAnalyticsDashboard);

export default router;

