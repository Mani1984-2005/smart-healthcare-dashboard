// src/services/navigationPolicy.js
// -----------------------------------------------------------------------------
// Phase 2D — frontend navigation and direct-route access policy.
//
// Single source of truth for which backend permission a route needs. Every
// permission string used here is copied verbatim from
// backend/src/config/roles.js PERMISSIONS (lines 20-38) — no permission is
// invented, extended, or granted here. This module is a .js file (not .jsx) on
// purpose so node:test can import it without a JSX transform.
//
// IMPORTANT: this policy only affects what the UI renders. It is cosmetic.
// Every backend route runs `authenticate` + `requirePermission`, so a user who
// bypasses the UI still gets 401/403 from the server.
// -----------------------------------------------------------------------------

/** Longest-prefix-first [route path, required backend permission]. `null`
 *  permission means "any authenticated session" — used for routes whose pages
 *  have no gated backend counterpart (no backend permission exists to mirror). */
const ROUTE_PERMISSIONS = Object.freeze([
  ['/specimen-intake', 'lab:write'],
  ['/specimens', 'lab:write'],
  ['/laboratory', 'lab:write'],
  ['/x-ray', 'lab:write'],
  ['/xray', 'lab:write'],
  ['/pharmacy-inventory', 'prescription:read'],
  ['/prescriptions', 'prescription:read'],
  ['/dispensing', 'prescription:read'],
  ['/medicines', 'prescription:read'],
  ['/inventory', 'prescription:read'],
  ['/pharmacy', 'prescription:read'],
  ['/patients', 'patient:read'],
  ['/billing', 'billing:read'],
]);

/** Routes gated by a backend ROLE rather than a permission. Phase 2F (R5):
 *  /staff mirrors backend/src/routes/rbac.routes.js:13-16, which uses
 *  requireRole(admin) — not the rbac:manage permission — for the RBAC admin
 *  surface. Only "admin" appears here because only admin matches that gate
 *  (system holds rbac:manage but is NOT admitted by requireRole(admin), so a
 *  permission-based UI check would have advertised a page the server rejects). */
const ROUTE_ROLES = Object.freeze([
  ['/staff', 'admin'],
]);

/** Distinct permission keys this policy relies on — asserted in tests to be a
 *  subset of the backend's PERMISSIONS map, so nothing can be invented here. */
export const REQUIRED_PERMISSIONS = Object.freeze(
  [...new Set(ROUTE_PERMISSIONS.map(([, permission]) => permission))],
);

/** Distinct backend roles this policy relies on (backend/src/config/roles.js). */
export const REQUIRED_ROLES = Object.freeze(
  [...new Set(ROUTE_ROLES.map(([, role]) => role))],
);

/**
 * The backend ROLE a path requires, or null when the route is not role-gated.
 */
export function getRequiredRole(pathname) {
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  for (const [prefix, role] of ROUTE_ROLES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return role;
  }
  return null;
}

/**
 * The backend permission a path requires, or null when the route is available
 * to every authenticated session.
 */
export function getRequiredPermission(pathname) {
  if (getRequiredRole(pathname)) return null;
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  for (const [prefix, permission] of ROUTE_PERMISSIONS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return permission;
  }
  return null;
}

/**
 * True when the supplied backend roles/permissions allow UI access to the
 * path. Role-gated routes (ROUTE_ROLES) check the BACKEND-issued roles; the
 * rest check the backend-issued permissions. A missing/empty argument denies
 * everything that requires a role or a permission, and only leaves the
 * ungated routes open.
 */
export function canAccessRoute(pathname, permissions, roles) {
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole) return Array.isArray(roles) && roles.includes(requiredRole);
  const required = getRequiredPermission(pathname);
  if (!required) return true;
  return Array.isArray(permissions) && permissions.includes(required);
}

/** Role display label derived from BACKEND roles (never from a portal card). */
export function describeRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return 'No access';
  return roles.join(', ');
}
