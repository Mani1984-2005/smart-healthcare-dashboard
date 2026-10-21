// src/services/authToken.js
// -----------------------------------------------------------------------------
// Phase 2D — LOCAL DEVELOPMENT authentication token service.
//
// ⚠ This is a development/demo bridge ONLY. It obtains a token from the
//   backend's triple-gated POST /api/auth/dev-token endpoint
//   (backend/src/controllers/rbac.controller.js:63-92), which refuses
//   production environments, refuses to run when KEYCLOAK_JWKS_URI is
//   configured, refuses to run unless ALLOW_DEV_TOKENS=true, and refuses to
//   mint privileged roles (admin/system). It is NOT production authentication
//   and must never be used for real patient operations.
//
// Design rules (Phase 2D approval):
//   * The backend is the sole authority: identity, roles and permissions all
//     come from GET /api/auth/me — never from the portal card the user clicked.
//   * No fabrication: every failure path throws or returns null; nothing ever
//     synthesises a user, a role or a token.
//   * This module imports NOTHING from src/api/* so that src/api/client.js can
//     import it (one-way dependency, no cycle). Its own calls use fetch().
// -----------------------------------------------------------------------------

const TOKEN_KEY = 'medicare_auth_token';       // read by src/api/client.js:35
const IDENTITY_KEY = 'medicare_auth_identity';
const LEGACY_USER_KEY = 'medicare_auth_user';  // Phase 2C key, retired
const LEGACY_ROLE_KEY = 'role';                // Phase 2C self-selected role, retired

export const SESSION_EXPIRED_EVENT = 'medicare:session-expired';

/**
 * Portal card label -> backend role.
 * Only roles defined in backend/src/config/roles.js are listed, and only those
 * the dev-token endpoint is willing to issue. `admin` and `system` are rejected
 * as privileged by rbac.controller.js:83-89, and `Hospital` has no backend
 * role at all — both are deliberately absent rather than mapped to a substitute.
 */
const PORTAL_ROLE_MAP = Object.freeze({
  Patient: 'patient',
  Doctor: 'doctor',
  Receptionist: 'receptionist',
});

/** Portal cards that cannot be issued a backend identity, with the reason. */
export const UNSUPPORTED_PORTAL_ROLES = Object.freeze({
  Admin: 'The Admin portal needs the privileged "admin" role, which the backend '
    + 'deliberately refuses to issue from the development-token endpoint.',
  Hospital: 'The Hospital portal has no corresponding backend role, so no '
    + 'verified identity could be issued for it.',
});

export function resolveBackendRole(portalRole) {
  return PORTAL_ROLE_MAP[portalRole] ?? null;
}

/** Clinical/session data written while authenticated. Cleared on logout so a
 *  later session in the same browser cannot read a previous user's records.
 *  Deliberately EXCLUDES non-user preferences and shared app content:
 *  theme, medicare_lang, hospital_achievements, pharmacy_medicines,
 *  inventory_qa_checklist. Key provenance is cited on each line. */
const SESSION_SCOPED_STORAGE_KEYS = Object.freeze([
  'patients',                 // data/labMasterLibrary.js:305, pages/PatientsPage.jsx:30
  'prescriptions',            // pages/pharmacy/PrescriptionPage.jsx:73
  'billing_invoices',         // utils/billingStorage.js:4
  'medicare_reports',         // services/reportsService.js:3
  'xray_images',              // pages/XRaySharingPage.jsx:17
  'lab_tests',                // data/labMasterLibrary.js:304
  'medicare_lab_orders',      // constants/labConstants.js:232
  'medicare_lab_results',     // constants/labConstants.js:233
  'medicare_lab_tests',       // constants/labConstants.js:234
  'medicare_lab_specimens',   // constants/labConstants.js:235
]);

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

// ─── Token + identity storage ────────────────────────────────────────────────

export function getToken() {
  try {
    return storage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  const store = storage();
  if (!store || !token) return;
  store.setItem(TOKEN_KEY, token);
}

export function getIdentity() {
  try {
    const raw = storage()?.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setIdentity(identity) {
  const store = storage();
  if (!store || !identity) return;
  store.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

/**
 * Drop every piece of authentication state plus session-scoped clinical data.
 * Used by explicit logout AND by the client's 401 handler, so a stale session
 * can never hand its data to the next user of the same browser.
 */
export function clearAuthSession({ includeSessionData = true } = {}) {
  const store = storage();
  if (!store) return;
  for (const key of [TOKEN_KEY, IDENTITY_KEY, LEGACY_USER_KEY, LEGACY_ROLE_KEY]) {
    try { store.removeItem(key); } catch { /* storage unavailable */ }
  }
  if (includeSessionData) {
    for (const key of SESSION_SCOPED_STORAGE_KEYS) {
      try { store.removeItem(key); } catch { /* storage unavailable */ }
    }
  }
}

/** Keys cleared alongside auth state — exported so tests can assert the exact set. */
export const __sessionScopedKeys = SESSION_SCOPED_STORAGE_KEYS;

// ─── Session-expired signalling (client.js -> AuthContext) ───────────────────

export function notifySessionExpired() {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
  } catch { /* no DOM (tests): state is still cleared, listeners are optional */ }
}

export function subscribeSessionExpired(handler) {
  try {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return () => {};
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  } catch {
    return () => {};
  }
}

// ─── Backend calls ───────────────────────────────────────────────────────────

function describeFailure(status, body) {
  const serverMessage = body?.error?.message || body?.message;
  if (status === 401) return 'The development session is no longer valid. Please sign in again.';
  if (status === 403) return serverMessage || 'Development token issuance is disabled on this backend.';
  if (serverMessage) return serverMessage;
  return `Unexpected response from the authentication endpoint (HTTP ${status}).`;
}

async function requestDevelopmentToken(portalRole) {
  const backendRole = resolveBackendRole(portalRole);
  if (!backendRole) {
    throw new Error(UNSUPPORTED_PORTAL_ROLES[portalRole]
      || `"${portalRole}" is not a supported portal role.`);
  }

  const res = await fetch('/api/auth/dev-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      // Deterministic, non-privileged subject: one backend user row per portal
      // role. Dev tokens carry no email_verified claim, so this can never take
      // over an existing account by email (see keycloakAdapter.service.js).
      subject: `dev-portal-${backendRole}`,
      email: `${backendRole}@medicare-pro.local`,
      fullName: `Local Dev ${backendRole}`,
      roles: [backendRole],
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(describeFailure(res.status, body));
  }

  const token = body?.data?.accessToken;
  if (!token || typeof token !== 'string') {
    // A 2xx without a token is still a failure — never invent one.
    throw new Error('The backend did not return an access token.');
  }
  return { token, roles: Array.isArray(body?.data?.roles) ? body.data.roles : [backendRole] };
}

async function requestIdentity(token) {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(describeFailure(res.status, body));
  }
  const data = body?.data;
  if (!data || !Array.isArray(data.roles)) {
    throw new Error('The backend returned an unrecognised identity payload.');
  }
  return {
    user: data.user ?? null,
    roles: data.roles,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    authMode: data.authMode ?? null,
  };
}

// ─── Public flow ─────────────────────────────────────────────────────────────

/**
 * Establish a session for a portal card.
 * Order matters: token first (so /auth/me can authenticate), identity second.
 * If identity validation fails the token is removed again, so a half-open
 * session can never survive a partial failure.
 */
export async function loginWithDevelopmentToken(portalRole) {
  const { token } = await requestDevelopmentToken(portalRole);
  setToken(token);
  try {
    const identity = await requestIdentity(token);
    setIdentity(identity);
    return identity;
  } catch (err) {
    clearAuthSession({ includeSessionData: false });
    throw err;
  }
}

/**
 * Validate a previously stored token on page refresh.
 * Any failure (missing, invalid, expired, deactivated account) drops the
 * session silently and returns null — the caller simply stays logged out,
 * which is what prevents a redirect loop.
 */
export async function restoreSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const identity = await requestIdentity(token);
    setIdentity(identity);
    return identity;
  } catch {
    clearAuthSession({ includeSessionData: false });
    return null;
  }
}

/** Explicit logout: auth state + session-scoped clinical data. */
export function logoutSession() {
  clearAuthSession({ includeSessionData: true });
}
