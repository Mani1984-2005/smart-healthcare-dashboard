import { AppError } from '../utils/AppError.js';

// SECURITY (Phase 2B): every fail-open clause of the form
//   `if (!authEnv.authEnabled && !req.roles) return next();`
// has been REMOVED. Those clauses skipped the gate entirely whenever
// authentication was disabled and no principal had been attached, so a route
// that was ever mounted without `authenticate` silently became public.
// The gates below now always evaluate: an anonymous caller holds an empty
// role/permission set and is denied (403) like any other under-privileged
// caller. AUTH_ENABLED never authorizes anyone.

/**
 * Requires the authenticated principal to hold at least one of the given
 * realm roles.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
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
 * Requires the authenticated principal to hold AT LEAST ONE of the given
 * fine-grained permissions.
 */
export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const granted = new Set(req.permissions || []);
    const hasAny = permissions.some((p) => granted.has(p));
    if (!hasAny) {
      return next(new AppError(
        `Requires at least one of permissions: ${permissions.join(', ')}`, 403, 'FORBIDDEN'
      ));
    }
    next();
  };
}

/**
 * Allows a request through if the caller owns the resource (req.user.id
 * === resourceOwnerId(req)) OR holds one of the given roles.
 */
export function requireSelfOrRole(resourceOwnerId, ...allowedRoles) {
  return (req, res, next) => {
    const ownerId = typeof resourceOwnerId === 'function' ? resourceOwnerId(req) : resourceOwnerId;
    if (req.user && req.user.id === ownerId) return next();
    const roles = req.roles || [];
    if (roles.some((r) => allowedRoles.includes(r))) return next();
    return next(new AppError('You do not have access to this resource', 403, 'FORBIDDEN'));
  };
}
