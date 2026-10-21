import { AppError } from '../utils/AppError.js';
import { DEFAULT_ROLE_PERMISSIONS, ROLES } from '../config/roles.js';
import * as rbacRepo from '../repositories/rbac.repository.js';

// -----------------------------------------------------------------------------
// Repository indirection — the real repository by default; tests may swap in a
// deterministic in-memory fake via __setRepositoryForTests so authorization
// behavior can be verified hermetically, without PostgreSQL. Production code
// paths are unchanged: they always see the real repository.
// -----------------------------------------------------------------------------
let activeRepo = rbacRepo;

export function __setRepositoryForTests(repo) {
  activeRepo = repo || rbacRepo;
}

// -----------------------------------------------------------------------------
// Role provisioning policy
// -----------------------------------------------------------------------------

// Privileged roles must NEVER be provisioned automatically from token claims.
// They hold every permission (see DEFAULT_ROLE_PERMISSIONS) and can only be
// assigned deliberately by an admin through the authenticated RBAC API.
const NON_PROVISIONABLE_ROLES = new Set([ROLES.ADMIN, ROLES.SYSTEM]);

/**
 * Filters token role claims down to the set of roles this application allows
 * to be provisioned automatically on first login. Pure function — unit tested.
 *
 * @param {unknown} roleNames
 * @returns {string[]} trimmed, non-privileged role names
 */
export function filterProvisionableRoles(roleNames) {
  if (!Array.isArray(roleNames)) return [];
  return roleNames
    .filter((n) => typeof n === 'string' && n.trim().length > 0)
    .map((n) => n.trim())
    .filter((n) => !NON_PROVISIONABLE_ROLES.has(n));
}

/**
 * Resolves the effective permission set for a list of role names.
 *
 * Reads the DB-curated role_permissions matrix first. If the matrix exists but
 * has no rows for these roles (fresh install, or a role added in Keycloak that
 * an admin has not mapped yet), it falls back to the documented least-privilege
 * defaults in config/roles.js.
 *
 * IMPORTANT: a database FAILURE is never a fallback condition. If the lookup
 * throws, the error propagates so the request fails loudly. Authorization must
 * never silently degrade to a hardcoded permission set during an outage.
 */
export async function resolvePermissions(roleNames = []) {
  const names = roleNames.length ? roleNames : [ROLES.PATIENT];

  const permissions = await activeRepo.listPermissionsForRoles(names);

  if (permissions.length === 0) {
    const fallback = new Set();
    names.forEach((n) => (DEFAULT_ROLE_PERMISSIONS[n] || []).forEach((p) => fallback.add(p)));
    return [...fallback];
  }

  return permissions;
}

export async function getOrProvisionUser({ subject, email, fullName, tokenRoles, emailVerified }) {
  if (!subject) throw AppError.badRequest('Token is missing a subject (sub) claim.');

  let user = null;
  let roles = [];

  // Database errors propagate on purpose: identity and role resolution must
  // never fall back to a fabricated user record assembled from token claims
  // when the database is unavailable. An outage here means this request fails
  // with a real error rather than continuing under an invented identity.
  user = await activeRepo.findUserBySubject(subject);
  // ACCOUNT-LINKING SAFETY (Phase 5): linking an existing row by email
  // requires the IdP to assert the email as VERIFIED (email_verified === true).
  // An unverified email claim is not proof of identity — without this gate,
  // anyone who can register an IdP account with a guessed email would take
  // over the matching app user. Unverified/absent email claims fall through
  // to provisioning a fresh row keyed by the token subject.
  if (!user && email && emailVerified === true) {
    const byEmail = await activeRepo.findUserByEmail(email);
    if (byEmail) user = byEmail;
  }
  if (!user) {
    user = await activeRepo.upsertUserFromToken({ subject, email, fullName });
  }

  // SECURITY (Phase 2B): deactivated accounts can never authenticate. The
  // `users.is_active` column already exists (0004_baseline_workflow_security.sql)
  // and is returned by the repository reads used above (`SELECT *` / `RETURNING *`),
  // so this needs no schema or repository change. Only an explicit `false` is
  // treated as inactive: test fakes and legacy rows that omit the column stay
  // active. The check runs BEFORE role seeding so a disabled account can never
  // gain roles or permissions.
  if (user && user.is_active === false) {
    throw new AppError('This account has been deactivated.', 403, 'FORBIDDEN');
  }

  roles = await activeRepo.listRolesForUser(user.id);
  if (roles.length === 0 && Array.isArray(tokenRoles) && tokenRoles.length) {
    // First login: seed local role assignments from the Keycloak token so
    // the approval/notification/audit modules have something to key off
    // before an admin curates roles in this app's own admin console.
    //
    // SECURITY: only non-privileged roles are ever seeded (see
    // filterProvisionableRoles). A token claiming "admin" or "system" is
    // silently downgraded — privilege assignment requires an admin.
    for (const roleName of filterProvisionableRoles(tokenRoles)) {
      // eslint-disable-next-line no-await-in-loop
      await activeRepo.assignRoleToUser(user.id, roleName);
    }
    roles = await activeRepo.listRolesForUser(user.id);
  }

  return { user, roles: roles.length ? roles : [ROLES.PATIENT] };
}


export async function listRoles() {
  return activeRepo.listRoles();
}

export async function assignRole(userId, roleName) {
  const role = await activeRepo.assignRoleToUser(userId, roleName);
  if (!role) throw AppError.notFound(`Role "${roleName}" does not exist.`);
  return role;
}

export async function revokeRole(userId, roleName) {
  const revoked = await activeRepo.revokeRoleFromUser(userId, roleName);
  if (!revoked) throw AppError.notFound(`User does not have role "${roleName}".`);
  return true;
}

export async function listRolesForUser(userId) {
  return activeRepo.listRolesForUser(userId);
}
