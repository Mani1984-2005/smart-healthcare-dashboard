import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorize.js';
import { ROLES } from '../config/roles.js';
import {
  whoAmI, listRoles, listUserRoles, assignRole, revokeRole, issueDevToken,
} from '../controllers/rbac.controller.js';

const router = Router();

router.post('/dev-token', issueDevToken); // no auth required — issues the token itself
router.get('/me', authenticate, whoAmI);
router.get('/roles', authenticate, requireRole(ROLES.ADMIN), listRoles);
router.get('/users/:userId/roles', authenticate, requireRole(ROLES.ADMIN), listUserRoles);
router.post('/users/:userId/roles', authenticate, requireRole(ROLES.ADMIN), assignRole);
router.delete('/users/:userId/roles/:roleName', authenticate, requireRole(ROLES.ADMIN), revokeRole);

export default router;
