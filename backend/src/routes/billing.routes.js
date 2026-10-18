import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { validateUuidParam, validateInvoiceStatusUpdate } from '../middleware/validate.js';
import { getInvoice, updateInvoiceStatus } from '../controllers/billing.controller.js';

const router = Router();

router.use(authenticate);

router.get('/:invoiceId', requirePermission(PERMISSIONS.BILLING_READ), validateUuidParam('invoiceId'), getInvoice);
router.patch('/:invoiceId/status', requirePermission(PERMISSIONS.BILLING_WRITE), validateUuidParam('invoiceId'), validateInvoiceStatusUpdate, updateInvoiceStatus);

export default router;

