import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAnyPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { getAnalyticsDashboard } from '../controllers/analytics.controller.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', requireAnyPermission(PERMISSIONS.PATIENT_READ, PERMISSIONS.BILLING_READ, PERMISSIONS.PRESCRIPTION_READ), getAnalyticsDashboard);

export default router;

