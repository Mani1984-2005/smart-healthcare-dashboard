import { authEnv } from '../config/authEnv.js';
import { verifyAccessToken } from '../services/keycloakAdapter.service.js';
import { getOrProvisionUser, resolvePermissions } from '../services/rbac.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { ROLES } from '../config/roles.js';

const DEV_DEFAULT_USER = {
  id: '00000000-0000-0000-0000-000000000002',
  full_name: 'Dev Clinician',
  email: 'dev@medicare-pro.local',
};

/**
 * Populates req.user / req.roles / req.permissions from a Bearer JWT.
 * Enforces authentication strictly in production or whenever authEnabled is active.
 * Applies least-privilege permissions without granting godmode System User.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  // If a Bearer token is provided, always verify and resolve real claims
  if (scheme === 'Bearer' && token) {
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
    req.authMode = authEnv.keycloak.jwksUri ? 'keycloak' : 'dev-jwt';
    return next();
  }

  // When no token is provided:
  // In production or when authEnabled is explicitly active, reject unauthenticated calls
  if (isProd || authEnv.authEnabled) {
    return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED'));
  }

  // Non-production development fallback when AUTH_ENABLED=false:
  // Attach a least-privilege clinician user rather than granting the godmode system user
  req.user = DEV_DEFAULT_USER;
  req.roles = [ROLES.DOCTOR, ROLES.RECEPTIONIST];
  req.permissions = await resolvePermissions([ROLES.DOCTOR, ROLES.RECEPTIONIST]);
  req.authMode = 'disabled';
  next();
});

/**
 * Same as `authenticate` but never rejects the request — used on routes
 * that behave differently for anonymous vs. identified callers (e.g. QR
 * lookups that patients may hit without being logged in).
 */
export const authenticateOptional = asyncHandler(async (req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
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
      req.authMode = authEnv.keycloak.jwksUri ? 'keycloak' : 'dev-jwt';
      return next();
    } catch (err) {
      logger.debug('Optional auth failed, continuing unauthenticated', { error: err.message });
      req.user = null;
      req.roles = [];
      req.permissions = [];
      req.authMode = 'anonymous';
      return next();
    }
  }

  if (isProd || authEnv.authEnabled) {
    req.user = null;
    req.roles = [];
    req.permissions = [];
    req.authMode = 'anonymous';
    return next();
  }

  req.user = DEV_DEFAULT_USER;
  req.roles = [ROLES.DOCTOR, ROLES.RECEPTIONIST];
  req.permissions = await resolvePermissions([ROLES.DOCTOR, ROLES.RECEPTIONIST]);
  req.authMode = 'disabled';
  next();
});

