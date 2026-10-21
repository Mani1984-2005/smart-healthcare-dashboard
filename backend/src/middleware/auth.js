import { authEnv } from '../config/authEnv.js';
import { verifyAccessToken } from '../services/keycloakAdapter.service.js';
import { getOrProvisionUser, resolvePermissions } from '../services/rbac.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

// SECURITY (Phase 2B): the historical "AUTH_ENABLED=false development fallback"
// that attached a synthetic doctor/receptionist principal (DEV_DEFAULT_USER)
// to anonymous requests has been REMOVED. Authentication is mandatory on
// protected routes in every environment. AUTH_ENABLED is retained only for
// configuration reporting; it can no longer authorize an anonymous caller.
//
// The supported local development identity is an explicitly enabled,
// explicitly configured development token (see controllers/rbac.controller.js
// issueDevToken: ALLOW_DEV_TOKENS=true plus a non-default JWT_SECRET).

/**
 * Populates req.user / req.roles / req.permissions from a Bearer JWT.
 * A Bearer token is the ONLY way to obtain a principal — missing headers,
 * empty tokens and non-Bearer schemes (Basic/Digest/...) are rejected with
 * 401 UNAUTHORIZED and never receive a synthetic identity or permissions.
 * Applies least-privilege permissions without granting godmode System User.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  // A Bearer token is provided: verify it and resolve real claims.
  if (scheme === 'Bearer' && token) {
    const claims = await verifyAccessToken(token);
    const { user, roles } = await getOrProvisionUser({
      subject: claims.subject,
      email: claims.email,
      fullName: claims.fullName,
      tokenRoles: claims.roles,
      emailVerified: claims.emailVerified,
    });

    req.user = user;
    req.roles = roles;
    req.permissions = await resolvePermissions(roles);
    req.authMode = authEnv.keycloak.jwksUri ? 'keycloak' : 'dev-jwt';
    return next();
  }

  // No usable token: fail closed in EVERY environment.
  return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED'));
});

/**
 * Same as `authenticate`, except that a caller with NO credentials at all is
 * allowed to continue as an anonymous principal (null user, no roles, no
 * permissions) — used on routes that behave differently for anonymous vs.
 * identified callers.
 *
 * SECURITY (Phase 2B): anything that LOOKS like a credential but does not
 * verify is a hard failure. A present Authorization header must be a valid
 * `Bearer <token>`; malformed schemes and invalid/expired tokens return 401
 * instead of being silently downgraded to anonymous (and database errors
 * propagate rather than being swallowed).
 */
export const authenticateOptional = asyncHandler(async (req, res, next) => {
  const header = (req.headers.authorization || '').trim();

  // No Authorization header at all: genuinely anonymous.
  if (!header) {
    req.user = null;
    req.roles = [];
    req.permissions = [];
    req.authMode = 'anonymous';
    return next();
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED'));
  }

  const claims = await verifyAccessToken(token);
  // NOTE: `emailVerified` is deliberately NOT forwarded here, matching the
  // pre-Phase 2B behavior of this middleware — optional-auth routes never
  // trigger email-based account linking (see services/keycloakAdapter.service.js
  // and getOrProvisionUser's ACCOUNT-LINKING SAFETY gate).
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
  next();
});
