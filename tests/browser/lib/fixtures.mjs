// tests/browser/lib/fixtures.mjs
// TEST-ONLY identity fixtures for the browser QA harness.
//
// Sources of truth (read-only imports of existing application definitions):
//   * backend/src/config/roles.js   -> ROLES, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS
//     (the vocabulary actually used by ProtectedRoute + Sidebar guards)
//   * src/constants/roles.js         -> ROLES / ROLE_LABELS (frontend definitions)
//
// These fixtures are consumed ONLY by src/context/AuthContext.jsx when
//   import.meta.env.DEV === true  AND  window.__MEDICARE_TEST_IDENTITY__ is set.
// In a production build that branch is compiled away (no bypass exists).

import { ROLES as BACKEND_ROLES, DEFAULT_ROLE_PERMISSIONS } from "../../../backend/src/config/roles.js";
import { ROLES as FRONTEND_ROLES, ROLE_LABELS } from "../../../src/constants/roles.js";

export { BACKEND_ROLES, FRONTEND_ROLES, ROLE_LABELS };

/**
 * Permission keys requested by the Sidebar that exist in NEITHER the backend
 * permission vocabulary NOR src/constants/permissions.js:
 *   dashboard:view, settings:view, role:admin
 * Documented as DEFECT (permission-vocabulary fragmentation); fixtures grant
 * them explicitly so navigation behaviour is observable, and a dedicated test
 * asserts the behaviour when they are withheld.
 */
export const SIDEBAR_ONLY_PERMISSIONS = ["dashboard:view", "settings:view", "role:admin"];

const ALL_BACKEND_PERMISSIONS = Object.values(DEFAULT_ROLE_PERMISSIONS[BACKEND_ROLES.ADMIN]);

/** Strict fixtures: exactly what the canonical backend role mapping grants. */
function canonical(role) {
  return [...(DEFAULT_ROLE_PERMISSIONS[role] || [])];
}

/**
 * Presentation fixtures: canonical backend permissions plus the three
 * sidebar-only keys, granted as follows:
 *   dashboard:view -> every authenticated identity (route has no permission guard)
 *   settings:view  -> every authenticated identity (route has no permission guard)
 *   role:admin     -> admin only (staff directory)
 */
function presentation(role) {
  const permissions = new Set(canonical(role));
  permissions.add("dashboard:view");
  permissions.add("settings:view");
  if (role === BACKEND_ROLES.ADMIN) permissions.add("role:admin");
  return [...permissions];
}

function identityFor(roleKey, { permissions, roles, name, email } = {}) {
  const role = BACKEND_ROLES[roleKey] || roleKey;
  return {
    user: {
      uid: `qa-uid-${role}`,
      name: name || `${ROLE_LABELS[role] || role} (QA Fixture)`,
      email: email || `${role}@qa.invalid`,
      role,
    },
    roles: roles || [role],
    permissions: permissions || presentation(role),
    token: "qa-fixture-token-not-a-real-credential",
    error: "",
  };
}

/** All identities used by the role-presentation suite. */
export const IDENTITIES = {
  admin: identityFor("admin"),
  doctor: identityFor("doctor"),
  nurse: identityFor("nurse"),
  pharmacist: identityFor("pharmacist"),
  lab_technician: identityFor("lab_technician"),
  billing_clerk: identityFor("billing_clerk"),
  receptionist: identityFor("receptionist"),
  auditor: identityFor("auditor"),
  patient: identityFor("patient"),
  // ---- edge cases -------------------------------------------------------
  /** Authenticated but with no permissions at all. */
  no_permissions: { ...identityFor("admin", { permissions: [], name: "No Permission Fixture" }) },
  /** Role strings that are not part of any definition -> must not crash. */
  unknown_role: {
    ...identityFor("admin", {
      roles: ["not_a_real_role"],
      permissions: ["dashboard:view", "settings:view"],
      name: "Unknown Role Fixture",
    }),
  },
  /** Missing roles/permissions arrays entirely (malformed identity). */
  malformed: {
    user: { uid: "qa-uid-malformed", name: "Malformed Fixture", email: "malformed@qa.invalid", role: "admin" },
    token: "qa-fixture-token-not-a-real-credential",
    error: "",
  },
  /** Signed out. */
  signed_out: { user: null, roles: [], permissions: [], error: "" },
  /** Frontend-only role (src/constants/roles.js) with no backend counterpart. */
  super_admin: identityFor("admin", {
    roles: [FRONTEND_ROLES.SUPER_ADMIN],
    permissions: [...ALL_BACKEND_PERMISSIONS, ...SIDEBAR_ONLY_PERMISSIONS, "role:admin"],
    name: "Super Administrator (QA Fixture)",
  }),
  /** Frontend-only role with an empty permission set. */
  guest: identityFor("admin", {
    roles: [FRONTEND_ROLES.GUEST],
    permissions: [],
    name: "Guest (QA Fixture)",
  }),
};

/** Strict (canonical-only) variants used by the navigation-visibility tests. */
export const CANONICAL_IDENTITIES = Object.fromEntries(
  ["admin", "doctor", "nurse", "pharmacist", "lab_technician", "billing_clerk", "receptionist", "auditor", "patient"].map(
    (roleKey) => [roleKey, identityFor(roleKey, { permissions: canonical(roleKey) })]
  )
);

export function resolveIdentity(key) {
  if (typeof key === "object" && key !== null) return key;
  const found = IDENTITIES[key];
  if (!found) throw new Error(`Unknown test identity fixture: ${key}`);
  return found;
}
