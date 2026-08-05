import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validatePagination, validateUuidParam } from '../middleware/validate.js';
import { validateNotificationPreferences } from '../middleware/validateWorkflow.js';
import {
  listMyNotifications, markRead, markAllRead, getPreferences, updatePreferences,
} from '../controllers/notification.controller.js';

const router = Router();

router.get('/', authenticate, validatePagination, listMyNotifications);
router.patch('/:id/read', authenticate, validateUuidParam('id'), markRead);
router.post('/read-all', authenticate, markAllRead);
router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, validateNotificationPreferences, updatePreferences);

export default router;
