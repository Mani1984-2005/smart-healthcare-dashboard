import { Router } from 'express';
import { validateUuidParam } from '../middleware/validate.js';
import { listPharmacies, updateDispensation } from '../controllers/pharmacy.controller.js';

const router = Router();

router.get('/', listPharmacies);
router.patch('/dispensations/:dispensationId', validateUuidParam('dispensationId'), updateDispensation);

export default router;
