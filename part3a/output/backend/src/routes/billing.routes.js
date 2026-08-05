import { Router } from 'express';
import { validateUuidParam, validateInvoiceStatusUpdate } from '../middleware/validate.js';
import { getInvoice, updateInvoiceStatus } from '../controllers/billing.controller.js';

const router = Router();

router.get('/:invoiceId', validateUuidParam('invoiceId'), getInvoice);
router.patch('/:invoiceId/status', validateUuidParam('invoiceId'), validateInvoiceStatusUpdate, updateInvoiceStatus);

export default router;
