import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authEnv } from '../config/authEnv.js';
import { mintDevToken } from '../services/keycloakAdapter.service.js';
import { ROLES } from '../config/roles.js';
import * as rbacService from '../services/rbac.service.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';

export const whoAmI = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user, roles: req.roles, permissions: req.permissions, authMode: req.authMode || 'disabled' },
  });
});

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await rbacService.listRoles();
  res.json({ success: true, data: roles });
});

export const listUserRoles = asyncHandler(async (req, res) => {
  const roles = await rbacService.listRolesForUser(req.params.userId);
  res.json({ success: true, data: roles });
});

export const assignRole = asyncHandler(async (req, res) => {
  const { roleName } = req.body || {};
  if (!roleName) throw AppError.badRequest('"roleName" is required.');
  const role = await rbacService.assignRole(req.params.userId, roleName);
  await recordAudit({
    userId: req.user?.id,
    action: 'ROLE_ASSIGNED',
    details: { targetUserId: req.params.userId, role: role.name },
    ...auditContextFromRequest(req),
  });
  res.status(201).json({ success: true, data: role });
});

export const revokeRole = asyncHandler(async (req, res) => {
  await rbacService.revokeRole(req.params.userId, req.params.roleName);
  await recordAudit({
    userId: req.user?.id,
    action: 'ROLE_REVOKED',
    details: { targetUserId: req.params.userId, role: req.params.roleName },
    ...auditContextFromRequest(req),
  });
  res.json({ success: true, data: { revoked: true } });
});

/**
 * DEV-ONLY endpoint: mints a locally-signed JWT so the rest of the API
 * (approvals, notifications, scanner, biometrics, clinical assistant) can
 * be exercised with realistic roles before Keycloak is provisioned.
 * Automatically disabled once a real Keycloak JWKS endpoint is configured.
 */
export const issueDevToken = asyncHandler(async (req, res) => {
  if (authEnv.keycloak.jwksUri) {
    throw AppError.badRequest('Dev token issuance is disabled once KEYCLOAK_JWKS_URI is configured.');
  }
  const { subject = 'dev-user-1', email = 'dev@medicare-pro.local', fullName = 'Dev User', roles = [ROLES.DOCTOR] } = req.body || {};
  const token = mintDevToken({ subject, email, fullName, roles });
  res.json({ success: true, data: { accessToken: token, expiresIn: '8h', roles } });
});
