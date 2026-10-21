import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';


import { validateAuthConfig, KNOWN_INSECURE_DEV_SECRET, authEnv } from '../backend/src/config/authEnv.js';
import { mintDevToken, verifyAccessToken } from '../backend/src/services/keycloakAdapter.service.js';
import { authenticate } from '../backend/src/middleware/auth.js';
import { requirePermission, requireRole, requireAnyPermission } from '../backend/src/middleware/authorize.js';
import { PERMISSIONS, ROLES } from '../backend/src/config/roles.js';
import * as rbacService from '../backend/src/services/rbac.service.js';
import patientRoutes from '../backend/src/routes/patients.routes.js';
import prescriptionRoutes from '../backend/src/routes/prescriptions.routes.js';
import pharmacyRoutes from '../backend/src/routes/pharmacy.routes.js';
import billingRoutes from '../backend/src/routes/billing.routes.js';
import rbacRoutes from '../backend/src/routes/rbac.routes.js';
import { errorHandler } from '../backend/src/middleware/errorHandler.js';

// Phase 2B: the published insecure fallback secret is no longer accepted for
// signing or verification (backend/src/services/keycloakAdapter.service.js),
// so this suite configures an explicit local secret for every dev token it mints.
const savedDevJwtSecret = authEnv.devJwtSecret;
before(() => { authEnv.devJwtSecret = 'phase4b-root-suite-test-secret-not-for-production'; });
after(() => { authEnv.devJwtSecret = savedDevJwtSecret; });

// -----------------------------------------------------------------------------
// Repository isolation (see also backend/tests/rbacVerification.test.js).
//
// The route tests below exercise the REAL routers and middleware, so
// `authenticate` resolves identity through rbac.service — which, with no
// repository installed, calls the real PostgreSQL-backed repository. Without a
// reachable, credentialed database that lookup fails inside authentication
// (pg SASL error) and every authenticated request returns 500, masking the
// authorization behavior under test. The rbac.service test seam
// (__setRepositoryForTests) swaps in a deterministic in-memory repository for
// this suite only; production code paths always see the real repository.
//
// listPermissionsForRoles() intentionally returns [] so resolvePermissions
// falls back to the documented least-privilege defaults in config/roles.js —
// the same default role permissions production uses on a fresh install — rather
// than a permission set duplicated in this test file.
// -----------------------------------------------------------------------------
function createFakeRbacRepo() {
  const users = new Map();
  const userRoles = new Map();
  let seq = 0;
  return {
    async findUserBySubject(subject) {
      for (const u of users.values()) if (u.keycloak_subject_id === subject) return u;
      return null;
    },
    async findUserByEmail(email) {
      for (const u of users.values()) if (u.email === email) return u;
      return null;
    },
    async upsertUserFromToken({ subject, email, fullName }) {
      seq += 1;
      const user = {
        id: `00000000-0000-0000-0000-0000000000${String(seq).padStart(2, '0')}`,
        keycloak_subject_id: subject,
        email: email || null,
        full_name: fullName || 'User',
      };
      users.set(user.id, user);
      return user;
    },
    async listRolesForUser(userId) { return [...(userRoles.get(userId) || [])]; },
    async assignRoleToUser(userId, roleName) {
      if (!userRoles.has(userId)) userRoles.set(userId, new Set());
      userRoles.get(userId).add(roleName);
      return { name: roleName };
    },
    async revokeRoleFromUser() { return false; },
    async listPermissionsForRoles() { return []; },
    async listRoles() { return []; },
  };
}

describe('Phase 4B Security Remediation Verification Suite', () => {
  describe('1. Production Startup Safety & Fail-Closed Guardrails', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAuthEnabled = process.env.AUTH_ENABLED;
    const originalJwtSecret = process.env.JWT_SECRET;
    const originalDevSecret = process.env.DEV_JWT_SECRET;
    const originalJwks = authEnv.keycloak.jwksUri;

    after(() => {
      process.env.NODE_ENV = originalEnv;
      if (originalAuthEnabled !== undefined) process.env.AUTH_ENABLED = originalAuthEnabled;
      else delete process.env.AUTH_ENABLED;
      if (originalJwtSecret !== undefined) process.env.JWT_SECRET = originalJwtSecret;
      else delete process.env.JWT_SECRET;
      if (originalDevSecret !== undefined) process.env.DEV_JWT_SECRET = originalDevSecret;
      else delete process.env.DEV_JWT_SECRET;
      authEnv.keycloak.jwksUri = originalJwks;
    });

    test('validateAuthConfig fails closed in production when AUTH_ENABLED is false', () => {
      process.env.NODE_ENV = 'production';
      process.env.AUTH_ENABLED = 'false';
      authEnv.keycloak.jwksUri = 'https://keycloak.example.com/realms/medicare/protocol/openid-connect/certs';

      assert.throws(
        () => validateAuthConfig(),
        /Production security violation: AUTH_ENABLED cannot be set to false in production/
      );
    });

    test('validateAuthConfig fails closed in production when using fallback insecure dev secret', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_ENABLED;
      delete process.env.JWT_SECRET;
      process.env.DEV_JWT_SECRET = KNOWN_INSECURE_DEV_SECRET;
      authEnv.keycloak.jwksUri = '';

      assert.throws(
        () => validateAuthConfig(),
        /Production security violation: Production requires a valid KEYCLOAK_JWKS_URI or an explicit, non-default JWT_SECRET/
      );
    });

    test('validateAuthConfig succeeds in production with explicit secure JWT_SECRET', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_ENABLED;
      authEnv.keycloak.jwksUri = '';
      process.env.JWT_SECRET = 'super-secure-production-secret-min-32-chars-long';

      assert.doesNotThrow(() => validateAuthConfig());
    });

    test('validateAuthConfig succeeds in production with valid Keycloak JWKS URI', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_ENABLED;
      delete process.env.JWT_SECRET;
      delete process.env.DEV_JWT_SECRET;
      authEnv.keycloak.jwksUri = 'https://auth.medicare.internal/certs';

      assert.doesNotThrow(() => validateAuthConfig());
    });
  });

  describe('2. Dev-Token Endpoint & Token Minting Production Restrictions', () => {
    test('mintDevToken is strictly rejected in production', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        assert.throws(
          () => mintDevToken({ subject: 'attacker', roles: [ROLES.ADMIN] }),
          /Development token minting is forbidden in production/
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('mintDevToken produces verifiable token in development environment', async () => {
      const token = mintDevToken({
        subject: 'test-doctor-1',
        email: 'doctor@medicare.local',
        fullName: 'Dr. Test',
        roles: [ROLES.DOCTOR],
      });
      assert.ok(typeof token === 'string' && token.length > 20);

      const claims = await verifyAccessToken(token);
      assert.equal(claims.subject, 'test-doctor-1');
      assert.deepEqual(claims.roles, [ROLES.DOCTOR]);
    });
  });

  describe('3. Route Protection & Least-Privilege Role/Permission Checks', () => {
    let server;
    let baseUrl;

    before(async () => {
      // Install the in-memory repository BEFORE accepting requests so identity
      // and permission resolution never touches PostgreSQL in this suite.
      rbacService.__setRepositoryForTests(createFakeRbacRepo());

      const app = express();
      app.use(express.json());
      app.use('/api/patients', patientRoutes);
      app.use('/api/prescriptions', prescriptionRoutes);
      app.use('/api/pharmacy', pharmacyRoutes);
      app.use('/api/billing', billingRoutes);
      app.use('/api/auth', rbacRoutes);
      app.use(errorHandler);

      await new Promise((resolve) => {
        server = app.listen(0, () => {
          const port = server.address().port;
          baseUrl = `http://127.0.0.1:${port}/api`;
          resolve();
        });
      });
    });

    after(async () => {
      // Always restore the real repository — runs even when a test fails, so no
      // repository override leaks beyond this suite.
      rbacService.__setRepositoryForTests(null);
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    test('POST /api/auth/dev-token is rejected in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await fetch(`${baseUrl}/auth/dev-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles: ['admin'] }),
        });
        assert.equal(res.status, 403);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.match(body.error.message, /forbidden in production/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('Unauthenticated request to protected route in production returns 401', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await fetch(`${baseUrl}/patients`);
        assert.equal(res.status, 401);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, 'UNAUTHORIZED');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('PATIENT role is rejected with 403 Forbidden on staff write endpoint', async () => {
      const patientToken = mintDevToken({
        subject: 'patient-42',
        email: 'patient42@test.com',
        fullName: 'Test Patient',
        roles: [ROLES.PATIENT],
      });

      const res = await fetch(`${baseUrl}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({ fullName: 'Unauthorized Test', gender: 'male' }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'FORBIDDEN');
      assert.match(body.error.message, /patient:write/);
    });

    test('PHARMACIST role is rejected with 403 Forbidden on patient write endpoint', async () => {
      const pharmacistToken = mintDevToken({
        subject: 'pharm-1',
        email: 'pharm@test.com',
        fullName: 'Pharmacist One',
        roles: [ROLES.PHARMACIST],
      });

      const res = await fetch(`${baseUrl}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pharmacistToken}`,
        },
        body: JSON.stringify({ fullName: 'Unauthorized Test', gender: 'male' }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    test('DOCTOR role is granted permission to access patient list', async () => {
      const doctorToken = mintDevToken({
        subject: 'dr-1',
        email: 'doctor1@test.com',
        fullName: 'Dr. One',
        roles: [ROLES.DOCTOR],
      });

      const res = await fetch(`${baseUrl}/patients`, {
        headers: {
          Authorization: `Bearer ${doctorToken}`,
        },
      });

      // Authentication and authorization succeed via the in-memory repository
      // (doctor holds patient:read); the request then reaches the controller,
      // whose real patients repository has no database in this hermetic
      // environment, so the response is a 500. The assertions below verify the
      // security property: the doctor is neither rejected (401) nor forbidden
      // (403). Allow-direction status codes are covered by the DB-backed suites.
      assert.notEqual(res.status, 401, 'Should not fail authentication');
      assert.notEqual(res.status, 403, 'Doctor must have patient:read permission');
    });

    test('Non-admin role is rejected on /api/auth/roles admin management endpoint', async () => {
      const doctorToken = mintDevToken({
        subject: 'dr-2',
        roles: [ROLES.DOCTOR],
      });

      const res = await fetch(`${baseUrl}/auth/roles`, {
        headers: {
          Authorization: `Bearer ${doctorToken}`,
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    test('GET /api/auth/me returns caller identity and explicit roles instead of synthetic godmode user', async () => {
      const doctorToken = mintDevToken({
        subject: 'dr-specialist-9',
        email: 'dr.specialist@medicare.local',
        fullName: 'Dr. Specialist',
        roles: [ROLES.DOCTOR],
      });

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${doctorToken}`,
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.deepEqual(body.data.roles, [ROLES.DOCTOR]);
      assert.ok(body.data.permissions.includes(PERMISSIONS.PRESCRIPTION_WRITE));
      assert.ok(!body.data.permissions.includes(PERMISSIONS.RBAC_MANAGE), 'Doctor must not have RBAC_MANAGE permission');
    });
  });
});
