// tests/authIntegration.test.js
// -----------------------------------------------------------------------------
// Phase 2D — hermetic tests for local development authentication integration.
//
// Everything here is database-independent and offline: localStorage is shimmed
// and globalThis.fetch is replaced with a stub. No backend is started, no
// PostgreSQL is contacted, no token or secret is ever printed.
// -----------------------------------------------------------------------------

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import * as authToken from '../src/services/authToken.js';
import { apiClient } from '../src/api/client.js';
import {
  canAccessRoute, getRequiredPermission, REQUIRED_PERMISSIONS,
} from '../src/services/navigationPolicy.js';

// ─── Shims (the modules touch these lazily, inside functions) ────────────────

const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => { storageMap.set(k, String(v)); },
  removeItem: (k) => { storageMap.delete(k); },
  clear: () => { storageMap.clear(); },
  key: (i) => [...storageMap.keys()][i] ?? null,
  get length() { return storageMap.size; },
};

let windowSignals = [];
const windowListeners = new Map();
globalThis.window = {
  dispatchEvent: (event) => { windowSignals.push(event.type); return true; },
  addEventListener: (type, handler) => {
    windowListeners.set(type, [...(windowListeners.get(type) || []), handler]);
  },
  removeEventListener: (type, handler) => {
    windowListeners.set(type, (windowListeners.get(type) || []).filter((h) => h !== handler));
  },
};

// ─── Fetch stub ──────────────────────────────────────────────────────────────

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body ?? {}),
  };
}

function installFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return handler(url, options, calls);
  };
  return calls;
}

const originalFetch = globalThis.fetch;

function seedSession({ token = 'tok-doctor', roles = ['doctor'], permissions = ['patient:read'] } = {}) {
  localStorage.setItem('medicare_auth_token', token);
  localStorage.setItem('medicare_auth_identity', JSON.stringify({
    user: { id: 7, full_name: 'Local Dev doctor', email: 'doctor@medicare-pro.local' },
    roles, permissions, authMode: 'development',
  }));
}

beforeEach(() => {
  storageMap.clear();
  windowSignals = [];
  windowListeners.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ─── 1. Development-token acquisition and storage ────────────────────────────

describe('development-token acquisition', () => {
  test('stores the backend-issued token and the /auth/me identity', async () => {
    const calls = installFetch((url, options) => {
      if (url === '/api/auth/dev-token') {
        return jsonResponse(200, {
          success: true,
          data: { accessToken: 'tok-doctor', expiresIn: '8h', roles: ['doctor'] },
        });
      }
      if (url === '/api/auth/me') {
        assert.equal(options.headers.Authorization, 'Bearer tok-doctor',
          'identity lookup must authenticate with the just-issued token');
        return jsonResponse(200, {
          success: true,
          data: {
            user: { id: 7, full_name: 'Local Dev doctor', email: 'doctor@medicare-pro.local' },
            roles: ['doctor'],
            permissions: ['patient:read', 'prescription:read'],
            authMode: 'development',
          },
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const identity = await authToken.loginWithDevelopmentToken('Doctor');

    assert.equal(localStorage.getItem('medicare_auth_token'), 'tok-doctor');
    const stored = JSON.parse(localStorage.getItem('medicare_auth_identity'));
    assert.deepEqual(stored.roles, ['doctor'], 'roles must come from the backend');
    assert.deepEqual(identity.permissions, ['patient:read', 'prescription:read']);
    assert.equal(identity.authMode, 'development');

    const devTokenCall = calls.find((c) => c.url === '/api/auth/dev-token');
    assert.ok(devTokenCall, 'dev-token endpoint must be called');
    assert.equal(devTokenCall.options.method, 'POST');
    const body = JSON.parse(devTokenCall.options.body);
    assert.deepEqual(body.roles, ['doctor'], 'a backend role is requested, never admin/system');
  });

  test('Patient and Receptionist cards map to their exact backend roles', async () => {
    const requestedRoles = [];
    installFetch((url, options) => {
      if (url === '/api/auth/dev-token') {
        requestedRoles.push(...JSON.parse(options.body).roles);
        return jsonResponse(200, { success: true, data: { accessToken: 't', roles: [] } });
      }
      return jsonResponse(200, {
        success: true,
        data: { user: {}, roles: ['x'], permissions: [], authMode: 'development' },
      });
    });

    await authToken.loginWithDevelopmentToken('Patient');
    await authToken.loginWithDevelopmentToken('Receptionist');

    assert.deepEqual(requestedRoles, ['patient', 'receptionist']);
  });

  test('unsupported portal cards are refused with no network call and no login', async () => {
    const calls = installFetch(() => jsonResponse(200, { success: true, data: {} }));

    for (const card of ['Admin', 'Hospital']) {
      assert.equal(authToken.resolveBackendRole(card), null, `${card} must not map to any backend role`);
      await assert.rejects(
        () => authToken.loginWithDevelopmentToken(card),
        (err) => err instanceof Error && err.message.length > 0,
        `${card} must fail with an explanation`,
      );
    }

    assert.equal(calls.length, 0, 'no request may be sent for an unsupported card');
    assert.equal(localStorage.getItem('medicare_auth_token'), null);
    assert.equal(localStorage.getItem('medicare_auth_identity'), null);
  });

  test('a disabled/failing dev-token endpoint never fabricates a login', async () => {
    installFetch(() => jsonResponse(403, { error: { message: 'Development tokens are disabled on this backend.' } }));

    await assert.rejects(
      () => authToken.loginWithDevelopmentToken('Patient'),
      /Development tokens are disabled/,
    );
    assert.equal(localStorage.getItem('medicare_auth_token'), null, 'no token may be invented');
    assert.equal(localStorage.getItem('medicare_auth_identity'), null, 'no identity may be invented');
    assert.equal(authToken.getToken(), null);
  });

  test('a 2xx without a token is treated as failure', async () => {
    installFetch(() => jsonResponse(200, { success: true, data: {} }));

    await assert.rejects(() => authToken.loginWithDevelopmentToken('Patient'), /did not return an access token/);
    assert.equal(authToken.getToken(), null);
  });

  test('identity validation failure rolls the session back (no half-open session)', async () => {
    installFetch((url) => {
      if (url === '/api/auth/dev-token') {
        return jsonResponse(200, { success: true, data: { accessToken: 'tok-half', roles: ['doctor'] } });
      }
      return jsonResponse(401, { error: { message: 'Invalid access token' } });
    });

    await assert.rejects(() => authToken.loginWithDevelopmentToken('Doctor'));
    assert.equal(authToken.getToken(), null, 'the token must be withdrawn when identity cannot be proved');
    assert.equal(localStorage.getItem('medicare_auth_identity'), null);
  });
});

// ─── 2. Session restoration ──────────────────────────────────────────────────

describe('session restoration against /api/auth/me', () => {
  test('a stored token is re-validated and the identity refreshed', async () => {
    seedSession({ token: 'tok-valid' });
    installFetch((url, options) => {
      assert.equal(url, '/api/auth/me');
      assert.equal(options.headers.Authorization, 'Bearer tok-valid');
      return jsonResponse(200, {
        success: true,
        data: { user: { id: 7 }, roles: ['doctor'], permissions: ['patient:read'], authMode: 'development' },
      });
    });

    const identity = await authToken.restoreSession();
    assert.equal(identity.user.id, 7);
    assert.equal(authToken.getToken(), 'tok-valid');
  });

  test('an invalid stored token is deleted and the user stays logged out', async () => {
    seedSession({ token: 'tok-stale' });
    installFetch(() => jsonResponse(401, { error: { message: 'Invalid access token' } }));

    const identity = await authToken.restoreSession();

    assert.equal(identity, null);
    assert.equal(localStorage.getItem('medicare_auth_token'), null);
    assert.equal(localStorage.getItem('medicare_auth_identity'), null);
    assert.equal(windowSignals.length, 0, 'restoration must not emit a redirect signal');
  });

  test('no stored token means no request at all (cannot create a login loop)', async () => {
    const calls = installFetch(() => jsonResponse(200, { success: true, data: {} }));
    assert.equal(await authToken.restoreSession(), null);
    assert.equal(calls.length, 0);
  });
});

// ─── 3. Bearer attachment, 401 and 403 ───────────────────────────────────────

describe('protected API requests', () => {
  test('apiClient attaches the stored Bearer token to protected requests', async () => {
    localStorage.setItem('medicare_auth_token', 'tok-attached');
    const calls = installFetch(() => jsonResponse(200, { success: true, data: [] }));

    await apiClient.get('/patients', { params: { limit: 50 } });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/patients?limit=50');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer tok-attached');
  });

  test('401 clears the session and signals the app exactly once', async () => {
    seedSession({ token: 'tok-dead' });
    installFetch(() => jsonResponse(401, { error: { message: 'Invalid access token' } }));

    await assert.rejects(() => apiClient.get('/patients'), (err) => err.status === 401);

    assert.equal(localStorage.getItem('medicare_auth_token'), null);
    assert.equal(localStorage.getItem('medicare_auth_identity'), null);
    assert.equal(windowSignals.filter((t) => t === authToken.SESSION_EXPIRED_EVENT).length, 1);
  });

  test('an anonymous 401 does not emit the session-expired signal', async () => {
    installFetch(() => jsonResponse(401, { error: { message: 'Authentication required' } }));

    await assert.rejects(() => apiClient.get('/patients'), (err) => err.status === 401);

    assert.equal(windowSignals.includes(authToken.SESSION_EXPIRED_EVENT), false);
  });

  test('403 is access denied: session kept, flagged, no expiry signal', async () => {
    seedSession({ token: 'tok-live' });
    installFetch(() => jsonResponse(403, { error: { message: 'Insufficient permissions' } }));

    await assert.rejects(
      () => apiClient.get('/billing'),
      (err) => err.status === 403 && err.isForbidden === true && err.message === 'Insufficient permissions',
    );

    assert.equal(localStorage.getItem('medicare_auth_token'), 'tok-live', 'a 403 must not log the user out');
    assert.equal(windowSignals.includes(authToken.SESSION_EXPIRED_EVENT), false);
  });
});

// ─── 4. Logout and cross-session data isolation ──────────────────────────────

describe('logout and cached user-data isolation', () => {
  test('logout removes auth state and clinical data but keeps preferences', async () => {
    seedSession();
    for (const key of ['patients', 'prescriptions', 'billing_invoices', 'medicare_reports',
      'xray_images', 'lab_tests', 'medicare_lab_orders', 'medicare_lab_results',
      'medicare_lab_tests', 'medicare_lab_specimens']) {
      localStorage.setItem(key, 'clinical-data');
    }
    for (const key of ['theme', 'medicare_lang', 'hospital_achievements', 'pharmacy_medicines', 'inventory_qa_checklist']) {
      localStorage.setItem(key, 'keep-me');
    }

    authToken.logoutSession();

    assert.equal(authToken.getToken(), null);
    assert.equal(localStorage.getItem('medicare_auth_identity'), null);
    for (const key of authToken.__sessionScopedKeys) {
      assert.equal(localStorage.getItem(key), null, `${key} must not leak to the next session`);
    }
    for (const key of ['theme', 'medicare_lang', 'hospital_achievements', 'pharmacy_medicines', 'inventory_qa_checklist']) {
      assert.equal(localStorage.getItem(key), 'keep-me', `${key} is not user data and must survive logout`);
    }
  });

  test('legacy Phase 2C auth keys are purged on logout', () => {
    localStorage.setItem('medicare_auth_token', 'tok');
    localStorage.setItem('medicare_auth_identity', '{}');
    localStorage.setItem('medicare_auth_user', '{"uid":"legacy"}');
    localStorage.setItem('role', 'Admin');

    authToken.logoutSession();

    for (const key of ['medicare_auth_token', 'medicare_auth_identity', 'medicare_auth_user', 'role']) {
      assert.equal(localStorage.getItem(key), null, `${key} must be cleared`);
    }
  });
});

// ─── 5. Navigation and direct-route protection ──────────────────────────────

describe('role-based navigation and route protection', () => {
  const doctor = ['patient:read', 'patient:write', 'prescription:read', 'prescription:write',
    'prescription:approve', 'lab:write', 'clinical_assistant:use', 'notification:manage'];
  const receptionist = ['patient:read', 'patient:write', 'prescription:read'];
  const patient = ['prescription:read', 'billing:read'];

  test('navigation visibility follows backend permissions', () => {
    assert.equal(canAccessRoute('/patients', doctor), true);
    assert.equal(canAccessRoute('/laboratory', doctor), true);
    assert.equal(canAccessRoute('/pharmacy', doctor), true);
    assert.equal(canAccessRoute('/billing', doctor), false, 'doctor has no billing:read');
    assert.equal(canAccessRoute('/staff', doctor), false, 'staff needs rbac:manage');

    assert.equal(canAccessRoute('/patients', receptionist), true);
    assert.equal(canAccessRoute('/laboratory', receptionist), false);
    assert.equal(canAccessRoute('/billing', receptionist), false);

    assert.equal(canAccessRoute('/patients', patient), false, 'patients do not get the registry');
    assert.equal(canAccessRoute('/billing', patient), true, 'backend grants patient billing:read');
    assert.equal(canAccessRoute('/staff', patient), false);
  });

  test('direct-route protection is fail-closed for missing permissions', () => {
    assert.equal(canAccessRoute('/patients', []), false);
    assert.equal(canAccessRoute('/staff', undefined), false);
    assert.equal(canAccessRoute('/laboratory', null), false);
    assert.equal(canAccessRoute('/billing', ['patient:read']), false);
    assert.equal(canAccessRoute('/dashboard', []), true, 'ungated pages stay reachable');
    assert.equal(canAccessRoute('/patient-relations', []), true);
  });

  test('route matching tolerates query strings, trailing slashes and sub-paths', () => {
    assert.equal(getRequiredPermission('/patients/42'), 'patient:read');
    assert.equal(getRequiredPermission('/patients?page=2'), 'patient:read');
    assert.equal(getRequiredPermission('/laboratory/'), 'lab:write');
    assert.equal(getRequiredPermission('/pharmacy-inventory'), 'prescription:read');
    assert.equal(getRequiredPermission('/dashboard'), null);
    assert.equal(getRequiredPermission(), null);
  });

  test('the policy only references permissions the backend actually defines', () => {
    // Mirrors PERMISSIONS in backend/src/config/roles.js:20-38.
    const backendPermissions = new Set([
      'prescription:read', 'prescription:write', 'prescription:approve',
      'patient:read', 'patient:write',
      'billing:read', 'billing:write', 'billing:approve',
      'pharmacy:dispense', 'lab:write',
      'clinical_assistant:use', 'notification:manage', 'approval:decide',
      'version_history:read', 'version_history:restore', 'rbac:manage', 'biometric:manage',
    ]);
    for (const permission of REQUIRED_PERMISSIONS) {
      assert.ok(backendPermissions.has(permission), `unknown backend permission: ${permission}`);
    }
  });
});
