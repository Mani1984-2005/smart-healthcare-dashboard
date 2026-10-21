// backend/tests/filesRoutes.test.js
// -----------------------------------------------------------------------------
// Phase 5 protected file-download proofs. NONE of these tests require
// PostgreSQL, Docker or network access:
//   * identity/permission resolution goes through the in-memory RBAC seam
//     (__setRepositoryForTests on rbac.service);
//   * record ownership + file locations go through the record-access seam
//     (__setRepositoryForTests on recordAccess.service) — the SAME service the
//     route's requirePrescriptionAccess middleware calls, so an "owner" or
//     "denied" fixture here is a real data-layer decision, not a mocked reply
//     from the controller;
//   * file bytes live in a throwaway directory under os.tmpdir(), outside the
//     repository, and are removed in after(). The real upload directory is
//     never written to;
//   * server.js is never imported (importing it starts the app and would
//     attempt a database connection) — its wiring is asserted statically.
// -----------------------------------------------------------------------------
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { authEnv } from '../src/config/authEnv.js';
import { mintDevToken } from '../src/services/keycloakAdapter.service.js';
import { ROLES } from '../src/config/roles.js';
import * as rbacService from '../src/services/rbac.service.js';
import * as recordAccessService from '../src/services/recordAccess.service.js';
import filesRoutes from '../src/routes/files.routes.js';
import { sendPrescriptionFile } from '../src/controllers/files.controller.js';
import { __setUploadRootForTests } from '../src/controllers/files.controller.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { UPLOAD_ROOT_DIR } from '../src/middleware/upload.js';

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Prescription ids (valid UUIDs — they must pass validateUuidParam).
const REC_OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REC_NO_FILE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const REC_OUTSIDE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const REC_TRAVERSAL = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const REC_SYMLINK = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const REC_MISSING = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const ORIGINAL_BYTES = Buffer.from('phase5-original-fixture-bytes');
const PREPROCESSED_BYTES = Buffer.from('phase5-preprocessed-fixture-bytes');
const OUTSIDE_BYTES = Buffer.from('phase5-outside-root-secret');

// ---------------------------------------------------------------------------
// In-memory RBAC repository (same shape the security suites already use).
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

// ---------------------------------------------------------------------------
// In-memory record-access repository: the ownership + file-location source.
// ---------------------------------------------------------------------------
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

describe('Phase 5 authorized prescription-file downloads (no database)', () => {
  let server;
  let baseUrl;
  let fakeRbac;
  let fakeRecords;
  let ownerId;

  let tempRoot;
  let outsideDir;
  let originalFile;
  let preprocessedFile;
  let outsideFile;
  let symlinkFile = null;
  let symlinkSupported = false;

  const savedAuthEnabled = authEnv.authEnabled;
  const savedJwks = authEnv.keycloak.jwksUri;
  // Phase 2B: the published insecure fallback secret is no longer accepted for
  // signing or verification, so suites that mint dev tokens must configure an
  // explicit local secret (see services/keycloakAdapter.service.js).
  const savedDevJwtSecret = authEnv.devJwtSecret;

  before(async () => {
    // ---- throwaway files OUTSIDE the repository -------------------------
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-files-root-'));
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-files-outside-'));
    originalFile = path.join(tempRoot, 'fixture-original.jpg');
    preprocessedFile = path.join(tempRoot, 'fixture-preprocessed.png');
    outsideFile = path.join(outsideDir, 'outside-root.jpg');
    fs.writeFileSync(originalFile, ORIGINAL_BYTES);
    fs.writeFileSync(preprocessedFile, PREPROCESSED_BYTES);
    fs.writeFileSync(outsideFile, OUTSIDE_BYTES);

    symlinkFile = path.join(tempRoot, 'fixture-link.jpg');
    try {
      fs.symlinkSync(outsideFile, symlinkFile, 'file');
      symlinkSupported = true;
    } catch {
      // Windows without developer mode / admin cannot create symlinks.
      symlinkSupported = false;
      symlinkFile = null;
    }

    // ---- seams -----------------------------------------------------------
    fakeRbac = createFakeRbacRepo();
    rbacService.__setRepositoryForTests(fakeRbac);

    fakeRecords = createFakeRecordRepo();
    recordAccessService.__setRepositoryForTests(fakeRecords);

    __setUploadRootForTests(tempRoot);

    // Two patient-portal principals: one owns the record, one does not.
    const owner = await fakeRbac.upsertUserFromToken({
      subject: 'owner-1', email: 'owner@test.local', fullName: 'Owner Patient',
    });
    await fakeRbac.assignRoleToUser(owner.id, ROLES.PATIENT);
    ownerId = owner.id;

    const intruder = await fakeRbac.upsertUserFromToken({
      subject: 'intruder-1', email: 'intruder@test.local', fullName: 'Other Patient',
    });
    await fakeRbac.assignRoleToUser(intruder.id, ROLES.PATIENT);

    const labTech = await fakeRbac.upsertUserFromToken({
      subject: 'lab-1', email: 'lab@test.local', fullName: 'Lab Tech',
    });
    await fakeRbac.assignRoleToUser(labTech.id, ROLES.LAB_TECHNICIAN);

    const doctor = await fakeRbac.upsertUserFromToken({
      subject: 'doc-1', email: 'doc@test.local', fullName: 'Doctor',
    });
    await fakeRbac.assignRoleToUser(doctor.id, ROLES.DOCTOR);

    // ---- records ----------------------------------------------------------
    fakeRecords.prescriptions.set(REC_OWNER, {
      id: REC_OWNER, user_id: ownerId,
      file_path: originalFile, preprocessed_path: preprocessedFile,
    });
    fakeRecords.prescriptions.set(REC_NO_FILE, {
      id: REC_NO_FILE, user_id: ownerId, file_path: null, preprocessed_path: null,
    });
    fakeRecords.prescriptions.set(REC_OUTSIDE, {
      id: REC_OUTSIDE, user_id: ownerId,
      file_path: outsideFile, preprocessed_path: outsideFile,
    });
    fakeRecords.prescriptions.set(REC_TRAVERSAL, {
      id: REC_TRAVERSAL, user_id: ownerId,
      // real file, but only reachable through an escaping ".." segment
      file_path: path.join(tempRoot, '..', path.basename(outsideDir), path.basename(outsideFile)),
      preprocessed_path: null,
    });
    if (symlinkSupported) {
      fakeRecords.prescriptions.set(REC_SYMLINK, {
        id: REC_SYMLINK, user_id: ownerId,
        file_path: symlinkFile, preprocessed_path: null,
      });
    }

    // ---- route under test (real router, real middleware chain) ------------
    authEnv.keycloak.jwksUri = ''; // dev-JWT path only: no network, ever
    authEnv.authEnabled = true;    // unauthenticated -> 401, no staff fallback
    // Phase 2B: mint/verify requires an explicitly configured local secret.
    authEnv.devJwtSecret = 'phase1-files-routes-test-secret-not-for-production';

    const app = express();
    app.use(express.json());
    app.use('/api/files', filesRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api/files`;
        resolve();
      });
    });
  });

  after(async () => {
    authEnv.authEnabled = savedAuthEnabled;
    authEnv.keycloak.jwksUri = savedJwks;
    authEnv.devJwtSecret = savedDevJwtSecret;
    rbacService.__setRepositoryForTests(null);
    recordAccessService.__setRepositoryForTests(null);
    __setUploadRootForTests(null);
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const dir of [tempRoot, outsideDir]) {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function tokenFor(subject, roles) {
    return mintDevToken({ subject, email: `${subject}@test.local`, fullName: subject, roles });
  }

  function get(pathSuffix, token) {
    // The router exposes /prescriptions/:id and /prescriptions/:id/preprocessed
    return fetch(`${baseUrl}/prescriptions${pathSuffix}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  async function assertNoPathDisclosure(res) {
    const text = await res.text();
    for (const secret of [tempRoot, outsideDir, process.cwd(), UPLOAD_ROOT_DIR]) {
      if (!secret) continue;
      assert.ok(!text.includes(secret), `response leaked an absolute path: ${secret}`);
    }
    return text;
  }

  // -------------------------------------------------------------------------
  // A. Module + wiring (no server.js import, no database)
  // -------------------------------------------------------------------------

  test('route module and controller dependencies import successfully', async () => {
    // The static import above already loaded files.routes.js -> files.controller.js
    // -> recordAccess.service; if that chain were broken the file would not run.
    assert.equal(typeof filesRoutes, 'function', 'files.routes.js must default-export a Router');
    assert.equal(typeof sendPrescriptionFile, 'function', 'controller must export the factory');
    const controller = await import('../src/controllers/files.controller.js');
    assert.equal(typeof controller.sendPrescriptionFile, 'function');
    assert.equal(typeof controller.__setUploadRootForTests, 'function');
  });

  test('route chain exposes exactly the two download endpoints', () => {
    const paths = filesRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path)
      .sort();
    assert.deepEqual(paths, ['/prescriptions/:id', '/prescriptions/:id/preprocessed']);
  });

  test('server.js wires fileRoutes and keeps public static /uploads removed', () => {
    const serverSrc = fs.readFileSync(path.join(SRC_DIR, 'server.js'), 'utf8');
    assert.match(serverSrc, /import\s+fileRoutes\s+from\s+'\.\/routes\/files\.routes\.js'/,
      'server.js must import the binding it mounts');
    assert.ok(serverSrc.includes("app.use('/api/files', fileRoutes)"),
      'the protected files mount must remain');
    assert.ok(!serverSrc.includes('express.static'),
      'public static serving must stay removed');
    assert.ok(!serverSrc.includes("app.use('/uploads'"),
      'no public /uploads mount may be restored');
  });

  test('serializer emits protected /api/files URLs keyed by the prescription id', () => {
    const src = fs.readFileSync(path.join(SRC_DIR, 'controllers', 'prescriptions.controller.js'), 'utf8');
    assert.ok(src.includes('`/api/files/prescriptions/${row.id}`'), 'fileUrl must use the protected route');
    assert.ok(src.includes('`/api/files/prescriptions/${row.id}/preprocessed`'), 'preprocessedUrl must use the protected route');
    assert.ok(!src.includes('toPublicPath('), 'legacy /uploads URL builder must no longer be used');
    assert.ok(src.includes('fileUrl:') && src.includes('preprocessedUrl:'), 'field names must not change');
  });

  // -------------------------------------------------------------------------
  // B. Gate behaviour through the REAL route chain
  // -------------------------------------------------------------------------

  test('unauthenticated download is 401 (no database)', async () => {
    const res = await get(`/${REC_OWNER}`);
    assert.equal(res.status, 401);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    await assertNoPathDisclosure(res);
  });

  test('a role without prescription:read is rejected with 403 (no database)', async () => {
    const token = tokenFor('lab-1', [ROLES.LAB_TECHNICIAN]);
    const res = await get(`/${REC_OWNER}`, token);
    assert.equal(res.status, 403);
    const text = await assertNoPathDisclosure(res);
    assert.match(text, /prescription:read/);
  });

  test('a non-UUID prescription id is rejected with 400 before any lookup', async () => {
    const token = tokenFor('doc-1', [ROLES.DOCTOR]);
    const res = await get('/not-a-uuid', token);
    assert.equal(res.status, 400);
    await assertNoPathDisclosure(res);
  });

  test('missing record yields a generic 404 without path disclosure', async () => {
    const token = tokenFor('owner-1', [ROLES.PATIENT]);
    const res = await get(`/${REC_MISSING}`, token);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const text = await assertNoPathDisclosure(res);
    // The route-level ownership gate answers with its own generic 404 wording;
    // either wording is acceptable as long as it discloses nothing.
    assert.match(text, /not found/i);
    assert.ok(!/stack|sql|postgres/i.test(text), 'no database details may leak');
  });

  // -------------------------------------------------------------------------
  // C. Ownership: decided by the record-access service (data layer), enforced
  //    by requirePrescriptionAccess in the route — the controller never runs.
  // -------------------------------------------------------------------------

  test('a non-owner patient is denied even though the file exists on disk', async () => {
    // REC_OWNER's fixture is a real, reachable file inside the configured root;
    // if ownership were not enforced this request would return 200 + bytes.
    assert.ok(fs.existsSync(originalFile), 'precondition: fixture exists');

    const token = tokenFor('intruder-1', [ROLES.PATIENT]);
    const res = await get(`/${REC_OWNER}`, token);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/json/,
      'denial must not stream file bytes');
    const text = await assertNoPathDisclosure(res);
    assert.match(text, /not found/i);
  });

  test('the authorized owner receives the original file with hardened headers', async () => {
    const token = tokenFor('owner-1', [ROLES.PATIENT]);
    const res = await get(`/${REC_OWNER}`, token);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/jpeg');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('content-security-policy') || '', /sandbox/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('content-disposition'), 'inline');

    const body = Buffer.from(await res.arrayBuffer());
    assert.deepEqual(body, ORIGINAL_BYTES, 'bytes must match the fixture exactly');
    assert.ok(!body.toString('latin1').includes(tempRoot), 'no absolute path in the payload');
  });

  test('the authorized owner receives the preprocessed variant', async () => {
    const token = tokenFor('owner-1', [ROLES.PATIENT]);
    const res = await get(`/${REC_OWNER}/preprocessed`, token);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    const body = Buffer.from(await res.arrayBuffer());
    assert.deepEqual(body, PREPROCESSED_BYTES);
  });

  // -------------------------------------------------------------------------
  // D. Path safety
  // -------------------------------------------------------------------------

  test('a record with no stored path is denied (no fallback to the other file)', async () => {
    const token = tokenFor('owner-1', [ROLES.PATIENT]);

    const original = await get(`/${REC_NO_FILE}`, token);
    assert.equal(original.status, 404);
    assert.match(original.headers.get('content-type') || '', /application\/json/,
      'denial must come from the API, not from a static file server');
    await assertNoPathDisclosure(original);

    const preprocessed = await get(`/${REC_NO_FILE}/preprocessed`, token);
    assert.equal(preprocessed.status, 404);
    assert.match(preprocessed.headers.get('content-type') || '', /application\/json/);
    await assertNoPathDisclosure(preprocessed);
  });

  test('a path outside the configured upload root is denied', async () => {
    assert.ok(fs.existsSync(outsideFile), 'precondition: outside file exists');
    const token = tokenFor('owner-1', [ROLES.PATIENT]);
    const res = await get(`/${REC_OUTSIDE}`, token);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/json/,
      'an outside-root file must not be streamed');
    await assertNoPathDisclosure(res);
  });

  test('an escaping ".." path to a real file outside the root is denied', async () => {
    assert.ok(fs.existsSync(outsideFile), 'precondition: outside file exists');
    const token = tokenFor('owner-1', [ROLES.PATIENT]);
    const res = await get(`/${REC_TRAVERSAL}`, token);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    await assertNoPathDisclosure(res);
  });

  test('a symlink escaping the upload root is denied', { skip: !symlinkSupported }, async () => {
    const token = tokenFor('owner-1', [ROLES.PATIENT]);
    const res = await get(`/${REC_SYMLINK}`, token);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/json/,
      'a symlink pointing outside the root must not be followed');
    await assertNoPathDisclosure(res);
  });

  test('the real upload directory was never used as a fixture store', () => {
    assert.ok(fs.existsSync(UPLOAD_ROOT_DIR), 'configured upload root still exists');
    const entries = fs.readdirSync(UPLOAD_ROOT_DIR);
    assert.ok(!entries.some((name) => name.startsWith('fixture-')),
      'no fixture file may be written into the real upload directory');
    assert.ok(!originalFile.startsWith(UPLOAD_ROOT_DIR), 'fixtures must live outside the repository');
  });
});
