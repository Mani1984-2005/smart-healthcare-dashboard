import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { AppError } from '../utils/AppError.js';
import { PERMISSIONS } from '../config/roles.js';
import { validateUuidParam, validateInvoiceStatusUpdate } from '../middleware/validate.js';
import { requireInvoiceAccess } from '../middleware/recordAccess.js';
import { getInvoice, updateInvoiceStatus } from '../controllers/billing.controller.js';

const router = Router();

// Statuses that directly change revenue/collection state. Moving an invoice
// into one of these requires the billing:approve permission (dual control),
// so a billing:write clerk cannot unilaterally mark invoices paid, void them
// or issue refunds. Draft/pending transitions stay with billing:write.
const FINANCIAL_STATUSES = new Set(['paid', 'partially_paid', 'void', 'refunded']);

function requireApproveForFinancialStatus(req, res, next) {
  // SECURITY (Phase 2B): the former fail-open clause
  //   `if (!authEnv.authEnabled && !req.permissions) return next();`
  // is gone — this dual-control gate always evaluates. A caller without an
  // identity holds no billing:approve permission and is denied.
  const status = req.body && req.body.status;
  if (!status || !FINANCIAL_STATUSES.has(status)) return next();
  const granted = new Set(req.permissions || []);
  if (!granted.has(PERMISSIONS.BILLING_APPROVE)) {
    return next(new AppError(
      `Changing an invoice to "${status}" requires the ${PERMISSIONS.BILLING_APPROVE} permission.`,
      403,
      'FORBIDDEN',
    ));
  }
  next();
}

router.use(authenticate);

// requireInvoiceAccess: staff pass through; patient-portal callers can only
// reach invoices linked to a prescription THEY uploaded (see
// services/recordAccess.service.js). Denials are 404 to avoid an existence oracle.
router.get('/:invoiceId', requirePermission(PERMISSIONS.BILLING_READ), validateUuidParam('invoiceId'), requireInvoiceAccess('invoiceId'), getInvoice);
router.patch(
  '/:invoiceId/status',
  requirePermission(PERMISSIONS.BILLING_WRITE),
  validateUuidParam('invoiceId'),
  validateInvoiceStatusUpdate,
  requireApproveForFinancialStatus,
  updateInvoiceStatus,
);

export default router;
