// backend/tests/securityHardeningPhase2F.test.js
// -----------------------------------------------------------------------------
// Phase 2F — regression suite for the approved hardening phase.
//
//   R1   patient invoice list requires patient:read AND billing:read
//   R2   dev-token least-privilege default + malformed-input refusal
//        (endpoint behavior lives in rbacVerification.test.js §6; the signed
//        token CLAIM edge cases are covered here)
//   R4   dedicated rate limiter on the anonymous biometric verification step
//   R5   /staff frontend policy aligned to the backend's admin ROLE gate
//   R8   approval-request creation requires an action-holding permission
//   Task B   malformed-claims tokens gain nothing
//   Task C   error responses and server logs carry no SQL, paths, stacks
//            or query strings; channel stubs log no contact data
//   Task E   frontend<->backend reconciliation for the three supported
//            portals; no duplicate route can shadow a corrected gate
//   Approval A clinical-role gates on the four staff-breadth endpoints
//            (patient lab list, timeline, report-by-id, prescription
//            version history) incl. the independent portal-record layer
//            and entity-type manipulation attempts
//
// DATABASE-FREE: server.js is never imported. Routers are mounted on
// throwaway express apps (same pattern as rbacVerification.test.js) and
// identity/role resolution runs through the in-memory rbac seam. No request
// in this file reaches a repository query: deny directions terminate in
// middleware, and allow directions are proven at the permission-resolution
// layer or through seam-backed handlers.
// -----------------------------------------------------------------------------
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';

import { authEnv } from '../src/config/authEnv.js';
import { mintDevToken } from '../src/services/keycloakAdapter.service.js';
import * as rbacService from '../src/services/rbac.service.js';
import { PERMISSIONS, ROLES, DEFAULT_ROLE_PERMISSIONS } from '../src/config/roles.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import {
  createBiometricVerifyLimiter,
  biometricVerifyLimiter,
  BIOMETRIC_VERIFY_LIMIT,
  BIOMETRIC_VERIFY_WINDOW_MS,
} from '../src/middleware/rateLimiters.js';
import { verifyAuth } from '../src/controllers/biometric.controller.js';
import { requireRole } from '../src/middleware/authorize.js';
import { requireStaffCaller } from '../src/middleware/recordAccess.js';

import biometricRoutes from '../src/routes/biometric.routes.js';
import rbacRoutes from '../src/routes/rbac.routes.js';
import patientsRoutes from '../src/routes/patients.routes.js';
import prescriptionsRoutes from '../src/routes/prescriptions.routes.js';
import aiAnalysisRoutes from '../src/routes/aiAnalysis.routes.js';
import prescriptionIntegrationRoutes from '../src/routes/prescriptionIntegration.routes.js';
import billingRoutes from '../src/routes/billing.routes.js';
import approvalRoutes from '../src/routes/approval.routes.js';
import labReportsRoutes from '../src/routes/labReports.routes.js';
import versioningRoutes, { requireClinicalPrescriptionHistory } from '../src/routes/versioning.routes.js';

import { canAccessRoute, getRequiredRole, REQUIRED_ROLES } from '../../src/services/navigationPolicy.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(HERE, '..', 'src');
const REPO_DIR = path.resolve(HERE, '..', '..');

const LOCAL_TEST_SECRET = 'phase2f-local-hs256-hardening-secret-not-production';
const UUID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// ---------------------------------------------------------------------------
// In-memory rbac repository (same shape the Phase 2B/2E suites use).
// ---------------------------------------------------------------------------
function createFakeRbacRepo() {
  const users = new Map();
  const userRoles = new Map();
  let seq = 0;
  return {
    users,
    userRoles,
    async findUserBySubject(subject) {
      for (const u of users.values()) if (u.keycloak_subject_id === subject) return u;
      return null;
    },
    async findUserByEmail(email) {
      for (const u of users.values()) if (u.email === email) return u;
      return null;
    },
    async upsertUserFromToken({ subject, email, fullName }) {
      const existing = await this.findUserBySubject(subject);
      if (existing) return existing;
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
    // Empty matrix -> resolvePermissions falls back to config/roles.js defaults.
    async listPermissionsForRoles() { return []; },
    async listRoles() { return []; },
  };
}

// ---------------------------------------------------------------------------
// Deterministic rate-limit store backed by a test-controlled clock.
// Implements the full express-rate-limit v8 Store interface so the limiter's
// own validations stay silent and time never depends on setTimeout.
// ---------------------------------------------------------------------------
function createFakeClockStore(windowMs) {
  let now = 1_000_000;
  const entries = new Map();
  return {
    advance(ms) { now += ms; },
    totalHitsFor(key) { return entries.get(key)?.count ?? 0; },
    totalHitsAll() { let n = 0; for (const e of entries.values()) n += e.count; return n; },
    async init() {},
    async increment(key) {
      const entry = entries.get(key);
      if (!entry || now >= entry.resetAt) {
        entries.set(key, { count: 1, resetAt: now + windowMs });
        return { totalHits: 1, resetTime: new Date(now + windowMs) };
      }
      entry.count += 1;
      return { totalHits: entry.count, resetTime: new Date(entry.resetAt) };
    },
    async decrement(key) {
      const entry = entries.get(key);
      if (entry && entry.count > 0) entry.count -= 1;
    },
    resetKey(key) { entries.delete(key); },
    async shutdown() {},
  };
}

describe('Phase 2F hardening regression (no database)', () => {
  let server;
  let baseUrl;
  let fakeRbac;

  const saved = {
    jwksUri: authEnv.keycloak.jwksUri,
    devJwtSecret: authEnv.devJwtSecret,
    authEnabled: authEnv.authEnabled,
    allowDevTokens: process.env.ALLOW_DEV_TOKENS,
    nodeEnv: process.env.NODE_ENV,
  };

  const restoreEnv = () => {
    authEnv.keycloak.jwksUri = saved.jwksUri;
    authEnv.devJwtSecret = saved.devJwtSecret;
    authEnv.authEnabled = saved.authEnabled;
    if (saved.allowDevTokens === undefined) delete process.env.ALLOW_DEV_TOKENS;
    else process.env.ALLOW_DEV_TOKENS = saved.allowDevTokens;
    if (saved.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.nodeEnv;
  };

  before(async () => {
    authEnv.keycloak.jwksUri = '';
    authEnv.devJwtSecret = LOCAL_TEST_SECRET;
    authEnv.authEnabled = false;
    delete process.env.ALLOW_DEV_TOKENS;

    fakeRbac = createFakeRbacRepo();
    rbacService.__setRepositoryForTests(fakeRbac);

    // Synthetic principals (no real patient information).
    for (const [subject, role] of [
      ['p2f-patient', ROLES.PATIENT],
      ['p2f-doctor', ROLES.DOCTOR],
      ['p2f-desk', ROLES.RECEPTIONIST],
      ['p2f-nurse', ROLES.NURSE],
      ['p2f-clerk', ROLES.BILLING_CLERK],
      ['p2f-auditor', ROLES.AUDITOR],
      ['p2f-admin', ROLES.ADMIN],
      // Privileged roles are never provisioned from a token claim
      // (rbac.service.js NON_PROVISIONABLE_ROLES), so the system principal
      // must be repo-assigned here just like the admin one above.
      ['p2f-system', ROLES.SYSTEM],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const user = await fakeRbac.upsertUserFromToken({ subject, email: `${subject}@synthetic.test`, fullName: subject });
      // eslint-disable-next-line no-await-in-loop
      await fakeRbac.assignRoleToUser(user.id, role);
    }

    const app = express();
    app.use(express.json());
    app.use('/api/patients', patientsRoutes);
    app.use('/api/lab-reports', labReportsRoutes);
    app.use('/api/versions', versioningRoutes);
    app.use('/api/approvals', approvalRoutes);
    app.use('/api/rbac', rbacRoutes);
    app.use('/api/auth', rbacRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    restoreEnv();
    rbacService.__setRepositoryForTests(null);
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  // ---- helpers ------------------------------------------------------------
  const req = async (method, url, { token, body } = {}) => {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(`${baseUrl}${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  const tokenFor = (subject, roles) => mintDevToken({
    subject, email: `${subject}@synthetic.test`, fullName: subject, roles,
  });

  const listen = async (app) => {
    const s = app.listen(0);
    await new Promise((resolve) => s.once('listening', resolve));
    return { server: s, url: `http://127.0.0.1:${s.address().port}` };
  };

  // =========================================================================
  // 1. R1 — the patient invoice list requires billing:read too
  // =========================================================================
  describe('1. R1: GET /api/patients/:patientId/invoices requires billing:read as well', () => {
    test('the gate requires patient:read AND billing:read (static source evidence)', () => {
      const src = fs.readFileSync(path.join(SRC_DIR, 'routes', 'patients.routes.js'), 'utf8');
      const line = src.split('\n').find((l) => l.includes("'/:patientId/invoices'"));
      assert.ok(line, 'the invoice-list route exists');
      assert.ok(
        line.includes('requirePermission(PERMISSIONS.PATIENT_READ, PERMISSIONS.BILLING_READ)'),
        'requirePermission is AND-semantics: both permissions are demanded',
      );
    });

    test('exactly the billing-facing roles resolve to BOTH permissions', async () => {
      const expected = new Map([
        [ROLES.BILLING_CLERK, true], [ROLES.AUDITOR, true], [ROLES.ADMIN, true], [ROLES.SYSTEM, true],
        [ROLES.DOCTOR, false], [ROLES.NURSE, false], [ROLES.LAB_TECHNICIAN, false],
        [ROLES.RECEPTIONIST, false], [ROLES.PATIENT, false],
      ]);
      for (const [role, want] of expected) {
        // eslint-disable-next-line no-await-in-loop
        const perms = await rbacService.resolvePermissions([role]);
        const both = perms.includes(PERMISSIONS.PATIENT_READ) && perms.includes(PERMISSIONS.BILLING_READ);
        assert.equal(both, want, `${role} -> patient:read AND billing:read`);
      }
    });

    for (const [key, subject, role] of [
      ['doctor', 'p2f-doctor', ROLES.DOCTOR],
      ['nurse', 'p2f-nurse', ROLES.NURSE],
      ['receptionist', 'p2f-desk', ROLES.RECEPTIONIST],
      ['patient', 'p2f-patient', ROLES.PATIENT],
    ]) {
      test(`${key} gets 403 on GET /api/patients/:id/invoices (live deny)`, async () => {
        const res = await req('GET', `/api/patients/${UUID}/invoices`, { token: tokenFor(subject, [role]) });
        assert.equal(res.status, 403, `${key} must not read invoice lists`);
        const body = await res.json();
        assert.equal(body.error.code, 'FORBIDDEN');
        assert.match(body.error.message, /Missing required permission/);
      });
    }

    test('the narrowed endpoint is not called by any frontend module (static)', () => {
      const apiDir = path.join(REPO_DIR, 'src', 'api');
      const sources = fs.readdirSync(apiDir).map((f) => fs.readFileSync(path.join(apiDir, f), 'utf8')).join('\n');
      assert.ok(!/patients\/[^'"`]*\/invoices/.test(sources), 'no frontend call to /patients/:id/invoices');
    });
  });

  // =========================================================================
  // 2. R4 — rate limiter wiring (static/runtime structure, no requests yet)
  // =========================================================================
  describe('2. R4: the biometric verify limiter is wired to exactly one route', () => {
    test('the real router attaches the singleton limiter first on /auth/verify only', () => {
      const routeLayers = biometricRoutes.stack.filter((l) => l.route);
      const verify = routeLayers.find((l) => l.route.path === '/auth/verify');
      assert.ok(verify, 'POST /auth/verify exists');
      assert.equal(verify.route.methods.post, true);
      assert.equal(verify.route.stack[0].handle, biometricVerifyLimiter,
        'the strict limiter runs BEFORE validation and the controller');
      assert.ok(verify.route.stack.some((l) => l.handle === verifyAuth), 'the real controller remains the handler');

      for (const layer of routeLayers) {
        if (layer === verify) continue;
        assert.ok(
          !layer.route.stack.some((l) => l.handle === biometricVerifyLimiter),
          `no other biometric route (${layer.route.path}) carries the verify limiter`,
        );
      }
    });

    test('the dev-token endpoint and every other auth route stay outside this limiter', () => {
      const rbacLayers = rbacRoutes.stack.filter((l) => l.route);
      assert.ok(rbacLayers.length > 0, 'rbac routes parsed from the real router');
      for (const layer of rbacLayers) {
        assert.ok(
          !layer.route.stack.some((l) => l.handle === biometricVerifyLimiter),
          `rbac route ${layer.route.path} must not be behind the biometric limiter`,
        );
      }
    });

    test('server.js mounts the global limiter BEFORE the biometric router (no bypass)', () => {
      const src = stripComments(fs.readFileSync(path.join(SRC_DIR, 'server.js'), 'utf8'));
      const globalIdx = src.indexOf("app.use('/api', apiLimiter)");
      const biometricIdx = src.indexOf("app.use('/api/biometric', biometricRoutes)");
      assert.ok(globalIdx > 0, 'the global /api limiter exists');
      assert.ok(biometricIdx > globalIdx, 'the biometric router is mounted AFTER it');
      const verifySrc = fs.readFileSync(path.join(SRC_DIR, 'routes', 'biometric.routes.js'), 'utf8');
      assert.match(verifySrc, /router\.post\('\/auth\/verify',\s*biometricVerifyLimiter,/);
    });

    test('the exported configuration is the documented strict one', () => {
      assert.equal(BIOMETRIC_VERIFY_LIMIT, 10, '10 attempts per window');
      assert.equal(BIOMETRIC_VERIFY_WINDOW_MS, 10 * 60 * 1000, '10-minute window');
      assert.notEqual(createBiometricVerifyLimiter(), biometricVerifyLimiter,
        'the singleton is built once; the factory builds fresh instances (test seam)');
    });
  });

  // =========================================================================
  // 3. R4 — limiter behavior: threshold, status contract, window recovery
  // =========================================================================
  describe('3. R4: limiter threshold, response contract and window recovery', () => {
    const okHandler = (req, res) => res.status(200).json({ ok: true });

    test('exactly the configured number of attempts pass, the next one is 429 (factory defaults)', async () => {
      const app = express();
      app.use(express.json());
      app.post('/verify', createBiometricVerifyLimiter(), okHandler);
      const { server: s, url } = await listen(app);
      try {
        for (let i = 1; i <= BIOMETRIC_VERIFY_LIMIT; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch(`${url}/verify`, { method: 'POST' });
          assert.equal(res.status, 200, `attempt ${i} must pass`);
        }
        const blocked = await fetch(`${url}/verify`, { method: 'POST' });
        assert.equal(blocked.status, 429, 'the attempt over the limit is rejected');
        const body = await blocked.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, 'RATE_LIMITED');
        assert.match(body.error.message, /Too many verification attempts/);
        const header = blocked.headers.get('ratelimit-limit') || blocked.headers.get('ratelimit');
        assert.ok(header, 'standard rate-limit headers are published');
      } finally {
        await new Promise((resolve) => s.close(resolve));
      }
    });

    test('requests are allowed again after the window elapses (deterministic test clock)', async () => {
      const store = createFakeClockStore(60_000);
      const app = express();
      app.use(express.json());
      app.post('/verify', createBiometricVerifyLimiter({ limit: 2, store }), okHandler);
      const { server: s, url } = await listen(app);
      try {
        assert.equal((await fetch(`${url}/verify`, { method: 'POST' })).status, 200);
        assert.equal((await fetch(`${url}/verify`, { method: 'POST' })).status, 200);
        assert.equal((await fetch(`${url}/verify`, { method: 'POST' })).status, 429, 'over the limit inside the window');

        store.advance(60_001); // control the clock — no sleeping
        assert.equal((await fetch(`${url}/verify`, { method: 'POST' })).status, 200,
          'the window rolled over: attempts are allowed again');
      } finally {
        await new Promise((resolve) => s.close(resolve));
      }
    });

    test('the real router keeps counting toward the global limiter (no bypass, live composition)', async () => {
      // Mirrors server.js ordering: a global /api limiter first, then the REAL
      // biometric router (real singleton limiter). Empty bodies stop in the
      // validator — this sequence can never reach the database.
      const globalStore = createFakeClockStore(60_000);
      const globalLimiter = rateLimit({
        windowMs: 60_000, limit: 100, store: globalStore, standardHeaders: true, legacyHeaders: false,
      });
      const app = express();
      app.use(express.json());
      app.use('/api', globalLimiter);
      app.use('/api/biometric', biometricRoutes);
      app.use(errorHandler);
      const { server: s, url } = await listen(app);
      try {
        for (let i = 1; i <= BIOMETRIC_VERIFY_LIMIT; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch(`${url}/api/biometric/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          assert.equal(res.status, 400, `attempt ${i} passes both limiters and dies in the validator`);
          assert.match((await res.json()).error.message, /credentialId/);
        }
        const blocked = await fetch(`${url}/api/biometric/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        assert.equal(blocked.status, 429, 'the strict route limiter rejects attempt 11');
        assert.equal((await blocked.json()).error.code, 'RATE_LIMITED');
        assert.equal(globalStore.totalHitsAll(), BIOMETRIC_VERIFY_LIMIT + 1,
          'the GLOBAL limiter counted every request, including the one the route limiter rejected — no bypass');
      } finally {
        await new Promise((resolve) => s.close(resolve));
      }
    });

    test('the limiter does not interfere with unrelated authentication routes', async () => {
      // No limiter is mounted here — mirroring server.js, where only the
      // global limiter covers /api/auth. Twelve attempts exceed the strict
      // limit; any leak of the biometric limiter onto this router would 429.
      const app = express();
      app.use(express.json());
      app.use('/api/auth', rbacRoutes);
      app.use(errorHandler);
      const { server: s, url } = await listen(app);
      try {
        for (let i = 1; i <= BIOMETRIC_VERIFY_LIMIT + 2; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch(`${url}/api/auth/dev-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roles: [ROLES.DOCTOR] }),
          });
          assert.equal(res.status, 403, `attempt ${i}: dev-token stays gated by config, never by a 429`);
        }
      } finally {
        await new Promise((resolve) => s.close(resolve));
      }
    });
  });

  // =========================================================================
  // 4. R8 — approval-request creation is gated
  // =========================================================================
  describe('4. R8: POST /api/approvals requires an action-holding permission', () => {
    test('the creation route carries requireAnyPermission over the four action permissions (static)', () => {
      const src = stripComments(fs.readFileSync(path.join(SRC_DIR, 'routes', 'approval.routes.js'), 'utf8'));
      const m = /router\.post\('\/',\s*authenticate,\s*requireAnyPermission\(([\s\S]*?)\),\s*validateApprovalCreate/.exec(src);
      assert.ok(m, 'POST / demands requireAnyPermission before validation');
      for (const constant of ['PRESCRIPTION_WRITE', 'BILLING_WRITE', 'LAB_WRITE', 'PHARMACY_DISPENSE']) {
        assert.ok(m[1].includes(`PERMISSIONS.${constant}`), `${constant} is one of the accepted action permissions`);
      }
    });

    test('creation allow-direction equals the roles that hold an action permission', async () => {
      const actionPerms = [
        PERMISSIONS.PRESCRIPTION_WRITE, PERMISSIONS.BILLING_WRITE,
        PERMISSIONS.LAB_WRITE, PERMISSIONS.PHARMACY_DISPENSE,
      ];
      const expected = new Map([
        [ROLES.DOCTOR, true], [ROLES.BILLING_CLERK, true], [ROLES.LAB_TECHNICIAN, true],
        [ROLES.PHARMACIST, true], [ROLES.ADMIN, true], [ROLES.SYSTEM, true],
        [ROLES.PATIENT, false], [ROLES.RECEPTIONIST, false], [ROLES.NURSE, false], [ROLES.AUDITOR, false],
      ]);
      for (const [role, want] of expected) {
        // eslint-disable-next-line no-await-in-loop
        const perms = await rbacService.resolvePermissions([role]);
        assert.equal(actionPerms.some((p) => perms.includes(p)), want, `${role} -> may create approvals`);
      }
    });

    for (const [key, subject, role] of [
      ['patient', 'p2f-patient', ROLES.PATIENT],
      ['receptionist', 'p2f-desk', ROLES.RECEPTIONIST],
      ['nurse', 'p2f-nurse', ROLES.NURSE],
      ['auditor', 'p2f-auditor', ROLES.AUDITOR],
    ]) {
      test(`${key} gets 403 on POST /api/approvals (live deny, before any DB access)`, async () => {
        const res = await req('POST', '/api/approvals', {
          token: tokenFor(subject, [role]),
          body: { entityType: 'prescription', entityId: UUID, action: 'approve' },
        });
        assert.equal(res.status, 403, `${key} must not inject approval-workflow items`);
        assert.equal((await res.json()).error.code, 'FORBIDDEN');
      });
    }
  });

  // =========================================================================
  // 5. R5 + Task E — frontend policy matches backend gates
  // =========================================================================
  describe('5. R5/E: frontend navigation policy and backend gate reconciliation', () => {
    test('/staff is role-gated by admin on the frontend, mirroring requireRole(admin)', () => {
      assert.equal(getRequiredRole('/staff'), 'admin');
      assert.equal(getRequiredRole('/staff/users'), 'admin', 'prefix matching applies');
      assert.equal(getRequiredRole('/patients'), null, 'ordinary routes are not role-gated');
      assert.deepEqual([...REQUIRED_ROLES], ['admin'], 'only the backend role used by rbac.routes.js appears');

      // Only the admin ROLE passes — exactly what requireRole(admin) admits.
      assert.equal(canAccessRoute('/staff', [], ['admin']), true);
      assert.equal(canAccessRoute('/staff', [PERMISSIONS.RBAC_MANAGE], ['system']), false,
        'system holds rbac:manage but the backend role gate rejects it — the UI must not advertise /staff');
      assert.equal(canAccessRoute('/staff', [PERMISSIONS.RBAC_MANAGE], ['doctor']), false);
      assert.equal(canAccessRoute('/staff', [PERMISSIONS.RBAC_MANAGE], undefined), false);
      assert.equal(canAccessRoute('/staff', undefined, ['admin']), true, 'role-gated routes ignore permissions');
    });

    test('App.jsx and Sidebar.jsx forward the backend-issued roles into the policy check (static)', () => {
      const app = fs.readFileSync(path.join(REPO_DIR, 'src', 'App.jsx'), 'utf8');
      assert.ok(app.includes('canAccessRoute(location.pathname, permissions, roles)'), 'RequirePermission forwards roles');
      const sidebar = fs.readFileSync(path.join(REPO_DIR, 'src', 'components', 'layout', 'Sidebar.jsx'), 'utf8');
      assert.ok(sidebar.includes('canAccessRoute(item.to, permissions, roles)'), 'Sidebar forwards roles');
    });

    test('nothing the UI shows for the three portals would 403 at the mapped backend gate', async () => {
      // [frontend route, backend route file, gate permissions, all|any].
      // The static tie below proves the backend routes still carry these
      // constants, so the table cannot silently drift from the sources.
      const MAP = [
        ['/patients', 'patients.routes.js', [PERMISSIONS.PATIENT_READ], 'all'],
        ['/billing', 'billing.routes.js', [PERMISSIONS.BILLING_READ], 'all'],
        ['/laboratory', 'labReports.routes.js', [PERMISSIONS.LAB_WRITE], 'all'],
        ['/pharmacy', 'pharmacy.routes.js', [PERMISSIONS.PHARMACY_DISPENSE, PERMISSIONS.PRESCRIPTION_READ], 'any'],
        ['/prescriptions', 'prescriptions.routes.js', [PERMISSIONS.PRESCRIPTION_READ], 'all'],
      ];
      for (const [, file, gatePerms] of MAP) {
        const src = fs.readFileSync(path.join(SRC_DIR, 'routes', file), 'utf8');
        for (const perm of gatePerms) {
          const constant = Object.entries(PERMISSIONS).find(([, v]) => v === perm)?.[0];
          assert.ok(src.includes(`PERMISSIONS.${constant}`), `${file} still gates on PERMISSIONS.${constant}`);
        }
      }

      for (const role of [ROLES.PATIENT, ROLES.DOCTOR, ROLES.RECEPTIONIST]) {
        // eslint-disable-next-line no-await-in-loop
        const perms = await rbacService.resolvePermissions([role]);
        for (const [uiPath, , gatePerms, mode] of MAP) {
          if (!canAccessRoute(uiPath, perms, [role])) continue;
          const ok = mode === 'all'
            ? gatePerms.every((p) => perms.includes(p))
            : gatePerms.some((p) => perms.includes(p));
          assert.ok(ok, `${role} sees ${uiPath} in the UI but the backend gate would 403 it`);
        }
      }
    });

    test('routes the UI hides for a portal role still deny the direct request (live)', async () => {
      // Hiding a link is cosmetic; the backend gate is the boundary. These are
      // the deny-direction counterparts of the reconciliation above — every
      // request dies in middleware, none reaches a controller. (rbacVerification
      // §3 carries the full 50-cell route×role deny matrix.)
      const patient = tokenFor('p2f-patient', [ROLES.PATIENT]);
      const receptionist = tokenFor('p2f-desk', [ROLES.RECEPTIONIST]);

      // /patients is hidden for the patient portal (no patient:read).
      assert.equal((await req('GET', '/api/patients', { token: patient })).status, 403);
      // /laboratory is hidden for receptionists (no lab:write).
      assert.equal((await req('POST', '/api/lab-reports', { token: receptionist, body: {} })).status, 403);
      // Version history has no UI page at all and is staff-only (no version_history:read).
      assert.equal((await req('GET', `/api/versions/prescription/${UUID}`, { token: patient })).status, 403);
    });

    test('no duplicate route inside a shared mount can shadow a corrected gate', () => {
      const MOUNTED = {
        '/api/prescriptions': [prescriptionsRoutes, aiAnalysisRoutes, prescriptionIntegrationRoutes],
        '/api/invoices': [billingRoutes],
        '/api/billing': [billingRoutes],
        '/api/auth': [rbacRoutes],
        '/api/rbac': [rbacRoutes],
        '/api/patients': [patientsRoutes],
        '/api/lab-reports': [labReportsRoutes],
        '/api/versions': [versioningRoutes],
        '/api/biometric': [biometricRoutes],
        '/api/approvals': [approvalRoutes],
      };
      for (const [mount, routers] of Object.entries(MOUNTED)) {
        const seen = new Set();
        for (const router of routers) {
          for (const layer of router.stack) {
            if (!layer.route) continue;
            for (const [method, enabled] of Object.entries(layer.route.methods)) {
              if (!enabled) continue;
              const key = `${method.toUpperCase()} ${mount}${layer.route.path}`;
              assert.ok(!seen.has(key), `duplicate route ${key}: a second definition could bypass the first gate`);
              seen.add(key);
            }
          }
        }
      }
    });
  });

  // =========================================================================
  // 6. Task B/C — token edge cases and error/log hygiene
  // =========================================================================
  describe('6. B/C: token edge cases, error responses and log hygiene', () => {
    test('a validly signed token with a MALFORMED roles claim gains nothing (403 everywhere)', async () => {
      // jsonwebtoken will sign any claim shape. A roles claim must be an
      // array of strings; anything else must resolve to zero roles rather
      // than becoming roles — and must never crash verification with a 500.
      const malformedClaims = [
        ['roles is a STRING', { realm_access: { roles: 'admin' } }],
        ['roles is an OBJECT', { realm_access: { roles: { admin: true } } }],
        ['roles is a MIXED array', { realm_access: { roles: [42, { admin: true }, null] } }],
        ['roles is a NUMBER', { realm_access: { roles: 7 } }],
      ];
      for (const [label, claim] of malformedClaims) {
        const token = jwt.sign({ sub: 'malformed-roles-1', ...claim }, LOCAL_TEST_SECRET);
        for (const url of ['/api/patients', '/api/rbac/roles', '/api/approvals']) {
          // eslint-disable-next-line no-await-in-loop
          const res = await req('GET', url, { token });
          assert.equal(res.status, 403, `${label} -> ${url} must be under-privileged, never 200/500`);
          // eslint-disable-next-line no-await-in-loop
          const body = await res.json();
          assert.notEqual(body.error?.code, 'INTERNAL_ERROR', `${label} must not crash verification`);
        }
      }
    });

    test('authentication failures never echo the token, secrets or a stack trace', async () => {
      const wrongSecret = jwt.sign({ sub: 'x', realm_access: { roles: [ROLES.DOCTOR] } }, 'not-the-configured-secret');
      for (const token of ['not.a.jwt', wrongSecret]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await req('GET', '/api/patients', { token });
        assert.equal(res.status, 401);
        const text = await res.text();
        assert.ok(!text.includes(token), 'the presented token is never echoed');
        assert.ok(!/Bearer|secret|node_modules|at Object/.test(text), 'no credential material or stack in the 401');
      }
      const forbidden = await req('GET', '/api/rbac/roles', { token: tokenFor('p2f-doctor', [ROLES.DOCTOR]) });
      assert.equal(forbidden.status, 403);
      const ftext = await forbidden.text();
      assert.ok(!/node_modules|at Object/.test(ftext), 'no stack in the 403');
    });

    test('validation failures are authored messages without internals', async () => {
      const res = await req('GET', '/api/patients/not-a-uuid', { token: tokenFor('p2f-doctor', [ROLES.DOCTOR]) });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error.code, 'BAD_REQUEST');
      assert.match(body.error.message, /must be a valid UUID/);
      assert.ok(!JSON.stringify(body).includes('at Object'), 'no stack in the 400');
    });

    test('a 500 leaks no SQL, paths or stack to the client — and its log carries no query string', async () => {
      const originalListRoles = fakeRbac.listRoles;
      fakeRbac.listRoles = async () => { throw new Error('relation "role_permissions" does not exist at character 22'); };
      const captured = [];
      const originalError = console.error;
      console.error = (...args) => { captured.push(args.map(String).join(' ')); };
      try {
        const res = await req('GET', '/api/rbac/roles?q=secret-search-term', { token: tokenFor('p2f-admin', [ROLES.ADMIN]) });
        assert.equal(res.status, 500);
        const text = await res.json();
        assert.equal(text.error.code, 'INTERNAL_ERROR');
        assert.equal(text.error.message, 'An internal error occurred while processing the request');
        assert.ok(
          !/role_permissions|relation|character|SELECT|node_modules|at Object|\/src\//.test(JSON.stringify(text)),
          'no driver detail, SQL, path or stack reaches the client',
        );

        // The server-side log keeps the real reason (debuggability) but never
        // the query string that carried it (task C: PHI in logs).
        const log = captured.join('\n');
        assert.ok(log.includes('role_permissions'), 'the driver detail stays in the server log');
        assert.ok(log.includes('/api/rbac/roles'), 'the path is still logged');
        assert.ok(!log.includes('secret-search-term'), 'query strings never reach the log');
      } finally {
        console.error = originalError;
        fakeRbac.listRoles = originalListRoles;
      }
    });

    test('access and error logs never record query strings (task C, static evidence)', () => {
      const serverSrc = fs.readFileSync(path.join(SRC_DIR, 'server.js'), 'utf8');
      assert.ok(serverSrc.includes("morgan.token('request-path'"), 'a query-stripping morgan token exists');
      const code = stripComments(serverSrc);
      assert.ok(!/morgan\([\s\S]*?:url[\s\S]*?\)/.test(code), 'no :url token in the morgan formats');
      assert.ok(code.includes("(req.originalUrl || '').split('?')[0]"), 'the morgan token strips the query string');

      const eh = fs.readFileSync(path.join(SRC_DIR, 'middleware', 'errorHandler.js'), 'utf8');
      assert.ok(eh.includes("(req.originalUrl || '').split('?')[0]"), 'error logs strip the query string too');
    });

    test('notification channel stubs log no contact data or notification titles (task C)', () => {
      const cases = [
        ['smsChannel.js', /recipient\.phone|title/],
        ['emailChannel.js', /recipient\.email|title/],
        ['pushChannel.js', /title/],
      ];
      for (const [file, forbidden] of cases) {
        const src = fs.readFileSync(path.join(SRC_DIR, 'services', 'notificationChannels', file), 'utf8');
        const loggerLines = src.split('\n').filter((l) => l.includes('logger.')).join('\n');
        assert.ok(loggerLines.length > 0, `${file} still logs channel activity`);
        assert.ok(!forbidden.test(loggerLines), `${file} logger calls must not carry contact data or titles`);
      }
    });
  });

  // =========================================================================
  // 7. Approval A — clinical-role gates on the staff-breadth endpoints
  // =========================================================================
  describe('7. approval A: clinical-role gates on lab reports, timeline and prescription history', () => {
    const LAB_CLINICAL_ROLES = [ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECHNICIAN, ROLES.ADMIN, ROLES.SYSTEM];
    const HISTORY_CLINICAL_ROLES = [
      ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST, ROLES.LAB_TECHNICIAN, ROLES.ADMIN, ROLES.SYSTEM,
    ];
    const DENIED = [
      ['patient', ROLES.PATIENT],
      ['receptionist', ROLES.RECEPTIONIST],
      ['billing_clerk', ROLES.BILLING_CLERK],
      ['auditor', ROLES.AUDITOR],
    ];

    // Direct middleware invocation (no HTTP, no database).
    const callMiddleware = (mw, req) => {
      let error;
      let advanced = false;
      mw(req, {}, (err) => { if (err) error = err; else advanced = true; });
      return { error, advanced };
    };

    test('the four endpoints carry the approved gates and no widened sets (static)', () => {
      const patientsSrc = fs.readFileSync(path.join(SRC_DIR, 'routes', 'patients.routes.js'), 'utf8');
      const labSrc = fs.readFileSync(path.join(SRC_DIR, 'routes', 'labReports.routes.js'), 'utf8');
      const versioningSrc = fs.readFileSync(path.join(SRC_DIR, 'routes', 'versioning.routes.js'), 'utf8');

      // patients: both cross-module views are role-gated; patient:read no
      // longer unlocks either (the invoices row keeps its R1 permission pair).
      const labListLine = patientsSrc.split('\n').find((l) => l.includes("lab-reports'")) ?? '';
      const timelineLine = patientsSrc.split('\n').find((l) => l.includes("timeline'")) ?? '';
      assert.match(labListLine, /requireRole\(\.\.\.PATIENT_CLINICAL_ROLES\)/);
      assert.match(timelineLine, /requireStaffCaller, requireRole\(\.\.\.PATIENT_CLINICAL_ROLES\)/);
      assert.ok(!labListLine.includes('requirePermission'), 'lab list no longer accepts any permission pair');
      assert.ok(!timelineLine.includes('requirePermission'), 'timeline no longer accepts patient:read');

      // report-by-id: clinical roles only — the permission pair is gone.
      const getByIdLine = stripComments(labSrc).split('\n').find((l) => l.includes("router.get('/:id'")) ?? '';
      assert.match(getByIdLine, /requireRole\(\.\.\.LAB_REPORT_CLINICAL_ROLES\)/);
      assert.ok(!getByIdLine.includes('requireAnyPermission'), 'no broad patient:read pair remains');

      // version history: clinical middleware on all three READ routes; the
      // restore route stays on VERSION_HISTORY_RESTORE (admin/system).
      const routeLines = versioningSrc.split('\n').filter((l) => l.startsWith('router.'));
      const getLines = routeLines.filter((l) => l.startsWith('router.get('));
      assert.equal(getLines.length, 3, 'three version read routes exist');
      for (const line of getLines) {
        assert.ok(line.includes('requireClinicalPrescriptionHistory'), `unguarded version read: ${line.slice(0, 60)}`);
      }
      const restoreLine = routeLines.find((l) => l.startsWith('router.post(')) ?? '';
      assert.ok(restoreLine.includes('VERSION_HISTORY_RESTORE'), 'restore keeps its strict permission');
      assert.ok(!restoreLine.includes('requireClinicalPrescriptionHistory'), 'restore left unchanged (admin/system)');

      // The approved role sets — no front-desk/billing/audit/portal role.
      const setBlock = (src, name) => new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(src)?.[1] ?? '';
      const labSet = setBlock(patientsSrc, 'PATIENT_CLINICAL_ROLES') + setBlock(labSrc, 'LAB_REPORT_CLINICAL_ROLES');
      const historySet = setBlock(versioningSrc, 'PRESCRIPTION_HISTORY_ROLES');
      assert.ok(labSet.length > 0 && historySet.length > 0, 'both role sets parsed from source');
      for (const role of ['ROLES.DOCTOR', 'ROLES.NURSE', 'ROLES.LAB_TECHNICIAN', 'ROLES.ADMIN', 'ROLES.SYSTEM']) {
        assert.ok(labSet.includes(role), `lab set contains ${role}`);
        assert.ok(historySet.includes(role), `history set contains ${role}`);
      }
      assert.ok(historySet.includes('ROLES.PHARMACIST'), 'pharmacists keep prescription history access');
      assert.ok(!labSet.includes('ROLES.PHARMACIST'), 'pharmacists stay outside the patient lab views');
      for (const banned of ['RECEPTIONIST', 'BILLING_CLERK', 'AUDITOR', 'PATIENT']) {
        assert.ok(!labSet.includes(banned), `lab set excludes ${banned}`);
        assert.ok(!historySet.includes(banned), `history set excludes ${banned}`);
      }
    });

    test('denied roles and the patient portal get 403 on all four endpoints (live, pre-DB)', async () => {
      for (const [key, role] of DENIED) {
        const token = tokenFor(`p2f-a7-${key}`, [role]);
        for (const url of [
          `/api/patients/${UUID}/lab-reports`,
          `/api/patients/${UUID}/timeline`,
          `/api/lab-reports/${UUID}`,
          `/api/versions/prescription/${UUID}`,
        ]) {
          // eslint-disable-next-line no-await-in-loop
          const res = await req('GET', url, { token });
          assert.equal(res.status, 403, `${key} -> ${url}`);
          // eslint-disable-next-line no-await-in-loop
          assert.equal((await res.json()).error.code, 'FORBIDDEN', `${key} -> ${url} is a gate denial`);
        }
      }
      // Pharmacist: clinical for version history (allow-direction proven by
      // the 400 gate-pass below) but has no place in the patient lab views
      // (it never held patient:read, and the lab set excludes it).
      const pharmacist = tokenFor('p2f-a7-pharmacist', [ROLES.PHARMACIST]);
      for (const url of [
        `/api/patients/${UUID}/lab-reports`,
        `/api/patients/${UUID}/timeline`,
        `/api/lab-reports/${UUID}`,
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await req('GET', url, { token: pharmacist });
        assert.equal(res.status, 403, `pharmacist -> ${url}`);
      }
    });

    test('clinical roles clear every gate and stop in input validation (live, no DB)', async () => {
      // A 400 from validateUuidParam is only reachable AFTER every gate has
      // passed, so it proves the allow-direction without touching the DB.
      // admin/system subjects are repo-provisioned in `before`: privileged
      // roles are deliberately non-provisionable from token claims.
      for (const [key, role, subject] of [
        ['doctor', ROLES.DOCTOR, 'p2f-a7-pass-doctor'],
        ['nurse', ROLES.NURSE, 'p2f-a7-pass-nurse'],
        ['labtechnician', ROLES.LAB_TECHNICIAN, 'p2f-a7-pass-labtech'],
        ['admin', ROLES.ADMIN, 'p2f-admin'],
        ['system', ROLES.SYSTEM, 'p2f-system'],
      ]) {
        const token = tokenFor(subject, [role]);
        for (const url of [
          '/api/patients/not-a-uuid/lab-reports',
          '/api/patients/not-a-uuid/timeline',
          '/api/lab-reports/not-a-uuid',
          '/api/versions/prescription/not-a-uuid',
        ]) {
          // eslint-disable-next-line no-await-in-loop
          const res = await req('GET', url, { token });
          assert.equal(res.status, 400, `${key} -> ${url} passed the gates and reached the UUID validator`);
        }
      }
      const pharmacist = tokenFor('p2f-a7-pharmacist', [ROLES.PHARMACIST]);
      assert.equal((await req('GET', '/api/versions/prescription/not-a-uuid', { token: pharmacist })).status, 400,
        'pharmacist clears the clinical history gate');
    });

    test('entity-type manipulation cannot bypass the prescription gate (live)', async () => {
      const clerk = tokenFor('p2f-clerk', [ROLES.BILLING_CLERK]);
      for (const variant of ['PRESCRIPTION', 'Prescription', 'prescriptions', ' prescription ']) {
        const url = `/api/versions/${encodeURIComponent(variant)}/${UUID}`;
        // eslint-disable-next-line no-await-in-loop
        const res = await req('GET', url, { token: clerk });
        assert.equal(res.status, 403, `entityType "${variant}" stays behind the clinical gate`);
      }
      // Every READ surface of the same history is gated identically.
      for (const suffix of ['/diff', '/1']) {
        // eslint-disable-next-line no-await-in-loop
        const res = await req('GET', `/api/versions/PRESCRIPTION/${UUID}${suffix}`, { token: clerk });
        assert.equal(res.status, 403, `GET .../prescription${suffix} is gated too`);
      }
      // The patient portal stays out even of the raw version endpoints.
      const patient = tokenFor('p2f-patient', [ROLES.PATIENT]);
      assert.equal((await req('GET', `/api/versions/prescription/${UUID}/diff`, { token: patient })).status, 403);
    });

    test('the history gate decides on the normalized entity type (unit, no HTTP)', () => {
      const decide = (entityType, roles) => callMiddleware(
        requireClinicalPrescriptionHistory,
        { params: { entityType }, roles },
      );

      // Every look-alike of "prescription" is gated for non-clinical roles.
      for (const variant of ['prescription', 'PRESCRIPTION', 'Prescription', ' prescription ', 'prescriptions']) {
        const { error, advanced } = decide(variant, [ROLES.BILLING_CLERK]);
        assert.equal(error?.statusCode, 403, `variant "${variant}" denied for a non-clinical role`);
        assert.equal(advanced, false, `variant "${variant}" never advances`);
      }
      // Clinical roles advance.
      for (const role of HISTORY_CLINICAL_ROLES) {
        const { error, advanced } = decide('prescription', [role]);
        assert.equal(error, undefined, `${role} is not blocked`);
        assert.equal(advanced, true, `${role} advances`);
      }
      // Fail closed for a principal with no roles at all.
      assert.equal(decide('prescription', []).error?.statusCode, 403);
      // Other entity types keep their existing authorization (pass through).
      for (const type of ['patient', 'patients', 'invoice', 'dispensation', 'banana']) {
        const { error, advanced } = decide(type, [ROLES.BILLING_CLERK]);
        assert.equal(error, undefined, `${type} is not clinical-gated`);
        assert.equal(advanced, true, `${type} keeps its permission-gate path`);
      }
      // An empty type defers to validateEntityTypeParam's 400 downstream.
      assert.equal(callMiddleware(requireClinicalPrescriptionHistory, { params: {}, roles: [] }).advanced, true);
    });

    test('the portal denial is enforced independently by BOTH layers (unit)', () => {
      // Record layer alone denies the portal (and fails closed for no roles).
      assert.equal(callMiddleware(requireStaffCaller, { roles: [ROLES.PATIENT] }).error?.statusCode, 403);
      assert.equal(callMiddleware(requireStaffCaller, { roles: [] }).error?.statusCode, 403);
      // …while ordinary staff pass THIS layer: auditor's live 403 on the
      // timeline comes from the role gate — two genuinely separate controls.
      for (const roles of [[ROLES.DOCTOR], [ROLES.AUDITOR], [ROLES.BILLING_CLERK]]) {
        const { error, advanced } = callMiddleware(requireStaffCaller, { roles });
        assert.equal(error, undefined, `${roles.join()} passes the record layer`);
        assert.equal(advanced, true);
      }
      // The role gate alone also denies the portal (independent direction).
      const clinicalGate = requireRole(...LAB_CLINICAL_ROLES);
      assert.equal(callMiddleware(clinicalGate, { roles: [ROLES.PATIENT] }).error?.statusCode, 403);
      assert.equal(callMiddleware(clinicalGate, { roles: [ROLES.AUDITOR] }).error?.statusCode, 403);
      assert.equal(callMiddleware(clinicalGate, { roles: [ROLES.NURSE] }).advanced, true);
    });
  });
});
