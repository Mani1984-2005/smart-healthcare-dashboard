import { authEnv } from '../config/authEnv.js';
import { verifyAccessToken } from '../services/keycloakAdapter.service.js';
import { getOrProvisionUser, resolvePermissions } from '../services/rbac.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const SYSTEM_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  full_name: 'System User',
  email: 'system@medicare-pro.local',
};

/**
 * Populates req.user / req.roles / req.permissions from a Bearer JWT.
 *
 * Backward-compatible by design: when AUTH_ENABLED=false (the default,
 * matching Part 1-3A), every request is treated as the system user with
 * full permissions so existing routes keep working unmodified. Flip
 * AUTH_ENABLED=true once Keycloak is provisioned to start enforcing it.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  if (!authEnv.authEnabled) {
    req.user = SYSTEM_USER;
    req.roles = ['system'];
    req.permissions = await resolvePermissions(['system']);
    req.authMode = 'disabled';
    return next();
  }

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED'));
  }

  const claims = await verifyAccessToken(token);
  const { user, roles } = await getOrProvisionUser({
    subject: claims.subject,
    email: claims.email,
    fullName: claims.fullName,
    tokenRoles: claims.roles,
  });

  req.user = user;
  req.roles = roles;
  req.permissions = await resolvePermissions(roles);
  req.authMode = 'keycloak';
  next();
});

/**
 * Same as `authenticate` but never rejects the request — used on routes
 * that behave differently for anonymous vs. identified callers (e.g. QR
 * lookups that patients may hit without being logged in).
 */
export const authenticateOptional = asyncHandler(async (req, res, next) => {
  if (!authEnv.authEnabled || !req.headers.authorization) {
    req.user = SYSTEM_USER;
    req.roles = ['system'];
    req.permissions = await resolvePermissions(['system']);
    return next();
  }

  const [scheme, token] = req.headers.authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    req.user = null;
    req.roles = [];
    req.permissions = [];
    return next();
  }

  try {
    const claims = await verifyAccessToken(token);
    const { user, roles } = await getOrProvisionUser({
      subject: claims.subject,
      email: claims.email,
      fullName: claims.fullName,
      tokenRoles: claims.roles,
    });
    req.user = user;
    req.roles = roles;
    req.permissions = await resolvePermissions(roles);
  } catch (err) {
    logger.debug('Optional auth failed, continuing unauthenticated', { error: err.message });
    req.user = null;
    req.roles = [];
    req.permissions = [];
  }
  next();
});
