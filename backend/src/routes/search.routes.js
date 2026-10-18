import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAnyPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { advancedSearch } from '../controllers/search.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyPermission(PERMISSIONS.PATIENT_READ, PERMISSIONS.PRESCRIPTION_READ), advancedSearch);

export default router;

