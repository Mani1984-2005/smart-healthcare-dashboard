// backend/tests/authFailClosed.test.js
// -----------------------------------------------------------------------------
// Phase 2B — authentication fail-closed proofs.
//
// NONE of these tests require PostgreSQL, Docker or network access:
//   * identity/permission resolution goes through the in-memory RBAC seam
//     (__setRepositoryForTests on rbac.service);
//   * record ownership goes through the record-access seam
//     (__setRepositoryForTests on recordAccess.service);
//   * file bytes live in a throwaway directory under os.tmpdir(), outside the
//     repository, removed in after();
//   * token minting/verification uses an explicitly configured local HS256
//     secret (the published insecure fallback secret is now rejected — see
//     services/keycloakAdapter.service.js);
//   * server.js is NEVER imported (importing it starts the app and would open
//     a database connection) — its wiring is asserted statically instead.
//
// Deliberately NOT exercised here because they query PostgreSQL:
//   GET /api/health, GET /api/health/ready, and any list/detail controller that
//   reaches a repository (e.g. GET /api/patients with a valid staff token).
// -----------------------------------------------------------------------------
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

import {
  authEnv, validateAuthConfig, KNOWN_INSECURE_DEV_SECRET,
} from '../src/config/authEnv.js';
import { mintDevToken, verifyAccessToken } from '../src/services/keycloakAdapter.service.js';
import { authenticate, authenticateOptional } from '../src/middleware/auth.js';
import {
  requirePermission, requireRole, requireAnyPermission, requireSelfOrRole,
} from '../src/middleware/authorize.js';
import { PERMISSIONS, ROLES } from '../src/config/roles.js';
import * as rbacService from '../src/services/rbac.service.js';
import * as recordAccessService from '../src/services/recordAccess.service.js';
import { __setUploadRootForTests } from '../src/controllers/files.controller.js';
import patientsRoutes from '../src/routes/patients.routes.js';
import prescriptionsRoutes from '../src/routes/prescriptions.routes.js';
import filesRoutes from '../src/routes/files.routes.js';
import rbacRoutes from '../src/routes/rbac.routes.js';
import healthRoutes from '../src/routes/health.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Explicit local signing secret — the documented development-token
// configuration (JWT_SECRET=<private value>). Never the published default.
const LOCAL_TEST_SECRET = 'phase2b-local-hs256-test-secret-not-for-production';

// Prescription ids (valid UUIDs so they clear validateUuidParam).
const REC_OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REC_UNKNOWN = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const FIXTURE_BYTES = Buffer.from('phase2b-fixture-file-bytes');

// ---------------------------------------------------------------------------
// In-memory RBAC repository (same shape the other hermetic suites use).
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
    // Empty matrix -> resolvePermissions falls back to config/roles.js defaults.
    async listPermissionsForRoles() { return []; },
    async listRoles() { return []; },
  };
}

// In-memory record-access repository: ownership + file locations.
function createFakeRecordRepo() {
  const prescriptions = new Map();
  return {
    prescriptions,
    async findPrescriptionOwnerRow(id) {
      const row = prescriptions.get(id);
      return row ? { id: row.id, user_id: row.user_id } : null;
    },
    async findPrescriptionFileRow(id) {
      const row = prescriptions.get(id);
      return row
        ? { id: row.id, file_path: row.file_path, preprocessed_path: row.preprocessed_path }
        : null;
    },
    async findInvoicePrescriptionRow() { return null; },
  };
}

describe('Phase 2B authentication fail-closed (no database)', () => {
  let server;
  let baseUrl;
  let fakeRbac;
  let fakeRecords;
  let tempRoot;
  let fixtureFile;

  const saved = {
    authEnabled: authEnv.authEnabled,
    jwksUri: authEnv.keycloak.jwksUri,
    devJwtSecret: authEnv.devJwtSecret,
    allowDevTokens: process.env.ALLOW_DEV_TOKENS,
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    devJwtEnv: process.env.DEV_JWT_SECRET,
  };

  const restoreEnv = () => {
    if (saved.allowDevTokens === undefined) delete process.env.ALLOW_DEV_TOKENS;
    else process.env.ALLOW_DEV_TOKENS = saved.allowDevTokens;
    if (saved.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.nodeEnv;
    if (saved.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved.jwtSecret;
    if (saved.devJwtEnv === undefined) delete process.env.DEV_JWT_SECRET;
    else process.env.DEV_JWT_SECRET = saved.devJwtEnv;
    authEnv.keycloak.jwksUri = saved.jwksUri;
  };

  before(async () => {
    // ---- configuration under test ---------------------------------------
    authEnv.keycloak.jwksUri = '';               // local HS256 path only: no network
    authEnv.devJwtSecret = LOCAL_TEST_SECRET;    // explicit secret (approved dev workflow)
    authEnv.authEnabled = false;                 // THE Phase 2A regression configuration
    delete process.env.ALLOW_DEV_TOKENS;         // dev-token endpoint off unless a test opts in

    // ---- seams -----------------------------------------------------------
    fakeRbac = createFakeRbacRepo();
    rbacService.__setRepositoryForTests(fakeRbac);

    fakeRecords = createFakeRecordRepo();
    recordAccessService.__setRepositoryForTests(fakeRecords);

    // ---- fixture OUTSIDE the repository ----------------------------------
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-auth-2b-'));
    fixtureFile = path.join(tempRoot, 'fixture-original.jpg');
    fs.writeFileSync(fixtureFile, FIXTURE_BYTES);
    __setUploadRootForTests(tempRoot);

    // ---- principals ------------------------------------------------------
    const owner = await fakeRbac.upsertUserFromToken({
      subject: 'owner-1', email: 'owner@test.local', fullName: 'Owner Patient',
    });
    await fakeRbac.assignRoleToUser(owner.id, ROLES.PATIENT);

    const other = await fakeRbac.upsertUserFromToken({
      subject: 'other-1', email: 'other@test.local', fullName: 'Other Patient',
    });
    await fakeRbac.assignRoleToUser(other.id, ROLES.PATIENT);

    const doctor = await fakeRbac.upsertUserFromToken({
      subject: 'doc-1', email: 'doc@test.local', fullName: 'Doctor',
    });
    await fakeRbac.assignRoleToUser(doctor.id, ROLES.DOCTOR);

    // Account explicitly flagged inactive in the (fake) users table.
    const disabled = await fakeRbac.upsertUserFromToken({
      subject: 'disabled-1', email: 'disabled@test.local', fullName: 'Disabled Doctor',
    });
    disabled.is_active = false;
    await fakeRbac.assignRoleToUser(disabled.id, ROLES.DOCTOR);

    // Inactive account with NO roles: proves role seeding never runs for it.
    const disabledNoRoles = await fakeRbac.upsertUserFromToken({
      subject: 'disabled-2', email: 'disabled2@test.local', fullName: 'Disabled No Roles',
    });
    disabledNoRoles.is_active = false;

    // Account whose row predates the is_active column (field absent).
    const legacy = await fakeRbac.upsertUserFromToken({
      subject: 'legacy-1', email: 'legacy@test.local', fullName: 'Legacy Doctor',
    });
    await fakeRbac.assignRoleToUser(legacy.id, ROLES.DOCTOR);

    fakeRecords.prescriptions.set(REC_OWNER, {
      id: REC_OWNER, user_id: owner.id, file_path: fixtureFile, preprocessed_path: null,
    });

    // ---- apps under test -------------------------------------------------
    const gatedRouter = express.Router();
    // Deliberately mounted WITHOUT authenticate: proves the permission/role
    // gates no longer fail open when no principal exists.
    gatedRouter.get('/permission', requirePermission(PERMISSIONS.PATIENT_READ), (req, res) => res.json({ ok: true }));
    gatedRouter.get('/role', requireRole(ROLES.ADMIN), (req, res) => res.json({ ok: true }));
    gatedRouter.get('/any', requireAnyPermission(PERMISSIONS.PATIENT_READ), (req, res) => res.json({ ok: true }));
    gatedRouter.get('/self', requireSelfOrRole(() => 'someone-else', ROLES.NURSE), (req, res) => res.json({ ok: true }));

    // The exact same gates BEHIND `authenticate`. Because /api/gated above has
    // no authentication middleware at all, it can only ever prove the DENIAL
    // direction; this router proves the gates still admit a permitted principal
    // once one is resolved (and keep denying an under-privileged one).
    const authedRouter = express.Router();
    authedRouter.use(authenticate);
    authedRouter.get('/permission', requirePermission(PERMISSIONS.PATIENT_READ), (req, res) => res.json({ ok: true }));
    authedRouter.get('/role', requireRole(ROLES.ADMIN), (req, res) => res.json({ ok: true }));
    authedRouter.get('/any', requireAnyPermission(PERMISSIONS.PATIENT_READ), (req, res) => res.json({ ok: true }));
    authedRouter.get('/self', requireSelfOrRole(() => 'someone-else', ROLES.NURSE), (req, res) => res.json({ ok: true }));

    const optionalRouter = express.Router();
    optionalRouter.use(authenticateOptional);
    optionalRouter.get('/probe', (req, res) => res.json({
      user: req.user ?? null,
      roles: req.roles ?? null,
      permissions: req.permissions ?? null,
      authMode: req.authMode ?? null,
    }));

    const app = express();
    app.use(express.json());
    app.use('/api/patients', patientsRoutes);
    app.use('/api/prescriptions', prescriptionsRoutes);
    app.use('/api/files', filesRoutes);
    app.use('/api/auth', rbacRoutes);
    app.use('/api/health', healthRoutes);
    app.use('/api/gated', gatedRouter);
    app.use('/api/authed-gated', authedRouter);
    app.use('/api/optional', optionalRouter);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    authEnv.authEnabled = saved.authEnabled;
    authEnv.devJwtSecret = saved.devJwtSecret;
    restoreEnv();
    rbacService.__setRepositoryForTests(null);
    recordAccessService.__setRepositoryForTests(null);
    __setUploadRootForTests(null);
    if (server) await new Promise((resolve) => server.close(resolve));
    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  // ---- helpers -----------------------------------------------------------
  function get(pathSuffix, token) {
    return fetch(`${baseUrl}${pathSuffix}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  function post(pathSuffix, body, headers = {}) {
    return fetch(`${baseUrl}${pathSuffix}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  function tokenFor(subject, roles) {
    return mintDevToken({ subject, email: `${subject}@test.local`, fullName: subject, roles });
  }

  async function assertUnauthorized(res, label) {
    assert.equal(res.status, 401, label);
    assert.match(res.headers.get('content-type') || '', /application\/json/, label);
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHORIZED', label);
    return body;
  }

  const PROTECTED_GETS = [
    '/api/patients',
    '/api/prescriptions',
    `/api/files/prescriptions/${REC_OWNER}`,
    '/api/auth/me',
  ];

  // =========================================================================
  // 1, 2, 5. Anonymous requests are rejected in BOTH configurations
  // =========================================================================

  test('1. no token + AUTH_ENABLED=false: 401 on every protected endpoint', async () => {
    assert.equal(authEnv.authEnabled, false, 'precondition: fallback-mode configuration');
    for (const url of PROTECTED_GETS) {
      await assertUnauthorized(await get(url), url);
    }
  });

  test('2. no token + AUTH_ENABLED=true: 401 on every protected endpoint', async () => {
    const original = authEnv.authEnabled;
    authEnv.authEnabled = true;
    try {
      for (const url of PROTECTED_GETS) {
        await assertUnauthorized(await get(url), url);
      }
    } finally {
      authEnv.authEnabled = original;
    }
  });

  test('5a. anonymous callers receive no synthetic principal (optional auth stays anonymous)', async () => {
    const res = await get('/api/optional/probe');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user, null, 'no synthetic user');
    assert.deepEqual(body.roles, [], 'no roles');
    assert.deepEqual(body.permissions, [], 'no permissions');
    assert.equal(body.authMode, 'anonymous');
  });

  // =========================================================================
  // 3. Empty / malformed / non-Bearer Authorization headers
  // =========================================================================

  test('3. empty and non-Bearer Authorization headers are never staff identities', async () => {
    const malformed = [
      '',
      'Basic dXNlcjpwYXNzd29yZA==',
      'Token abc123',
      'Digest user=medicare',
      'Bearer',
      'bearer abc123', // scheme is compared case-sensitively; not a Bearer credential
    ];
    for (const value of malformed) {
      const headers = value === '' ? {} : { Authorization: value };

      // On a PROTECTED route every one of these is a hard 401.
      const res = await fetch(`${baseUrl}/api/patients`, { headers });
      await assertUnauthorized(res, `Authorization: "${value}"`);

      // On an OPTIONAL-auth route a present-but-unusable credential is also a
      // hard 401. Only the complete ABSENCE of a header continues anonymously —
      // and that path must yield an empty principal, never a staff one.
      const probe = await fetch(`${baseUrl}/api/optional/probe`, { headers });
      if (value === '') {
        assert.equal(probe.status, 200, 'no header -> continues anonymously');
        const body = await probe.json();
        assert.equal(body.user, null);
        assert.deepEqual(body.roles, []);
        assert.deepEqual(body.permissions, []);
        assert.equal(body.authMode, 'anonymous');
      } else {
        await assertUnauthorized(probe, `optional probe with "${value}"`);
      }
    }
  });

  // =========================================================================
  // 4. Invalid / expired Bearer tokens
  // =========================================================================

  test('4. invalid and expired Bearer tokens return 401 with no fallback identity', async () => {
    const expired = jwt.sign(
      { sub: 'expired-1', realm_access: { roles: [ROLES.DOCTOR] } },
      LOCAL_TEST_SECRET,
      { expiresIn: '-10s' },
    );
    const wrongSecret = jwt.sign({ sub: 'x', realm_access: { roles: [ROLES.DOCTOR] } }, 'another-secret');

    for (const token of ['not.a.jwt', expired, wrongSecret]) {
      const res = await get('/api/patients', token);
      const body = await assertUnauthorized(res, `token=${token.slice(0, 12)}…`);
      assert.ok(!/doctor|receptionist|permission/i.test(body.error.message),
        'a rejected token must not reveal resolved roles or permissions');
    }
  });

  test('4b. an invalid token on the optional-auth route is a hard 401 (no silent downgrade)', async () => {
    await assertUnauthorized(await get('/api/optional/probe', 'not.a.jwt'), 'optional + invalid token');
    assert.equal((await get('/api/optional/probe')).status, 200, 'no header still continues anonymously');
  });

  // =========================================================================
  // 6. Anonymous access to the protected file route returns no bytes
  // =========================================================================

  test('6. anonymous download is 401 while the owner still gets the bytes', async () => {
    assert.ok(fs.existsSync(fixtureFile), 'precondition: fixture exists');

    const anonymous = await get(`/api/files/prescriptions/${REC_OWNER}`);
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get('content-type') || '', /application\/json/,
      'a file response must never be produced without a principal');
    const text = await anonymous.text();
    assert.ok(!text.includes(tempRoot), 'no absolute path disclosure');
    assert.ok(!text.includes('phase2b-fixture-file-bytes'), 'no file bytes');

    const owner = await get(`/api/files/prescriptions/${REC_OWNER}`, tokenFor('owner-1', [ROLES.PATIENT]));
    assert.equal(owner.status, 200, 'the gate must still let the real owner through');
    assert.deepEqual(Buffer.from(await owner.arrayBuffer()), FIXTURE_BYTES);
  });

  // =========================================================================
  // 7. Permission gates no longer fail open without an identity
  // =========================================================================

  test('7. permission/role gates deny an identity-less request (AUTH_ENABLED=false)', async () => {
    assert.equal(authEnv.authEnabled, false, 'precondition: fallback-mode configuration');

    // Gates mounted WITHOUT authenticate: before Phase 2B these called next()
    // whenever AUTH_ENABLED was false and no principal existed, silently
    // publishing the route. They must now deny.
    for (const url of ['/api/gated/permission', '/api/gated/role', '/api/gated/any', '/api/gated/self']) {
      const res = await get(url);
      assert.equal(res.status, 403, `${url} must be denied, not silently allowed`);
      assert.equal((await res.json()).error.code, 'FORBIDDEN');
    }

    // The same gates behind authenticate: anonymous never reaches them...
    for (const url of ['/api/authed-gated/permission', '/api/authed-gated/role', '/api/authed-gated/any', '/api/authed-gated/self']) {
      await assertUnauthorized(await get(url), `${url} without a token`);
    }

    // ...while a permitted principal is admitted and an under-privileged one is
    // still denied — the checks themselves are unchanged, only the presence of a
    // resolved principal differs.
    const doctorToken = tokenFor('doc-1', [ROLES.DOCTOR]);
    assert.equal((await get('/api/authed-gated/permission', doctorToken)).status, 200,
      'doctor holds patient:read via the default role matrix');
    assert.equal((await get('/api/authed-gated/any', doctorToken)).status, 200,
      'the any-of gate admits the same permission');
    assert.equal((await get('/api/authed-gated/role', doctorToken)).status, 403, 'doctor is not an admin');
    assert.equal((await get('/api/authed-gated/self', doctorToken)).status, 403,
      'doctor neither owns the resource nor holds the nurse role');
  });

  // =========================================================================
  // 8. Patient ownership checks remain fail-closed
  // =========================================================================

  test('8. another patient is denied the same prescription (404, no bytes)', async () => {
    const otherToken = tokenFor('other-1', [ROLES.PATIENT]);

    const file = await get(`/api/files/prescriptions/${REC_OWNER}`, otherToken);
    assert.equal(file.status, 404, 'ownership denial uses 404 semantics');
    assert.match(file.headers.get('content-type') || '', /application\/json/);

    const record = await get(`/api/prescriptions/${REC_OWNER}`, otherToken);
    assert.equal(record.status, 404, 'ownership gate runs before the controller (no DB access)');

    const unknown = await get(`/api/files/prescriptions/${REC_UNKNOWN}`, otherToken);
    assert.equal(unknown.status, 404, 'unknown record is indistinguishable from a denied one');
  });

  // =========================================================================
  // 9. Public routes keep working without authentication
  // =========================================================================

  test('9. GET /api/health/live stays public (no auth, no database)', async () => {
    const res = await get('/api/health/live');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'alive');
  });

  test('9b. the root banner route and health router remain authentication-free (static)', () => {
    const serverSrc = fs.readFileSync(path.join(SRC_DIR, 'server.js'), 'utf8');
    assert.ok(serverSrc.includes("app.get('/', (req, res) => {"), 'public banner route still exists');
    assert.ok(!/app\.use\(\s*authenticate\s*\)/.test(serverSrc), 'no global authentication middleware');
    assert.ok(serverSrc.includes("app.use('/api/health', healthRoutes)"), 'health router still mounted publicly');

    const healthSrc = fs.readFileSync(path.join(SRC_DIR, 'routes', 'health.routes.js'), 'utf8');
    assert.ok(!healthSrc.includes('authenticate'), 'health router stays unauthenticated');
    assert.ok(!healthSrc.includes('requirePermission'), 'health router stays unpermissioned');
  });

  // =========================================================================
  // 10. Development-token safeguards
  // =========================================================================

  describe('10. development-token endpoint safeguards', () => {
    after(() => restoreEnv());

    test('disabled by default when ALLOW_DEV_TOKENS is unset', async () => {
      delete process.env.ALLOW_DEV_TOKENS;
      const res = await post('/api/auth/dev-token', { roles: [ROLES.DOCTOR] });
      assert.equal(res.status, 403);
      assert.match((await res.json()).error.message, /ALLOW_DEV_TOKENS/);
    });

    test('privileged roles are never minted, even when explicitly enabled', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      for (const roles of [[ROLES.ADMIN], [ROLES.SYSTEM], [ROLES.DOCTOR, ROLES.ADMIN]]) {
        const res = await post('/api/auth/dev-token', { roles });
        assert.equal(res.status, 400, `roles=${JSON.stringify(roles)}`);
        assert.match((await res.json()).error.message, /Privileged role/);
      }
    });

    test('production and non development/test environments are refused', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      try {
        for (const nodeEnv of ['production', 'staging']) {
          process.env.NODE_ENV = nodeEnv;
          const res = await post('/api/auth/dev-token', { roles: [ROLES.DOCTOR] });
          assert.equal(res.status, 403, `NODE_ENV=${nodeEnv}`);
        }
      } finally {
        restoreEnv();
      }
    });

    test('a configured Keycloak JWKS URI disables local dev tokens', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      authEnv.keycloak.jwksUri = 'https://keycloak.example.test/certs';
      try {
        const res = await post('/api/auth/dev-token', { roles: [ROLES.DOCTOR] });
        assert.equal(res.status, 400);
        assert.match((await res.json()).error.message, /KEYCLOAK_JWKS_URI/);
      } finally {
        authEnv.keycloak.jwksUri = saved.jwksUri;
      }
    });

    test('explicitly enabled local use: mint -> authenticate on a protected route', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      try {
        const mint = await post('/api/auth/dev-token', { subject: 'dev-doctor-1', roles: [ROLES.DOCTOR] });
        assert.equal(mint.status, 200);
        const { accessToken, roles } = (await mint.json()).data;
        assert.deepEqual(roles, [ROLES.DOCTOR]);
        assert.ok(accessToken, 'a token is issued');

        const who = await get('/api/auth/me', accessToken);
        assert.equal(who.status, 200, 'the minted token authenticates');
        const body = await who.json();
        assert.deepEqual(body.data.roles, [ROLES.DOCTOR]);
        assert.equal(body.data.authMode, 'dev-jwt');
        assert.ok(!body.data.permissions.includes(PERMISSIONS.RBAC_MANAGE),
          'a dev-minted doctor never receives admin permissions');
      } finally {
        restoreEnv();
      }
    });
  });

  // =========================================================================
  // 11. JWT signing-secret policy
  // =========================================================================

  describe('11. JWT signing-secret policy', () => {
    test('the published insecure fallback secret is rejected for signing and verification', async () => {
      authEnv.devJwtSecret = KNOWN_INSECURE_DEV_SECRET;
      try {
        assert.throws(
          () => mintDevToken({ subject: 'x', roles: [ROLES.DOCTOR] }),
          (err) => err.statusCode === 403 && /signing is disabled/i.test(err.message),
          'minting with the published secret is refused',
        );

        // A token that WAS signed with the published secret must not verify.
        const forged = jwt.sign(
          { sub: 'forged-doctor', realm_access: { roles: [ROLES.DOCTOR] } },
          KNOWN_INSECURE_DEV_SECRET,
        );
        await assert.rejects(
          () => verifyAccessToken(forged),
          (err) => err.statusCode === 401 && /insecure fallback/i.test(err.message),
        );
        await assertUnauthorized(await get('/api/auth/me', forged),
          'token signed with the published secret');

        // And the endpoint refuses to mint one.
        process.env.ALLOW_DEV_TOKENS = 'true';
        const endpoint = await post('/api/auth/dev-token', { roles: [ROLES.DOCTOR] });
        assert.equal(endpoint.status, 403);
        assert.match((await endpoint.json()).error.message, /JWT_SECRET/);
      } finally {
        authEnv.devJwtSecret = LOCAL_TEST_SECRET;
        restoreEnv();
      }
    });

    test('an explicitly configured local secret signs and verifies as intended', async () => {
      assert.equal(authEnv.devJwtSecret, LOCAL_TEST_SECRET, 'explicit secret in force');
      const token = mintDevToken({ subject: 'explicit-1', roles: [ROLES.DOCTOR] });
      const claims = await verifyAccessToken(token);
      assert.equal(claims.subject, 'explicit-1');
      assert.deepEqual(claims.roles, [ROLES.DOCTOR]);
    });

    test('production startup validation still fails closed on the insecure secret', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalJwt = process.env.JWT_SECRET;
      const originalDev = process.env.DEV_JWT_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        process.env.DEV_JWT_SECRET = KNOWN_INSECURE_DEV_SECRET;
        delete process.env.JWT_SECRET;
        authEnv.keycloak.jwksUri = '';
        assert.throws(
          () => validateAuthConfig(),
          /Production security violation/,
        );
      } finally {
        if (originalEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalEnv;
        if (originalJwt === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalJwt;
        if (originalDev === undefined) delete process.env.DEV_JWT_SECRET;
        else process.env.DEV_JWT_SECRET = originalDev;
      }
    });
  });

  // =========================================================================
  // 12. Deactivated accounts
  // =========================================================================

  describe('12. deactivated accounts cannot authenticate', () => {
    test('an inactive account is rejected with 403 before permissions are resolved', async () => {
      const res = await get('/api/auth/me', tokenFor('disabled-1', [ROLES.DOCTOR]));
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error.code, 'FORBIDDEN');
      assert.match(body.error.message, /deactivated/i);
    });

    test('role seeding never happens for a deactivated account', async () => {
      const token = mintDevToken({ subject: 'disabled-2', roles: [ROLES.DOCTOR] });
      const res = await get('/api/auth/me', token);
      assert.equal(res.status, 403);

      const user = [...fakeRbac.users.values()]
        .find((u) => u.keycloak_subject_id === 'disabled-2');
      assert.ok(user, 'the account exists');
      assert.equal((fakeRbac.userRoles.get(user.id) || new Set()).size, 0,
        'the rejected attempt must not seed roles from the token claims');
    });

    test('an active account and a legacy row without the column still authenticate', async () => {
      assert.equal((await get('/api/auth/me', tokenFor('doc-1', [ROLES.DOCTOR]))).status, 200,
        'active account unaffected');
      assert.equal((await get('/api/auth/me', tokenFor('legacy-1', [ROLES.DOCTOR]))).status, 200,
        'rows without an is_active value stay active');
    });

    test('the check is enforced in the identity service itself (seam-level)', async () => {
      await assert.rejects(
        () => rbacService.getOrProvisionUser({ subject: 'disabled-1', tokenRoles: [ROLES.DOCTOR] }),
        (err) => err.statusCode === 403 && /deactivated/i.test(err.message),
      );

      const ok = await rbacService.getOrProvisionUser({ subject: 'doc-1', tokenRoles: [ROLES.DOCTOR] });
      assert.deepEqual(ok.roles, [ROLES.DOCTOR]);
    });
  });

  // =========================================================================
  // 13. Source-level regression checks
  // =========================================================================

  test('13. the removed bypasses cannot be reintroduced (static source checks)', () => {
    // Scan executable code only: these files carry Phase 2B explanatory comments
    // that quote the very strings we are asserting are gone.
    const readCode = (...parts) => fs.readFileSync(path.join(SRC_DIR, ...parts), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const authSrc = readCode('middleware', 'auth.js');
    assert.ok(!authSrc.includes('DEV_DEFAULT_USER'), 'synthetic dev identity removed');
    assert.ok(!authSrc.includes('RECEPTIONIST'), 'no doctor/receptionist fallback roles');
    assert.ok(!authSrc.includes("'disabled'"), "authMode 'disabled' is no longer produced");
    assert.ok(!authSrc.includes('authEnv.authEnabled'), 'AUTH_ENABLED no longer authorizes anyone');
    assert.ok(authSrc.includes("401, 'UNAUTHORIZED'"), 'the 401 contract is preserved');

    const authorizeSrc = readCode('middleware', 'authorize.js');
    assert.ok(!authorizeSrc.includes('!authEnv.authEnabled'), 'permission gates never fail open');
    assert.ok(!authorizeSrc.includes('authEnv'), 'authorize.js no longer consults AUTH_ENABLED');

    const billingSrc = readCode('routes', 'billing.routes.js');
    assert.ok(!billingSrc.includes('!authEnv.authEnabled'), 'financial dual-control gate never fails open');
    assert.ok(!billingSrc.includes('authEnv'), 'billing routes no longer consult AUTH_ENABLED');

    const rbacServiceSrc = readCode('services', 'rbac.service.js');
    assert.ok(rbacServiceSrc.includes('is_active'), 'deactivated accounts are checked');
  });
});
