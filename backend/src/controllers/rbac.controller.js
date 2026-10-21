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
 * can be exercised with realistic roles before Keycloak is provisioned.
 *
 * Triple-gated, fail-closed:
 *   1. never in production (and only in development/test environments);
 *   2. disabled unless the operator sets ALLOW_DEV_TOKENS=true explicitly —
 *      an accidental deployment with NODE_ENV unset must not expose it;
 *   3. privileged roles (admin/system) can NEVER be minted here, even when
 *      enabled — privilege escalation through a token-minting endpoint is
 *      exactly what this guard exists to prevent. Privileged roles are
 *      assigned through the authenticated RBAC admin API only.
 *   4. (Phase 2F / R2) least privilege by default: a request that omits
 *      `roles` mints a ROLE-LESS token, which resolves to the patient-portal
 *      fallback on use — never a clinician. Malformed role input is refused.
 */
export const issueDevToken = asyncHandler(async (req, res) => {
  const currentEnv = process.env.NODE_ENV || 'development';
  if (currentEnv === 'production') {
    throw new AppError('Development token issuance is forbidden in production.', 403, 'FORBIDDEN');
  }
  if (!['development', 'test'].includes(currentEnv)) {
    throw new AppError(`Development token issuance is disabled in environment: ${currentEnv}`, 403, 'FORBIDDEN');
  }
  if (authEnv.keycloak.jwksUri) {
    throw AppError.badRequest('Dev token issuance is disabled once KEYCLOAK_JWKS_URI is configured.');
  }
  if (process.env.ALLOW_DEV_TOKENS !== 'true') {
    throw new AppError(
      'Development token issuance is disabled. Set ALLOW_DEV_TOKENS=true explicitly for local development.',
      403,
      'FORBIDDEN',
    );
  }
  const body = req.body || {};
  const { subject = 'dev-user-1', email = 'dev@medicare-pro.local', fullName = 'Dev User' } = body;
  if (typeof subject !== 'string' || !subject.trim()) {
    throw AppError.badRequest('"subject" must be a non-empty string.');
  }
  if (typeof email !== 'string' || !email.trim()) {
    throw AppError.badRequest('"email" must be a non-empty string.');
  }
  if (typeof fullName !== 'string' || !fullName.trim()) {
    throw AppError.badRequest('"fullName" must be a non-empty string.');
  }
  // SECURITY (Phase 2F / R2): least privilege by default. The former default
  // of [doctor] meant a request that OMITTED `roles` silently minted a
  // clinician token. A role-less token resolves to the patient-portal
  // fallback on use (services/rbac.service.js getOrProvisionUser), and
  // malformed role input (a bare string, numbers, nested objects) is refused
  // with 400 instead of being coerced into a token. A development session
  // must state the roles it needs, explicitly.
  if (body.roles !== undefined && !Array.isArray(body.roles)) {
    throw AppError.badRequest('"roles" must be an array of role names.');
  }
  if (Array.isArray(body.roles) && body.roles.some((r) => typeof r !== 'string' || !r.trim())) {
    throw AppError.badRequest('"roles" must contain only non-empty role names.');
  }
  const requestedRoles = (body.roles || []).map((r) => r.trim());
  const privileged = requestedRoles.filter((r) => [ROLES.ADMIN, ROLES.SYSTEM].includes(r));
  if (privileged.length) {
    throw AppError.badRequest(
      `Privileged role(s) cannot be minted via the dev-token endpoint: ${privileged.join(', ')}. ` +
        'Assign privileged roles through the authenticated RBAC admin API.',
    );
  }
  const token = mintDevToken({ subject, email, fullName, roles: requestedRoles });
  res.json({ success: true, data: { accessToken: token, expiresIn: '8h', roles: requestedRoles } });
});

