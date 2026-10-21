// backend/tests/securityHardening.test.js
// -----------------------------------------------------------------------------
// Proofs for the focused security fixes. NONE of these tests require
// PostgreSQL or Docker: database-touching paths use the deterministic
// in-memory RBAC repository seam (__setRepositoryForTests), and route tests
// only exercise authorization/validation layers that short-circuit BEFORE
// any database access (or assert explicitly that the failure came from the
// data layer, not from authorization).
// -----------------------------------------------------------------------------
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { authEnv } from '../src/config/authEnv.js';
import { mintDevToken } from '../src/services/keycloakAdapter.service.js';
import { ROLES, PERMISSIONS } from '../src/config/roles.js';
import * as rbacService from '../src/services/rbac.service.js';
import billingRoutes from '../src/routes/billing.routes.js';
import scannerRoutes from '../src/routes/scanner.routes.js';
import approvalRoutes from '../src/routes/approval.routes.js';
import rbacRoutes from '../src/routes/rbac.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import {
  validateInvoiceStatusUpdate,
  validateInvoiceGenerationRequest,
  validateLabReportCreate,
} from '../src/middleware/validate.js';
import { uploadFileFilter, safeExtForMime } from '../src/middleware/upload.js';

// ---------------------------------------------------------------------------
// Helpers
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
    async listRolesForUser(userId) {
      return [...(userRoles.get(userId) || [])];
    },
    async assignRoleToUser(userId, roleName) {
      if (!userRoles.has(userId)) userRoles.set(userId, new Set());
      userRoles.get(userId).add(roleName);
      return { name: roleName };
    },
    async revokeRoleFromUser() { return false; },
    // Empty matrix -> resolvePermissions falls back to documented defaults.
    async listPermissionsForRoles() { return []; },
    async listRoles() { return []; },
  };
}

function runValidator(validator, body) {
  let error = null;
  validator({ body }, {}, (e) => { error = e || null; });
  return error;
}

// ---------------------------------------------------------------------------
// 1. Dev-token endpoint — explicit opt-in + privileged-role rejection
// ---------------------------------------------------------------------------

// Phase 2B: the published insecure fallback secret is no longer accepted for
// signing or verification (services/keycloakAdapter.service.js), so this suite
// configures an explicit local secret for every dev token it mints.
const savedDevJwtSecret = authEnv.devJwtSecret;
before(() => { authEnv.devJwtSecret = 'phase5-security-hardening-test-secret-not-for-production'; });
after(() => { authEnv.devJwtSecret = savedDevJwtSecret; });

describe('Dev-token endpoint gating (no database)', () => {
  let server;
  let baseUrl;
  const savedAllow = process.env.ALLOW_DEV_TOKENS;
  const savedJwks = authEnv.keycloak.jwksUri;

  before(async () => {
    authEnv.keycloak.jwksUri = '';
    const app = express();
    app.use(express.json());
    app.use('/api/auth', rbacRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
        resolve();
      });
    });
  });

  after(async () => {
    if (savedAllow === undefined) delete process.env.ALLOW_DEV_TOKENS;
    else process.env.ALLOW_DEV_TOKENS = savedAllow;
    authEnv.keycloak.jwksUri = savedJwks;
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  test('disabled by default (no ALLOW_DEV_TOKENS) even in development', async () => {
    delete process.env.ALLOW_DEV_TOKENS;
    const res = await fetch(`${baseUrl}/dev-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: [ROLES.DOCTOR] }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error.message, /ALLOW_DEV_TOKENS/);
  });

  test('privileged roles can never be minted, even when explicitly enabled', async () => {
    process.env.ALLOW_DEV_TOKENS = 'true';
    for (const privileged of [[ROLES.ADMIN], [ROLES.SYSTEM], [ROLES.DOCTOR, ROLES.ADMIN]]) {
      const res = await fetch(`${baseUrl}/dev-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: privileged }),
      });
      assert.equal(res.status, 400, `roles=${JSON.stringify(privileged)}`);
      const body = await res.json();
      assert.match(body.error.message, /Privileged role/);
    }
  });

  test('a non-privileged token still mints and verifies when explicitly enabled', async () => {
    process.env.ALLOW_DEV_TOKENS = 'true';
    const res = await fetch(`${baseUrl}/dev-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'hc-doctor-1', roles: [ROLES.DOCTOR] }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.accessToken);
    assert.deepEqual(body.data.roles, [ROLES.DOCTOR]);
  });
});

// ---------------------------------------------------------------------------
// 2. RBAC service — role provisioning policy & fail-closed DB behavior
// ---------------------------------------------------------------------------

describe('RBAC provisioning policy (no database)', () => {
  test('filterProvisionableRoles strips privileged roles and junk', () => {
    assert.deepEqual(
      rbacService.filterProvisionableRoles([ROLES.ADMIN, ROLES.DOCTOR, ROLES.SYSTEM, ' nurse ', '', null, 42]),
      [ROLES.DOCTOR, 'nurse'],
    );
    assert.deepEqual(rbacService.filterProvisionableRoles(undefined), []);
    assert.deepEqual(rbacService.filterProvisionableRoles('doctor'), []);
  });

  test('getOrProvisionUser never seeds admin/system from token claims', async () => {
    const fake = createFakeRbacRepo();
    rbacService.__setRepositoryForTests(fake);
    try {
      const { roles } = await rbacService.getOrProvisionUser({
        subject: 'kc-1',
        email: 'a@example.com',
        fullName: 'A',
        tokenRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.SYSTEM],
      });
      assert.deepEqual(roles, [ROLES.DOCTOR]);
      for (const assigned of fake.userRoles.values()) {
        assert.ok(!assigned.has(ROLES.ADMIN), 'admin must never be auto-provisioned');
        assert.ok(!assigned.has(ROLES.SYSTEM), 'system must never be auto-provisioned');
      }
    } finally {
      rbacService.__setRepositoryForTests(null);
    }
  });

  test('identity resolution fails loudly on database errors (no fabricated user)', async () => {
    const failing = {
      ...createFakeRbacRepo(),
      async findUserBySubject() { throw new Error('db down'); },
    };
    rbacService.__setRepositoryForTests(failing);
    try {
      await assert.rejects(
        () => rbacService.getOrProvisionUser({ subject: 'kc-2', tokenRoles: [ROLES.DOCTOR] }),
        /db down/,
      );
    } finally {
      rbacService.__setRepositoryForTests(null);
    }
  });

  test('resolvePermissions fails loudly on database errors (no silent default grant)', async () => {
    const failing = {
      ...createFakeRbacRepo(),
      async listPermissionsForRoles() { throw new Error('matrix down'); },
    };
    rbacService.__setRepositoryForTests(failing);
    try {
      await assert.rejects(() => rbacService.resolvePermissions([ROLES.DOCTOR]), /matrix down/);
    } finally {
      rbacService.__setRepositoryForTests(null);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Route-level authorization gates (in-memory RBAC seam, no database)
// ---------------------------------------------------------------------------

describe('Authorization gates on financial, scanner and approval routes (no database)', () => {
  let server;
  let baseUrl;
  let fake;
  const savedAuthEnabled = authEnv.authEnabled;

  before(async () => {
    fake = createFakeRbacRepo();
    rbacService.__setRepositoryForTests(fake);
    // Pre-provision an admin the way it happens in reality: through the
    // RBAC admin API (never through token claims — those are filtered).
    const adminUser = await fake.upsertUserFromToken({ subject: 'preseed-admin', fullName: 'Preseed Admin' });
    await fake.assignRoleToUser(adminUser.id, ROLES.ADMIN);
    // Route tests run with authentication active so real tokens are required.
    authEnv.authEnabled = true;

    const app = express();
    app.use(express.json());
    app.use('/api/auth', rbacRoutes);
    app.use('/api/billing', billingRoutes);
    app.use('/api/scanner', scannerRoutes);
    app.use('/api/approvals', approvalRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    authEnv.authEnabled = savedAuthEnabled;
    rbacService.__setRepositoryForTests(null);
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  function tokenFor(subject, roles) {
    return mintDevToken({ subject, email: `${subject}@test.local`, fullName: subject, roles });
  }

  test('billing:write alone cannot move an invoice to "paid" (403, before any DB access)', async () => {
    const token = tokenFor('clerk-1', [ROLES.BILLING_CLERK]);
    const res = await fetch(`${baseUrl}/billing/00000000-0000-0000-0000-000000000099/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid', amountPaid: 100 }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error.message, /billing:approve/);
  });

  test('billing:write alone cannot void or refund (403)', async () => {
    const token = tokenFor('clerk-2', [ROLES.BILLING_CLERK]);
    for (const status of ['void', 'refunded', 'partially_paid']) {
      const res = await fetch(`${baseUrl}/billing/00000000-0000-0000-0000-000000000099/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      assert.equal(res.status, 403, `status=${status}`);
    }
  });

  test('billing:approve holder passes the gate (failure beyond it is the DB layer, not authorization)', async () => {
    const token = tokenFor('preseed-admin', [ROLES.ADMIN]);
    const res = await fetch(`${baseUrl}/billing/00000000-0000-0000-0000-000000000099/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid' }),
    });
    // No database in this environment: the request may fail at the data
    // layer, but it must NOT be rejected by the authorization gate.
    assert.notEqual(res.status, 403);
    assert.notEqual(res.status, 401);
  });

  test('negative amountPaid is rejected by validation (400, before any DB access)', async () => {
    const token = tokenFor('clerk-3', [ROLES.BILLING_CLERK]);
    const res = await fetch(`${baseUrl}/billing/00000000-0000-0000-0000-000000000099/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid', amountPaid: -5 }),
    });
    assert.equal(res.status, 400);
  });

  test('QR lookup (full patient PHI) requires patient:read (403 for patient role)', async () => {
    const token = tokenFor('portal-1', [ROLES.PATIENT]);
    const res = await fetch(`${baseUrl}/scanner/qr/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: 'pat_deadbeef' }),
    });
    assert.equal(res.status, 403);
  });

  test('approval request with an unknown requiredRole is rejected (400, before any DB access)', async () => {
    const token = tokenFor('doc-appr', [ROLES.DOCTOR]);
    const res = await fetch(`${baseUrl}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        entityType: 'invoice',
        entityId: '00000000-0000-0000-0000-000000000099',
        action: 'void_invoice',
        requiredRole: 'made-up-role',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error.message, /Unknown requiredRole/);
  });

  test('approval detail endpoint requires approval:decide (403 for patient role)', async () => {
    const token = tokenFor('portal-2', [ROLES.PATIENT]);
    const res = await fetch(`${baseUrl}/approvals/00000000-0000-0000-0000-000000000099`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
  });
});

// ---------------------------------------------------------------------------
// 4. Validators — financial inputs and lab values are bounded
// ---------------------------------------------------------------------------

describe('Input validation hardening (pure functions)', () => {
  test('invoice generation: taxRate must be within [0, 1]', () => {
    assert.equal(runValidator(validateInvoiceGenerationRequest, { taxRate: 0.18 }), null);
    assert.equal(runValidator(validateInvoiceGenerationRequest, { taxRate: 0 }), null);
    assert.equal(runValidator(validateInvoiceGenerationRequest, {}), null);
    assert.match(runValidator(validateInvoiceGenerationRequest, { taxRate: -0.9 }).message, /taxRate/);
    assert.match(runValidator(validateInvoiceGenerationRequest, { taxRate: 1.5 }).message, /taxRate/);
    assert.match(runValidator(validateInvoiceGenerationRequest, { taxRate: 'abc' }).message, /taxRate/);
  });

  test('invoice generation: dueInDays must be an integer in [1, 365]', () => {
    assert.equal(runValidator(validateInvoiceGenerationRequest, { dueInDays: 30 }), null);
    assert.match(runValidator(validateInvoiceGenerationRequest, { dueInDays: 0 }).message, /dueInDays/);
    assert.match(runValidator(validateInvoiceGenerationRequest, { dueInDays: 366 }).message, /dueInDays/);
    assert.match(runValidator(validateInvoiceGenerationRequest, { dueInDays: 'abc' }).message, /dueInDays/);
    assert.match(runValidator(validateInvoiceGenerationRequest, { dueInDays: 1.5 }).message, /dueInDays/);
  });

  test('invoice generation: force must be a boolean', () => {
    assert.equal(runValidator(validateInvoiceGenerationRequest, { force: true }), null);
    assert.match(runValidator(validateInvoiceGenerationRequest, { force: 'yes' }).message, /force/);
  });

  test('invoice status update: amountPaid must be a non-negative finite number', () => {
    assert.equal(runValidator(validateInvoiceStatusUpdate, { status: 'paid', amountPaid: 10.5 }), null);
    assert.match(runValidator(validateInvoiceStatusUpdate, { amountPaid: -1 }).message, /amountPaid/);
    assert.match(runValidator(validateInvoiceStatusUpdate, { amountPaid: 'abc' }).message, /amountPaid/);
    assert.match(runValidator(validateInvoiceStatusUpdate, { amountPaid: Infinity }).message, /amountPaid/);
  });

  test('lab report: resultValue must fit VARCHAR(50)', () => {
    const base = { patientId: '00000000-0000-0000-0000-000000000099', testName: 'CBC', resultValue: 'ok' };
    assert.equal(runValidator(validateLabReportCreate, base), null);
    assert.equal(runValidator(validateLabReportCreate, { ...base, resultValue: 'x'.repeat(50) }), null);
    assert.match(runValidator(validateLabReportCreate, { ...base, resultValue: 'x'.repeat(51) }).message, /50 characters/);
  });
});

// ---------------------------------------------------------------------------
// 5. Upload pipeline — stored extension comes from the mime type, not the client
// ---------------------------------------------------------------------------

describe('Upload hardening (pure functions)', () => {
  test('disallowed mime types are rejected with 415', () => {
    let error = null;
    uploadFileFilter({}, { mimetype: 'text/html' }, (e) => { error = e; });
    assert.ok(error);
    assert.equal(error.statusCode, 415);
  });

  test('allowed mime types pass the filter', () => {
    for (const mimetype of ['image/jpeg', 'image/png', 'application/pdf']) {
      let error = 'not-called';
      uploadFileFilter({}, { mimetype }, (e) => { error = e; });
      assert.equal(error, null, mimetype);
    }
  });

  test('stored extension is derived from the mime type only (kills .html upload vector)', () => {
    assert.equal(safeExtForMime('image/jpeg'), '.jpg');
    assert.equal(safeExtForMime('application/pdf'), '.pdf');
    assert.equal(safeExtForMime('text/html'), '', 'unknown types get no extension');
  });
});
