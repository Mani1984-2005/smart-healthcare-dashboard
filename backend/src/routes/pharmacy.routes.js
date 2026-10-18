import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { validateUuidParam } from '../middleware/validate.js';
import { listPharmacies, updateDispensation } from '../controllers/pharmacy.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyPermission(PERMISSIONS.PHARMACY_DISPENSE, PERMISSIONS.PRESCRIPTION_READ), listPharmacies);
router.patch('/dispensations/:dispensationId', requirePermission(PERMISSIONS.PHARMACY_DISPENSE), validateUuidParam('dispensationId'), updateDispensation);

export default router;

