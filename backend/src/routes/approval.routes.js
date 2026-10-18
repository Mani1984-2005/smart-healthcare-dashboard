import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateUuidParam, validatePagination } from '../middleware/validate.js';
import { validateApprovalCreate, validateApprovalDecision } from '../middleware/validateWorkflow.js';
import { PERMISSIONS } from '../config/roles.js';
import { createRequest, getQueue, getRequest, decide, escalate } from '../controllers/approval.controller.js';

const router = Router();

router.post('/', authenticate, validateApprovalCreate, createRequest);
router.get('/', authenticate, requirePermission(PERMISSIONS.APPROVAL_DECIDE), validatePagination, getQueue);
router.get('/:id', authenticate, validateUuidParam('id'), getRequest);
router.post('/:id/decide', authenticate, requirePermission(PERMISSIONS.APPROVAL_DECIDE), validateUuidParam('id'), validateApprovalDecision, decide);
router.post('/:id/escalate', authenticate, requirePermission(PERMISSIONS.APPROVAL_DECIDE), validateUuidParam('id'), escalate);

export default router;
