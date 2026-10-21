import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { advancedSearch } from '../controllers/search.controller.js';

const router = Router();

router.use(authenticate);

// Staff-only: clinic-wide search exposes every patient's data. prescription:read
// is deliberately NOT accepted here because the patient portal holds it; there is
// no user<->patient link yet to scope search results (see recordAccess.service.js).
router.get('/', requirePermission(PERMISSIONS.PATIENT_READ), advancedSearch);

export default router;

