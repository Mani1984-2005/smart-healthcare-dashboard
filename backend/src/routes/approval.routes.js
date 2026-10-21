import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorize.js';
import { validateUuidParam, validatePagination } from '../middleware/validate.js';
import { validateApprovalCreate, validateApprovalDecision } from '../middleware/validateWorkflow.js';
import { PERMISSIONS } from '../config/roles.js';
import { createRequest, getQueue, getRequest, decide, escalate } from '../controllers/approval.controller.js';

const router = Router();

// Finding R8: creating an approval request used to be authenticate-only, so
// ANY logged-in identity (including the patient portal) could inject workflow
// items. Creation now requires the permission to PERFORM the underlying
// action (prescription/billing/lab/dispense work): every clinical or billing
// role that can trigger an approval can still request one; the patient
// portal, front-desk (receptionist), nursing and audit roles cannot.
router.post('/', authenticate, requireAnyPermission(
  PERMISSIONS.PRESCRIPTION_WRITE,
  PERMISSIONS.BILLING_WRITE,
  PERMISSIONS.LAB_WRITE,
  PERMISSIONS.PHARMACY_DISPENSE,
), validateApprovalCreate, createRequest);
router.get('/', authenticate, requirePermission(PERMISSIONS.APPROVAL_DECIDE), validatePagination, getQueue);
// GET /:id exposes the request payload and reason (potentially PHI), so it
// requires the same approval:decide permission as the rest of the review surface.
router.get('/:id', authenticate, requirePermission(PERMISSIONS.APPROVAL_DECIDE), validateUuidParam('id'), getRequest);
router.post('/:id/decide', authenticate, requirePermission(PERMISSIONS.APPROVAL_DECIDE), validateUuidParam('id'), validateApprovalDecision, decide);
router.post('/:id/escalate', authenticate, requirePermission(PERMISSIONS.APPROVAL_DECIDE), validateUuidParam('id'), escalate);

export default router;
