import { AppError } from '../utils/AppError.js';
import { authEnv } from '../config/authEnv.js';

/**
 * Requires the authenticated principal to hold at least one of the given
 * realm roles. No-op (always passes) while AUTH_ENABLED=false, matching
 * the permissive default of `authenticate`.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!authEnv.authEnabled) return next();
    const roles = req.roles || [];
    if (!roles.some((r) => allowedRoles.includes(r))) {
      return next(new AppError(
        `Requires one of roles: ${allowedRoles.join(', ')}`, 403, 'FORBIDDEN'
      ));
    }
    next();
  };
}

/**
 * Requires the authenticated principal to hold every given fine-grained
 * permission (resolved from role_permissions — see rbac.service.js).
 */
export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!authEnv.authEnabled) return next();
    const granted = new Set(req.permissions || []);
    const missing = requiredPermissions.filter((p) => !granted.has(p));
    if (missing.length) {
      return next(new AppError(
        `Missing required permission(s): ${missing.join(', ')}`, 403, 'FORBIDDEN'
      ));
    }
    next();
  };
}

/**
 * Allows a request through if the caller owns the resource (req.user.id
 * === resourceOwnerId(req)) OR holds one of the given roles. Useful for
 * "patients can see their own invoices, billing_clerk can see all" cases.
 */
export function requireSelfOrRole(resourceOwnerId, ...allowedRoles) {
  return (req, res, next) => {
    if (!authEnv.authEnabled) return next();
    const ownerId = typeof resourceOwnerId === 'function' ? resourceOwnerId(req) : resourceOwnerId;
    if (req.user && req.user.id === ownerId) return next();
    const roles = req.roles || [];
    if (roles.some((r) => allowedRoles.includes(r))) return next();
    return next(new AppError('You do not have access to this resource', 403, 'FORBIDDEN'));
  };
}
