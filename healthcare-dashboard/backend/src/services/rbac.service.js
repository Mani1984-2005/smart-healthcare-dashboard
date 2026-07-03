import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_ROLE_PERMISSIONS, ROLES } from '../config/roles.js';
import * as rbacRepo from '../repositories/rbac.repository.js';

/**
 * Resolves the effective permission set for a list of role names.
 * Reads the DB-curated role_permissions matrix first; falls back to the
 * hardcoded DEFAULT_ROLE_PERMISSIONS for any role that has no rows yet,
 * so a fresh install (or a role added to Keycloak but not yet mapped in
 * the DB) still resolves to a sane, least-privilege permission set.
 */
export async function resolvePermissions(roleNames = []) {
  const names = roleNames.length ? roleNames : [ROLES.PATIENT];
  let permissions = [];
  try {
    permissions = await rbacRepo.listPermissionsForRoles(names);
  } catch (err) {
    logger.warn('RBAC permission lookup failed, using in-memory defaults', { error: err.message });
  }

  if (permissions.length === 0) {
    const fallback = new Set();
    names.forEach((n) => (DEFAULT_ROLE_PERMISSIONS[n] || []).forEach((p) => fallback.add(p)));
    permissions = [...fallback];
  }
  return permissions;
}

export async function getOrProvisionUser({ subject, email, fullName, tokenRoles }) {
  if (!subject) throw AppError.badRequest('Token is missing a subject (sub) claim.');
  let user = await rbacRepo.findUserBySubject(subject);
  if (!user && email) {
    // Migration path: a Part-1 user row created before Keycloak existed.
    const byEmail = await rbacRepo.findUserByEmail(email);
    if (byEmail) user = byEmail;
  }
  if (!user) {
    user = await rbacRepo.upsertUserFromToken({ subject, email, fullName });
  }

  let roles = await rbacRepo.listRolesForUser(user.id);
  if (roles.length === 0 && Array.isArray(tokenRoles) && tokenRoles.length) {
    // First login: seed local role assignments from the Keycloak token so
    // the approval/notification/audit modules have something to key off
    // before an admin curates roles in this app's own admin console.
    for (const roleName of tokenRoles) {
      // eslint-disable-next-line no-await-in-loop
      await rbacRepo.assignRoleToUser(user.id, roleName);
    }
    roles = await rbacRepo.listRolesForUser(user.id);
  }

  return { user, roles: roles.length ? roles : [ROLES.PATIENT] };
}

export async function listRoles() {
  return rbacRepo.listRoles();
}

export async function assignRole(userId, roleName) {
  const role = await rbacRepo.assignRoleToUser(userId, roleName);
  if (!role) throw AppError.notFound(`Role "${roleName}" does not exist.`);
  return role;
}

export async function revokeRole(userId, roleName) {
  const revoked = await rbacRepo.revokeRoleFromUser(userId, roleName);
  if (!revoked) throw AppError.notFound(`User does not have role "${roleName}".`);
  return true;
}

export async function listRolesForUser(userId) {
  return rbacRepo.listRolesForUser(userId);
}
