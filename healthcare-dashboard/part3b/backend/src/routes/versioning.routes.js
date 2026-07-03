import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateEntityTypeParam, validateUuidParam } from '../middleware/validateWorkflow.js';
import { PERMISSIONS } from '../config/roles.js';
import { getHistory, getVersion, diff, restore } from '../controllers/versioning.controller.js';

const router = Router();

router.get('/:entityType/:entityId', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_READ), validateEntityTypeParam, validateUuidParam('entityId'), getHistory);
router.get('/:entityType/:entityId/diff', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_READ), validateEntityTypeParam, validateUuidParam('entityId'), diff);
router.get('/:entityType/:entityId/:versionNumber', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_READ), validateEntityTypeParam, validateUuidParam('entityId'), getVersion);
router.post('/:entityType/:entityId/:versionNumber/restore', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_RESTORE), validateEntityTypeParam, validateUuidParam('entityId'), restore);

export default router;
