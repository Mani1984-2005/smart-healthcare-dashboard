// backend/tests/rbacVerification.test.js
// -----------------------------------------------------------------------------
// Phase 2E — focused RBAC / security verification.
//
// DATABASE-FREE. server.js is never imported (importing it opens a pg pool and
// calls bootstrapWorkflow); the Express app below re-mounts the REAL routers on
// the same mount paths server.js uses, so every assertion exercises the actual
// middleware chains:
//   * identity + permission resolution -> in-memory rbac seam
//     (rbac.service.__setRepositoryForTests)
//   * ownership  -> in-memory record-access seam
//     (recordAccess.service.__setRepositoryForTests)
//   * file bytes -> throwaway dir under os.tmpdir() (files controller seam)
//   * tokens     -> explicit local HS256 secret, never the published fallback
//
// DELIBERATELY NOT TESTED (would query PostgreSQL):
//   any request that passes its permission gate AND reaches a repository-backed
//   controller (e.g. GET /api/patients with a doctor token). Denials terminate
//   in middleware before any query, so the deny direction — the security
//   property — is fully covered offline. Allow direction is proven at the
//   permission-resolution layer (resolvePermissions) and, where a seam-backed
//   handler exists (file download), over HTTP as well.
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
import * as rbacService from '../src/services/rbac.service.js';
import * as recordAccessService from '../src/services/recordAccess.service.js';
import {
  isPatientPortalCaller, checkPrescriptionAccess, checkInvoiceAccess,
} from '../src/services/recordAccess.service.js';
import { __setUploadRootForTests } from '../src/controllers/files.controller.js';
import { PERMISSIONS, ROLES, DEFAULT_ROLE_PERMISSIONS, ROLES as ALL_ROLES } from '../src/config/roles.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

import patientsRoutes from '../src/routes/patients.routes.js';
import prescriptionsRoutes from '../src/routes/prescriptions.routes.js';
import aiAnalysisRoutes from '../src/routes/aiAnalysis.routes.js';
import prescriptionIntegrationRoutes from '../src/routes/prescriptionIntegration.routes.js';
import filesRoutes from '../src/routes/files.routes.js';
import rbacRoutes from '../src/routes/rbac.routes.js';
import healthRoutes from '../src/routes/health.routes.js';
import billingRoutes from '../src/routes/billing.routes.js';
import approvalRoutes from '../src/routes/approval.routes.js';
import pharmacyRoutes from '../src/routes/pharmacy.routes.js';
import labReportsRoutes from '../src/routes/labReports.routes.js';
import scannerRoutes from '../src/routes/scanner.routes.js';
import biometricRoutes from '../src/routes/biometric.routes.js';
import notificationRoutes from '../src/routes/notification.routes.js';
import versioningRoutes from '../src/routes/versioning.routes.js';
import searchRoutes from '../src/routes/search.routes.js';
import analyticsRoutes from '../src/routes/analytics.routes.js';
import clinicalAssistantRoutes from '../src/routes/clinicalAssistant.routes.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(HERE, '..', 'src');
const REPO_DIR = path.resolve(HERE, '..', '..');

const LOCAL_TEST_SECRET = 'phase2e-local-hs256-verification-secret-not-production';

// Synthetic record ids (valid UUIDs so they clear validateUuidParam).
const REC_OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REC_OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const INV_OWNER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const INV_NOCHAIN = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const UUID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const OWNER_BYTES = Buffer.from('phase2e-owner-prescription-bytes');
const OTHER_BYTES = Buffer.from('phase2e-other-prescription-bytes');

// ---------------------------------------------------------------------------
// In-memory repositories (same shapes the Phase 2B suite uses).
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

function createFakeRecordRepo() {
  const prescriptions = new Map();
  const invoices = new Map();
  const files = new Map();
  return {
    prescriptions, invoices, files,
    async findPrescriptionOwnerRow(id) {
      const row = prescriptions.get(id);
      return row ? { id: row.id, user_id: row.user_id } : null;
    },
    async findPrescriptionFileRow(id) {
      const row = files.get(id);
      return row || null;
    },
    async findInvoicePrescriptionRow(id) {
      const row = invoices.get(id);
      return row ? { id: row.id, prescription_id: row.prescription_id } : null;
    },
  };
}

// ---------------------------------------------------------------------------
// Static route inventory: parses the REAL route sources for gate auditing.
// ---------------------------------------------------------------------------
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function extractArgs(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i += 1) {
    const c = src[i];
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) return src.slice(openIdx + 1, i); }
    else if (c === "'" || c === '"' || c === '`') {
      const q = c; i += 1;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; }
    }
  }
  return '';
}

function splitTop(s) {
  const out = [];
  let depth = 0; let cur = '';
  for (const c of s) {
    if ('([{`'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function inventoryOf(routesDir) {
  const rows = [];
  for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith('.js')).sort()) {
    const raw = stripComments(fs.readFileSync(path.join(routesDir, file), 'utf8'));
    const lineOf = (idx) => raw.slice(0, idx).split('\n').length;
    const re = /router\s*\.\s*(use|get|post|patch|put|delete|all)\s*\(/g;
    let m;
    while ((m = re.exec(raw))) {
      const parts = splitTop(extractArgs(raw, re.lastIndex - 1));
      if (m[1] === 'use') {
        rows.push({ file, line: lineOf(m.index), kind: 'use', mw: parts.map((p) => p.split(/[,(]/)[0]) });
      } else {
        const isLiteral = /^['"`]/.test(parts[0] ?? '');
        rows.push({
          file,
          line: lineOf(m.index),
          kind: m[1],
          path: isLiteral ? parts[0].slice(1, -1) : null,
          mw: parts.slice(1).map((p) => p.split(/[,(]/)[0].trim()).filter((p) => p && p !== 'async' && !p.includes('=>')),
        });
      }
    }
  }
  return rows;
}

/** Routes intentionally without an authenticate / permission gate, with reason. */
const PUBLIC_ROUTES = {
  'health.routes.js|GET|/': 'liveness banner (documented public)',
  'health.routes.js|GET|/live': 'liveness probe (documented public)',
  'health.routes.js|GET|/ready': 'readiness probe (documented public)',
  'rbac.routes.js|POST|/dev-token': 'pre-auth by design; triple-gated by config (env/JWKS/privileged roles)',
  'biometric.routes.js|POST|/auth/verify': 'pre-auth by design: this IS the login step (returns no session)',
};

/** Authenticated but WITHOUT a permission/role gate, with reason. */
const UNGATED_AUTHENTICATED_ROUTES = {
  'rbac.routes.js|GET|/me': 'whoAmI: echoes the CALLER own identity (no cross-user data, no permission needed)',
  'biometric.routes.js|POST|/register/options': 'self-scoped by controller requireUser(req.user.id)',
  'biometric.routes.js|POST|/register/verify': 'self-scoped by controller requireUser(req.user.id)',
  'biometric.routes.js|POST|/auth/options': 'self-scoped by controller requireUser(req.user.id)',
  'biometric.routes.js|GET|/credentials': 'self-scoped by controller requireUser(req.user.id)',
  'biometric.routes.js|DELETE|/credentials/:credentialId': 'self-scoped by controller requireUser(req.user.id)',
  'notification.routes.js|GET|/': 'self-scoped: controller uses req.user.id only',
  'notification.routes.js|PATCH|/:id/read': 'self-scoped: controller uses req.user.id only',
  'notification.routes.js|POST|/read-all': 'self-scoped: controller uses req.user.id only',
  'notification.routes.js|GET|/preferences': 'self-scoped: controller uses req.user.id only',
  'notification.routes.js|PUT|/preferences': 'self-scoped: controller uses req.user.id only',
  'scanner.routes.js|POST|/barcode/lookup': 'medicine-catalog lookup (no PHI); patient/prescription QR lookups ARE gated',
};

/** Mount table copied from backend/src/server.js:67-90 (file -> mount paths). */
const MOUNTS = {
  '/api/files': ['files.routes.js'],
  '/api/health': ['health.routes.js'],
  '/api/prescriptions': ['prescriptions.routes.js', 'aiAnalysis.routes.js', 'prescriptionIntegration.routes.js'],
  '/api/search': ['search.routes.js'],
  '/api/analytics': ['analytics.routes.js'],
  '/api/patients': ['patients.routes.js'],
  '/api/pharmacy': ['pharmacy.routes.js'],
  '/api/lab-reports': ['labReports.routes.js'],
  '/api/invoices': ['billing.routes.js'],
  '/api/billing': ['billing.routes.js'],
  '/api/auth': ['rbac.routes.js'],
  '/api/rbac': ['rbac.routes.js'],
  '/api/scanner': ['scanner.routes.js'],
  '/api/biometric': ['biometric.routes.js'],
  '/api/clinical-assistant': ['clinicalAssistant.routes.js'],
  '/api/notifications': ['notification.routes.js'],
  '/api/approvals': ['approval.routes.js'],
  '/api/versions': ['versioning.routes.js'],
};

/** Map a probe URL (template, ${...} params allowed) onto exactly one parsed route. */
function matchProbe(method, url, invRoutes) {
  const clean = url.split('?')[0].replace(/\$\{[^}]+\}/g, '\u0000');
  const segs = clean.split('/').filter(Boolean);
  const m = method.toLowerCase();
  let best = null;
  for (const [mount, files] of Object.entries(MOUNTS)) {
    const mSegs = mount.split('/').filter(Boolean);
    if (segs.length < mSegs.length) continue;
    if (mSegs.some((s, i) => s !== segs[i])) continue;
    const rest = segs.slice(mSegs.length);
    for (const r of invRoutes) {
      if (r.kind !== m || !files.includes(r.file)) continue;
      const rSegs = r.path === '/' ? [] : r.path.split('/').filter(Boolean);
      if (rSegs.length !== rest.length) continue;
      if (!rSegs.every((s, i) => s.startsWith(':') || s === rest[i])) continue;
      const literal = rSegs.filter((s) => !s.startsWith(':')).length;
      if (!best || literal > best.literal) best = { route: r, literal };
    }
  }
  return best ? best.route : null;
}

describe('Phase 2E RBAC and security verification (no database)', () => {
  let server;
  let baseUrl;
  let fakeRbac;
  let fakeRecords;
  let tempRoot;

  const saved = {
    authEnabled: authEnv.authEnabled,
    jwksUri: authEnv.keycloak.jwksUri,
    devJwtSecret: authEnv.devJwtSecret,
    allowDevTokens: process.env.ALLOW_DEV_TOKENS,
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
  };

  // Tests only ever toggle the dev-token FLAG. authEnv (signing secret, JWKS
  // URI, AUTH_ENABLED) is set once in before() and restored only in after(),
  // so a mid-suite restore can never swap the signing secret out from under
  // tokens minted by later tests.
  const restoreFlags = () => {
    if (saved.allowDevTokens === undefined) delete process.env.ALLOW_DEV_TOKENS;
    else process.env.ALLOW_DEV_TOKENS = saved.allowDevTokens;
    if (saved.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.nodeEnv;
    if (saved.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved.jwtSecret;
  };

  const restoreAll = () => {
    restoreFlags();
    authEnv.keycloak.jwksUri = saved.jwksUri;
    authEnv.devJwtSecret = saved.devJwtSecret;
    authEnv.authEnabled = saved.authEnabled;
  };

  before(async () => {
    authEnv.keycloak.jwksUri = '';
    authEnv.devJwtSecret = LOCAL_TEST_SECRET;
    authEnv.authEnabled = false;
    delete process.env.ALLOW_DEV_TOKENS;

    fakeRbac = createFakeRbacRepo();
    rbacService.__setRepositoryForTests(fakeRbac);
    fakeRecords = createFakeRecordRepo();
    recordAccessService.__setRepositoryForTests(fakeRecords);

    // Fixtures OUTSIDE the repository.
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-phase2e-'));
    const ownerFile = path.join(tempRoot, 'owner.jpg');
    const otherFile = path.join(tempRoot, 'other.jpg');
    fs.writeFileSync(ownerFile, OWNER_BYTES);
    fs.writeFileSync(otherFile, OTHER_BYTES);
    __setUploadRootForTests(tempRoot);

    // ---- synthetic principals (no real patient information) ---------------
    const patientA = await fakeRbac.upsertUserFromToken({ subject: 'portal-owner', email: 'owner@synthetic.test', fullName: 'Synthetic Owner' });
    await fakeRbac.assignRoleToUser(patientA.id, ROLES.PATIENT);
    const patientB = await fakeRbac.upsertUserFromToken({ subject: 'portal-other', email: 'other@synthetic.test', fullName: 'Synthetic Other' });
    await fakeRbac.assignRoleToUser(patientB.id, ROLES.PATIENT);
    const doctor = await fakeRbac.upsertUserFromToken({ subject: 'doc-1', email: 'doc@synthetic.test', fullName: 'Synthetic Doctor' });
    await fakeRbac.assignRoleToUser(doctor.id, ROLES.DOCTOR);
    const receptionist = await fakeRbac.upsertUserFromToken({ subject: 'frontdesk-1', email: 'desk@synthetic.test', fullName: 'Synthetic Receptionist' });
    await fakeRbac.assignRoleToUser(receptionist.id, ROLES.RECEPTIONIST);
    const inactive = await fakeRbac.upsertUserFromToken({ subject: 'inactive-1', email: 'inactive@synthetic.test', fullName: 'Synthetic Inactive' });
    inactive.is_active = false;
    await fakeRbac.assignRoleToUser(inactive.id, ROLES.DOCTOR);

    fakeRecords.prescriptions.set(REC_OWNER, { id: REC_OWNER, user_id: patientA.id });
    fakeRecords.prescriptions.set(REC_OTHER, { id: REC_OTHER, user_id: patientB.id });
    fakeRecords.files.set(REC_OWNER, { id: REC_OWNER, file_path: ownerFile, preprocessed_path: null });
    fakeRecords.files.set(REC_OTHER, { id: REC_OTHER, file_path: otherFile, preprocessed_path: null });
    fakeRecords.invoices.set(INV_OWNER, { id: INV_OWNER, prescription_id: REC_OWNER });
    fakeRecords.invoices.set(INV_NOCHAIN, { id: INV_NOCHAIN, prescription_id: null });

    // ---- app under test: REAL routers on server.js mount paths ------------
    const app = express();
    app.use(express.json());
    app.use('/api/files', filesRoutes);
    app.use('/api/health', healthRoutes);
    app.use('/api/prescriptions', prescriptionsRoutes);
    app.use('/api/prescriptions', aiAnalysisRoutes);
    app.use('/api/prescriptions', prescriptionIntegrationRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/patients', patientsRoutes);
    app.use('/api/pharmacy', pharmacyRoutes);
    app.use('/api/lab-reports', labReportsRoutes);
    app.use('/api/invoices', billingRoutes);
    app.use('/api/billing', billingRoutes);
    app.use('/api/auth', rbacRoutes);
    app.use('/api/rbac', rbacRoutes);
    app.use('/api/scanner', scannerRoutes);
    app.use('/api/biometric', biometricRoutes);
    app.use('/api/clinical-assistant', clinicalAssistantRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/approvals', approvalRoutes);
    app.use('/api/versions', versioningRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    restoreAll();
    rbacService.__setRepositoryForTests(null);
    recordAccessService.__setRepositoryForTests(null);
    __setUploadRootForTests(null);
    if (server) await new Promise((resolve) => server.close(resolve));
    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
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

  const TOK = {};
  const tokenForRole = (key, subject, roles) => {
    if (!TOK[key]) TOK[key] = tokenFor(subject, roles);
    return TOK[key];
  };

  // The two portal principals used for ownership tests. Their subjects match the
  // users provisioned in before(), so req.user.id is the record owner.
  const OWNER_TOKEN = () => tokenForRole('ownerPatient', 'portal-owner', [ROLES.PATIENT]);
  const OTHER_TOKEN = () => tokenForRole('otherPatient', 'portal-other', [ROLES.PATIENT]);

  // =========================================================================
  // 1. Role x permission matrix (source of truth for the delivered matrix)
  // =========================================================================
  describe('1. role/permission matrix resolves exactly as documented', () => {
    test('every backend role resolves to its documented default permission set', async () => {
      for (const role of Object.values(ALL_ROLES)) {
        const resolved = await rbacService.resolvePermissions([role]);
        assert.deepEqual(
          [...resolved].sort(),
          [...DEFAULT_ROLE_PERMISSIONS[role]].sort(),
          `role ${role} must resolve to config/roles.js defaults when role_permissions is empty`,
        );
      }
    });

    test('privileged roles keep all permissions and patient keeps least privilege', async () => {
      const admin = await rbacService.resolvePermissions([ROLES.ADMIN]);
      assert.equal(admin.length, Object.values(PERMISSIONS).length, 'admin holds every permission');
      const patient = await rbacService.resolvePermissions([ROLES.PATIENT]);
      assert.deepEqual([...patient].sort(), [PERMISSIONS.PRESCRIPTION_READ, PERMISSIONS.BILLING_READ].sort());
      const receptionist = await rbacService.resolvePermissions([ROLES.RECEPTIONIST]);
      assert.ok(!receptionist.includes(PERMISSIONS.BILLING_READ), 'receptionist has no billing:read');
      assert.ok(!receptionist.includes(PERMISSIONS.LAB_WRITE), 'receptionist has no lab:write');
    });

    test('a token cannot escalate to admin/system during role seeding', () => {
      assert.deepEqual(rbacService.filterProvisionableRoles(['doctor', 'admin', 'system']), ['doctor']);
      assert.deepEqual(rbacService.filterProvisionableRoles(['admin']), []);
      assert.deepEqual(rbacService.filterProvisionableRoles('not-an-array'), []);
    });
  });

  // =========================================================================
  // 2. Anonymous / unauthorized requests
  // =========================================================================
  describe('2. unauthorized requests', () => {
    const PROTECTED = [
      ['GET', '/api/patients'],
      ['GET', `/api/patients/${UUID}`],
      ['GET', `/api/patients/${UUID}/lab-reports`],
      ['GET', `/api/patients/${UUID}/invoices`],
      ['GET', `/api/patients/${UUID}/timeline`],
      ['PATCH', `/api/patients/${UUID}`],
      ['POST', '/api/patients'],
      ['GET', '/api/prescriptions'],
      ['GET', `/api/prescriptions/${UUID}`],
      ['GET', `/api/prescriptions/${UUID}/audit`],
      ['DELETE', `/api/prescriptions/${UUID}`],
      ['POST', '/api/prescriptions/upload'],
      ['POST', `/api/prescriptions/${UUID}/analyze`],
      ['GET', `/api/prescriptions/${UUID}/analysis`],
      ['POST', `/api/prescriptions/${UUID}/link-patient`],
      ['POST', `/api/prescriptions/${UUID}/dispense`],
      ['GET', `/api/prescriptions/${UUID}/dispensations`],
      ['GET', `/api/prescriptions/${UUID}/lab-reports`],
      ['POST', `/api/prescriptions/${UUID}/invoice`],
      ['GET', `/api/files/prescriptions/${UUID}`],
      ['GET', `/api/files/prescriptions/${UUID}/preprocessed`],
      ['GET', '/api/auth/me'],
      ['GET', '/api/rbac/roles'],
      ['GET', `/api/rbac/users/${UUID}/roles`],
      ['POST', `/api/rbac/users/${UUID}/roles`],
      ['DELETE', `/api/rbac/users/${UUID}/roles/doctor`],
      ['GET', `/api/invoices/${UUID}`],
      ['PATCH', `/api/billing/${UUID}/status`],
      ['GET', '/api/approvals'],
      ['GET', `/api/approvals/${UUID}`],
      ['POST', `/api/approvals/${UUID}/decide`],
      ['POST', `/api/approvals/${UUID}/escalate`],
      ['POST', '/api/approvals'],
      ['GET', '/api/pharmacy'],
      ['PATCH', `/api/pharmacy/dispensations/${UUID}`],
      ['POST', '/api/lab-reports'],
      ['GET', `/api/lab-reports/${UUID}`],
      ['GET', '/api/notifications'],
      ['PATCH', `/api/notifications/${UUID}/read`],
      ['POST', '/api/notifications/read-all'],
      ['GET', '/api/notifications/preferences'],
      ['PUT', '/api/notifications/preferences'],
      ['GET', `/api/versions/prescription/${UUID}`],
      ['GET', `/api/versions/prescription/${UUID}/diff`],
      ['GET', `/api/versions/prescription/${UUID}/1`],
      ['POST', `/api/versions/prescription/${UUID}/1/restore`],
      ['GET', '/api/search?q=a'],
      ['GET', '/api/analytics/dashboard'],
      ['POST', '/api/scanner/barcode/lookup'],
      ['POST', '/api/scanner/barcode/register'],
      ['POST', '/api/scanner/qr/lookup'],
      ['POST', `/api/scanner/qr/patients/${UUID}`],
      ['POST', `/api/scanner/qr/prescriptions/${UUID}`],
      ['GET', '/api/biometric/credentials'],
      ['DELETE', `/api/biometric/credentials/${UUID}`],
      ['POST', '/api/biometric/register/options'],
      ['POST', '/api/biometric/register/verify'],
      ['POST', '/api/biometric/auth/options'],
      ['POST', '/api/clinical-assistant/query'],
      ['GET', `/api/clinical-assistant/sessions/${UUID}`],
      ['GET', `/api/clinical-assistant/prescriptions/${UUID}`],
    ];

    test(`${PROTECTED.length} protected endpoints return 401 UNAUTHORIZED to anonymous callers`, async () => {
      for (const [method, url] of PROTECTED) {
        const res = await req(method, url, { body: method === 'GET' || method === 'DELETE' ? undefined : {} });
        assert.equal(res.status, 401, `${method} ${url} must reject anonymous callers`);
        const body = await res.json();
        assert.equal(body.error.code, 'UNAUTHORIZED', `${method} ${url} error contract`);
      }
    });

    test('the anonymous probe list covers EVERY non-public route (coverage audit)', () => {
      const invRoutes = inventoryOf(path.join(SRC_DIR, 'routes')).filter((r) => r.kind !== 'use');
      const covered = new Set();
      for (const [method, url] of PROTECTED) {
        const route = matchProbe(method, url, invRoutes);
        assert.ok(route, `probe ${method} ${url} does not match any parsed route`);
        covered.add(`${route.file}|${route.kind.toUpperCase()}|${route.path}`);
      }
      const missing = invRoutes
        .filter((r) => !PUBLIC_ROUTES[`${r.file}|${r.kind.toUpperCase()}|${r.path}`]
          && !covered.has(`${r.file}|${r.kind.toUpperCase()}|${r.path}`))
        .map((r) => `${r.file}:${r.line} ${r.kind.toUpperCase()} ${r.path}`);
      assert.deepEqual(missing, [], 'non-public routes without a live anonymous 401 probe');
      assert.equal(covered.size, 61, 'every non-public route is covered exactly once');
    });

    test('the documented public surface stays public', async () => {
      assert.equal((await req('GET', '/api/health/live')).status, 200, 'liveness probe is public');
      const dev = await req('POST', '/api/auth/dev-token', { body: { roles: [ROLES.DOCTOR] } });
      assert.equal(dev.status, 403, 'dev-token stays disabled without ALLOW_DEV_TOKENS');
      assert.match((await dev.json()).error.message, /ALLOW_DEV_TOKENS/);
      // server.js mounts the same router twice (lines 83-84): the gate must
      // hold on the duplicate mount as well.
      const devDup = await req('POST', '/api/rbac/dev-token', { body: { roles: [ROLES.DOCTOR] } });
      assert.equal(devDup.status, 403, 'the /api/rbac/dev-token duplicate carries the same gate');
    });

    test('the pre-auth biometric login step is reachable without a token (no session minted)', async () => {
      // Empty body is rejected by the validator BEFORE the service runs, so this
      // probe cannot reach the database. The 400 (not 401) is the evidence that
      // the route is intentionally pre-authentication.
      const res = await req('POST', '/api/biometric/auth/verify', { body: {} });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error.message, /credentialId/);
      assert.ok(!('accessToken' in (body.data ?? {})), 'no session credential is returned');
    });
  });

  // =========================================================================
  // 3. Deny matrix for the three supported portal roles
  // =========================================================================
  describe('3. deny matrix: Patient / Doctor / Receptionist', () => {
    const DENY = [
      // --- Patient portal: only prescription:read + billing:read ------------
      ['patient', ROLES.PATIENT, 'GET', `/api/patients`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/patients/${UUID}`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/patients`, 403],
      ['patient', ROLES.PATIENT, 'PATCH', `/api/patients/${UUID}`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/patients/${UUID}/invoices`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/patients/${UUID}/lab-reports`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/patients/${UUID}/timeline`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/prescriptions/upload`, 403],
      ['patient', ROLES.PATIENT, 'DELETE', `/api/prescriptions/${REC_OWNER}`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/prescriptions/${REC_OWNER}/analyze`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/prescriptions/${REC_OWNER}/dispense`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/prescriptions/${REC_OTHER}/invoice`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/lab-reports`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/lab-reports/${UUID}`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/approvals`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/approvals`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/approvals/${UUID}/decide`, 403],
      ['patient', ROLES.PATIENT, 'PATCH', `/api/billing/${UUID}/status`, 403],
      ['patient', ROLES.PATIENT, 'PATCH', `/api/pharmacy/dispensations/${UUID}`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/search?q=a`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/analytics/dashboard`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/versions/prescription/${UUID}`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/versions/prescription/${UUID}/1/restore`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/clinical-assistant/sessions/${UUID}`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/scanner/qr/lookup`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/scanner/qr/patients/${UUID}`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/scanner/barcode/register`, 403],
      ['patient', ROLES.PATIENT, 'GET', `/api/rbac/roles`, 403],
      ['patient', ROLES.PATIENT, 'POST', `/api/rbac/users/${UUID}/roles`, 403],

      // --- Doctor: clinical, but no billing / pharmacy-dispense / rbac ------
      ['doctor', ROLES.DOCTOR, 'GET', `/api/invoices/${UUID}`, 403],
      ['doctor', ROLES.DOCTOR, 'PATCH', `/api/billing/${UUID}/status`, 403],
      ['doctor', ROLES.DOCTOR, 'PATCH', `/api/pharmacy/dispensations/${UUID}`, 403],
      ['doctor', ROLES.DOCTOR, 'POST', `/api/prescriptions/${REC_OWNER}/dispense`, 403],
      ['doctor', ROLES.DOCTOR, 'POST', `/api/prescriptions/${REC_OTHER}/invoice`, 403],
      ['doctor', ROLES.DOCTOR, 'POST', `/api/versions/prescription/${UUID}/1/restore`, 403],
      ['doctor', ROLES.DOCTOR, 'GET', `/api/rbac/roles`, 403],
      ['doctor', ROLES.DOCTOR, 'POST', `/api/rbac/users/${UUID}/roles`, 403],

      // --- Receptionist: front-desk only -----------------------------------
      // Phase 2F approval A.1-A.3: the patient-scoped lab list, the timeline
      // and report-by-id are clinical-role gated now (patient:read no longer
      // unlocks them), so front-desk loses the reads it previously held.
      ['receptionist', ROLES.RECEPTIONIST, 'GET', `/api/patients/${UUID}/lab-reports`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'GET', `/api/patients/${UUID}/timeline`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'GET', `/api/lab-reports/${UUID}`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/lab-reports`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'GET', `/api/approvals`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/approvals`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/approvals/${UUID}/decide`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'GET', `/api/invoices/${UUID}`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'PATCH', `/api/billing/${UUID}/status`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'PATCH', `/api/pharmacy/dispensations/${UUID}`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/prescriptions/upload`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/prescriptions/${REC_OWNER}/dispense`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/prescriptions/${REC_OTHER}/invoice`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/versions/prescription/${UUID}/1/restore`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'GET', `/api/rbac/roles`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/rbac/users/${UUID}/roles`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'GET', `/api/clinical-assistant/sessions/${UUID}`, 403],
      ['receptionist', ROLES.RECEPTIONIST, 'POST', `/api/scanner/barcode/register`, 403],
    ];

    for (const [key, role, method, url, expected] of DENY) {
      test(`${key} -> ${method} ${url} = ${expected}`, async () => {
        const token = tokenForRole(key, `${key}-principal`, [role]);
        const res = await req(method, url, {
          token,
          body: method === 'GET' || method === 'DELETE' ? undefined : {},
        });
        assert.equal(res.status, expected, `${method} ${url} for ${role}`);
        if (expected === 403) {
          const body = await res.json();
          assert.equal(body.error.code, 'FORBIDDEN');
        }
      });
    }
    test('dual control: a billing clerk cannot self-approve paid/void/refund transitions', async () => {
      // billing:write reaches the route, but the FINANCIAL_STATUS gate
      // (billing.routes.js:18) demands billing:approve for these statuses and
      // runs BEFORE the controller, so no database is touched.
      const clerk = tokenForRole('billingClerk', 'clerk-1', [ROLES.BILLING_CLERK]);
      for (const status of ['paid', 'void', 'refunded']) {
        const res = await req('PATCH', `/api/billing/${UUID}/status`, { token: clerk, body: { status } });
        assert.equal(res.status, 403, `clerk -> ${status}`);
        assert.match((await res.json()).error.message, /billing:approve/);
      }
    });
  });

  // =========================================================================
  // 4. Cross-patient isolation + protected prescription files
  // =========================================================================
  describe('4. cross-patient record isolation and prescription-file access', () => {
    test('the owner reads their own file bytes; a second patient gets 404 with no bytes', async () => {
      const owner = await req('GET', `/api/files/prescriptions/${REC_OWNER}`, { token: OWNER_TOKEN() });
      assert.equal(owner.status, 200);
      assert.deepEqual(Buffer.from(await owner.arrayBuffer()), OWNER_BYTES);

      const other = await req('GET', `/api/files/prescriptions/${REC_OWNER}`, { token: OTHER_TOKEN() });
      assert.equal(other.status, 404, 'a different patient is denied with 404 semantics');
      const text = await other.text();
      assert.ok(!text.includes('phase2e-owner-prescription-bytes'), 'no file bytes leak');
      assert.ok(!text.includes(tempRoot), 'no filesystem path leaks');
      assert.match(other.headers.get('content-type') || '', /json/, 'denial is JSON, not a file');
    });

    test('a second patient cannot read the record or its audit trail (404 before any query)', async () => {
      const other = OTHER_TOKEN();
      assert.equal((await req('GET', `/api/prescriptions/${REC_OWNER}`, { token: other })).status, 404);
      assert.equal((await req('GET', `/api/prescriptions/${REC_OWNER}/audit`, { token: other })).status, 404);
      assert.equal((await req('GET', `/api/prescriptions/${UUID}/analysis`, { token: other })).status, 404);
      assert.equal((await req('GET', `/api/prescriptions/${REC_OWNER}/dispensations`, { token: other })).status, 404);
      assert.equal((await req('GET', `/api/prescriptions/${REC_OWNER}/lab-reports`, { token: other })).status, 404);
    });

    test('staff passes the ownership gate (the permission gate is the control for staff)', async () => {
      const doctor = await req('GET', `/api/files/prescriptions/${REC_OWNER}`, { token: tokenForRole('doctor', 'doctor-principal', [ROLES.DOCTOR]) });
      assert.equal(doctor.status, 200, 'doctor holds prescription:read and passes ownership');
      assert.deepEqual(Buffer.from(await doctor.arrayBuffer()), OWNER_BYTES);
    });

    test('ownership is evaluated as a pure function of the backend roles (seam level)', async () => {
      const ownerReq = { roles: [ROLES.PATIENT], user: { id: fakeRecords.prescriptions.get(REC_OWNER).user_id } };
      const otherReq = { roles: [ROLES.PATIENT], user: { id: fakeRecords.prescriptions.get(REC_OTHER).user_id } };
      const staffReq = { roles: [ROLES.DOCTOR], user: { id: 'someone' } };
      const rolelessReq = { roles: [], user: { id: 'someone' } };

      assert.deepEqual(await checkPrescriptionAccess(ownerReq, REC_OWNER), { allowed: true, owner: true });
      assert.deepEqual(await checkPrescriptionAccess(otherReq, REC_OWNER), { allowed: false, notFound: true });
      assert.deepEqual(await checkPrescriptionAccess(staffReq, REC_OTHER), { allowed: true, staff: true });
      // roles=[] is NOT a patient-portal caller... but authenticate never
      // produces it: rbac.service.getOrProvisionUser falls back to [patient].
      assert.deepEqual(await checkPrescriptionAccess(rolelessReq, REC_OWNER), { allowed: true, staff: true });
    });

    test('invoice access is scoped to the prescription chain for the patient portal', async () => {
      const ownerReq = { roles: [ROLES.PATIENT], user: { id: fakeRecords.prescriptions.get(REC_OWNER).user_id } };
      const staffReq = { roles: [ROLES.BILLING_CLERK], user: { id: 'clerk' } };

      assert.equal((await checkInvoiceAccess(ownerReq, INV_OWNER)).allowed, true, 'own invoice chain allowed');
      assert.equal((await checkInvoiceAccess(ownerReq, INV_NOCHAIN)).allowed, false, 'no prescription link = denied');
      assert.equal((await checkInvoiceAccess({ roles: [ROLES.PATIENT], user: { id: fakeRecords.prescriptions.get(REC_OTHER).user_id } }, INV_OWNER)).allowed, false, 'other patient invoice denied');
      assert.deepEqual(await checkInvoiceAccess(staffReq, INV_NOCHAIN), { allowed: true, staff: true });
    });

    test('patient-portal classification depends on roles, never on the request', () => {
      assert.equal(isPatientPortalCaller({ roles: [ROLES.PATIENT] }), true);
      assert.equal(isPatientPortalCaller({ roles: [] }), false, 'empty roles is not the portal');
      assert.equal(isPatientPortalCaller({ roles: [ROLES.DOCTOR] }), false);
      assert.equal(isPatientPortalCaller({ roles: [ROLES.PATIENT, ROLES.DOCTOR] }), false, 'any staff role removes portal scoping');
      assert.equal(isPatientPortalCaller({}), false, 'no roles at all');
    });

    test('patient invoice endpoint denies an unlinked invoice (404, not 403)', async () => {
      const patient = tokenForRole('patient', 'patient-principal', [ROLES.PATIENT]);
      const res = await req('GET', `/api/invoices/${INV_NOCHAIN}`, { token: patient });
      assert.equal(res.status, 404, 'patient:read passes, ownership denies with 404');
      assert.equal((await req('GET', `/api/invoices/${UUID}`, { token: patient })).status, 404);
    });

    test('the prescription list is scoped to the caller in the controller (static evidence)', () => {
      const src = fs.readFileSync(path.join(SRC_DIR, 'controllers', 'prescriptions.controller.js'), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      assert.ok(src.includes('isPatientPortalCaller(req)'), 'list uses the portal classifier');
      assert.ok(/rowsWhere\s*=\s*patientScoped\s*\?\s*'WHERE user_id = \$3'/.test(src), 'patient-portal list filters by user_id');
      assert.ok(src.includes('patientScoped ? [req.user?.id] : []'), 'the bound parameter is the authenticated user id');
    });
  });

  // =========================================================================
  // 5. Administrative endpoints + development-token safeguards
  // =========================================================================
  describe('5. administrative endpoints and dev-token safeguards', () => {
    test('role administration is admin-only for every non-admin role tested', async () => {
      for (const [key, role] of [['patient', ROLES.PATIENT], ['doctor', ROLES.DOCTOR], ['receptionist', ROLES.RECEPTIONIST]]) {
        const token = tokenForRole(key, `${key}-principal`, [role]);
        for (const [method, url] of [
          ['GET', '/api/rbac/roles'],
          ['GET', `/api/rbac/users/${UUID}/roles`],
          ['POST', `/api/rbac/users/${UUID}/roles`],
          ['DELETE', `/api/rbac/users/${UUID}/roles/doctor`],
        ]) {
          const res = await req(method, url, { token, body: method === 'GET' ? undefined : {} });
          assert.equal(res.status, 403, `${role} ${method} ${url}`);
        }
      }
    });

    test('a repository-provisioned admin passes the role gate (allow direction)', async () => {
      // The admin identity comes from the ROLE ASSIGNMENT in the repository
      // (simulated by the in-memory seam), NOT from the token claim — the same
      // trust model as production, where an operator provisions admin in the
      // database and the dev-token endpoint refuses to mint one.
      const adminUser = await fakeRbac.upsertUserFromToken({
        subject: 'ops-admin', email: 'ops@synthetic.test', fullName: 'Synthetic Ops Admin',
      });
      await fakeRbac.assignRoleToUser(adminUser.id, ROLES.ADMIN);
      const adminTok = tokenForRole('adminProvisioned', 'ops-admin', []); // no admin CLAIM at all

      const roles = await req('GET', '/api/rbac/roles', { token: adminTok });
      assert.equal(roles.status, 200, 'requireRole(admin) admits a repository-provisioned admin');
      assert.deepEqual((await roles.json()).data, [], 'listRoles is served by the repository seam');

      const forUser = await req('GET', `/api/rbac/users/${adminUser.id}/roles`, { token: adminTok });
      assert.equal(forUser.status, 200);
      assert.deepEqual((await forUser.json()).data, [ROLES.ADMIN], 'the assignment is read back from the repository');

      // ...while the same empty-claim token on a NON-provisioned subject stays non-admin.
      const other = await req('GET', '/api/rbac/roles', { token: tokenFor('unprovisioned-admin-claim', []) });
      assert.equal(other.status, 403, 'an empty claim without a repository assignment is not admin');
    });

    test('the dev-token endpoint never mints admin or system, even when enabled', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      try {
        for (const roles of [[ROLES.ADMIN], [ROLES.SYSTEM], [ROLES.DOCTOR, ROLES.ADMIN]]) {
          const res = await req('POST', '/api/auth/dev-token', { body: { subject: 'escalate', roles } });
          assert.equal(res.status, 400, `roles=${JSON.stringify(roles)}`);
          assert.match((await res.json()).error.message, /Privileged role/);
        }
        // ...and the same refusal exists in the provisioning path (defence in depth).
        const seeded = await rbacService.getOrProvisionUser({ subject: 'seeder', tokenRoles: [ROLES.ADMIN] });
        assert.ok(!seeded.roles.includes(ROLES.ADMIN), 'an admin-claiming token never seeds admin');
      } finally {
        restoreFlags();
      }
    });

    test('the Admin and Hospital portal cards have no backend role at all', () => {
      // Frontend mapping (src/services/authToken.js): only Patient/Doctor/
      // Receptionist map to a backend role; Admin/Hospital are explicitly
      // listed as unsupported rather than remapped to a substitute.
      const clientSrc = fs.readFileSync(path.join(REPO_DIR, 'src', 'services', 'authToken.js'), 'utf8');
      const mapBlock = /const PORTAL_ROLE_MAP[\s\S]*?\}\);/.exec(clientSrc)?.[0] ?? '';
      assert.ok(mapBlock.includes("Patient: 'patient'"));
      assert.ok(mapBlock.includes("Doctor: 'doctor'"));
      assert.ok(mapBlock.includes("Receptionist: 'receptionist'"));
      assert.ok(!/Admin:/.test(mapBlock), 'Admin must not map to any backend role');
      assert.ok(!/Hospital:/.test(mapBlock), 'Hospital must not map to any backend role');
      assert.ok(clientSrc.includes('UNSUPPORTED_PORTAL_ROLES'), 'unsupported cards are reported, not bypassed');
      const unsupportedBlock = /export const UNSUPPORTED_PORTAL_ROLES[\s\S]*?\}\);/.exec(clientSrc)?.[0] ?? '';
      assert.match(unsupportedBlock, /privileged/, 'the Admin reason cites the privileged-role refusal');
      assert.match(unsupportedBlock, /no corresponding backend role/, 'the Hospital reason cites the missing backend role');
    });

    test('the frontend never requests a privileged role from the dev-token endpoint', () => {
      const clientSrc = fs.readFileSync(path.join(REPO_DIR, 'src', 'services', 'authToken.js'), 'utf8');
      const bodyBlock = /body:\s*JSON\.stringify\(\{[\s\S]*?\}\),/.exec(clientSrc)?.[0] ?? '';
      assert.ok(bodyBlock.includes('roles: [backendRole]'), 'roles come from the mapped backend role only');
      assert.ok(!bodyBlock.includes('admin'), 'no hardcoded admin request');
    });
  });

  // =========================================================================
  // 6. Session lifecycle: expired / invalid / inactive / role-less
  // =========================================================================
  describe('6. session lifecycle', () => {
    test('expired, malformed and wrong-secret tokens are 401 with no identity', async () => {
      const jwt = (await import('jsonwebtoken')).default;
      const expired = jwt.sign({ sub: 'x', realm_access: { roles: [ROLES.DOCTOR] } }, LOCAL_TEST_SECRET, { expiresIn: '-10s' });
      const wrongSecret = jwt.sign({ sub: 'x', realm_access: { roles: [ROLES.DOCTOR] } }, 'another-secret');
      for (const token of ['not.a.jwt', expired, wrongSecret]) {
        const res = await req('GET', '/api/patients', { token });
        assert.equal(res.status, 401, `token=${token.slice(0, 10)}…`);
        assert.equal((await res.json()).error.code, 'UNAUTHORIZED');
      }
    });

    test('a deactivated account is rejected with 403 on every authenticated route', async () => {
      const token = tokenFor('inactive-1', [ROLES.DOCTOR]);
      for (const url of ['/api/auth/me', '/api/patients', '/api/approvals']) {
        const res = await req('GET', url, { token });
        assert.equal(res.status, 403, url);
        assert.match((await res.json()).error.message, /deactivated/i);
      }
    });

    test('a role-less development token falls back to the PATIENT role, not to staff', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      try {
        const mint = await req('POST', '/api/auth/dev-token', { body: { subject: 'roleless-1', roles: [] } });
        assert.equal(mint.status, 200, 'the endpoint accepts an empty role list');
        const { accessToken } = (await mint.json()).data;

        const who = await req('GET', '/api/auth/me', { token: accessToken });
        assert.equal(who.status, 200);
        const data = (await who.json()).data;
        assert.deepEqual(data.roles, [ROLES.PATIENT], 'least-privilege fallback role');
        assert.deepEqual([...data.permissions].sort(), [...DEFAULT_ROLE_PERMISSIONS[ROLES.PATIENT]].sort());

        // Because the fallback IS the patient role, portal scoping still applies:
        const foreign = await req('GET', `/api/files/prescriptions/${REC_OWNER}`, { token: accessToken });
        assert.equal(foreign.status, 404, 'a role-less token cannot read another patient\'s file');
      } finally {
        restoreFlags();
      }
    });

    test('omitting roles mints a least-privilege ROLE-LESS token (R2: never a clinician)', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      try {
        const res = await req('POST', '/api/auth/dev-token', { body: { subject: 'no-roles-field' } });
        assert.equal(res.status, 200, 'the endpoint still mints, but with no roles');
        const data = (await res.json()).data;
        assert.deepEqual(data.roles, [], 'omission grants no role (pre-Phase 2F this defaulted to doctor)');

        // On use, the role-less identity resolves to the PATIENT fallback —
        // the same least-privilege path as an explicit empty role list.
        const who = await req('GET', '/api/auth/me', { token: data.accessToken });
        assert.equal(who.status, 200);
        const me = (await who.json()).data;
        assert.deepEqual(me.roles, [ROLES.PATIENT], 'role-less token resolves to the patient fallback');
        assert.ok(!me.permissions.includes(PERMISSIONS.PRESCRIPTION_WRITE), 'and holds no clinician permission');
      } finally {
        restoreFlags();
      }
    });

    test('malformed development-token requests are refused with 400 (R2 hardening)', async () => {
      process.env.ALLOW_DEV_TOKENS = 'true';
      try {
        const malformed = [
          { subject: 'bad-roles', roles: 'doctor' },            // bare string, not an array
          { subject: 'bad-roles', roles: { role: 'doctor' } },  // object, not an array
          { subject: 'bad-roles', roles: [42] },                // non-string entry
          { subject: 'bad-roles', roles: ['  '] },              // empty role name
          { subject: 12345, roles: [] },                        // non-string subject
          { subject: 'bad-email', email: { toString: 'x' }, roles: [] }, // non-string email
        ];
        for (const body of malformed) {
          const res = await req('POST', '/api/auth/dev-token', { body });
          assert.equal(res.status, 400, `body=${JSON.stringify(body)}`);
          assert.equal((await res.json()).error.code, 'BAD_REQUEST');
        }
      } finally {
        restoreFlags();
      }
    });
  });

  // =========================================================================
  // 7. Static gate audit over every route source
  // =========================================================================
  describe('7. every backend route is gated (static audit)', () => {
    const rows = inventoryOf(path.join(SRC_DIR, 'routes'));

    const routerUseAuth = new Set(
      rows.filter((r) => r.kind === 'use' && r.mw.includes('authenticate')).map((r) => r.file),
    );

    const routeRows = rows.filter((r) => r.kind !== 'use');

    test('the parser found every route in all 18 route files', () => {
      assert.equal(routeRows.length, 66, `expected the complete 66-route surface, parsed ${routeRows.length}`);
      assert.equal(new Set(routeRows.map((r) => r.file)).size, 18, 'all 18 route files parsed');
      assert.ok(routeRows.every((r) => r.path !== null), 'every route path is a literal (auditable)');
    });

    test('every route is authenticated, except the explicit public allowlist', () => {
      const unexpected = [];
      for (const r of routeRows) {
        const key = `${r.file}|${r.kind.toUpperCase()}|${r.path}`;
        if (PUBLIC_ROUTES[key]) continue;
        const authenticated = r.mw.includes('authenticate') || routerUseAuth.has(r.file);
        if (!authenticated) unexpected.push(`${r.file}:${r.line} ${r.kind.toUpperCase()} ${r.path}`);
      }
      assert.deepEqual(unexpected, [], 'routes reachable without authenticate and not on the allowlist');
    });

    test('every authenticated route carries a permission/role gate, except the self-scoped allowlist', () => {
      const unexpected = [];
      const stale = [];
      const seen = new Set();
      for (const r of routeRows) {
        const key = `${r.file}|${r.kind.toUpperCase()}|${r.path}`;
        const gated = r.mw.includes('requirePermission') || r.mw.includes('requireAnyPermission') || r.mw.includes('requireRole');
        if (gated) continue;
        if (PUBLIC_ROUTES[key] || UNGATED_AUTHENTICATED_ROUTES[key]) { seen.add(key); continue; }
        unexpected.push(`${r.file}:${r.line} ${r.kind.toUpperCase()} ${r.path}`);
      }
      for (const key of [...Object.keys(PUBLIC_ROUTES), ...Object.keys(UNGATED_AUTHENTICATED_ROUTES)]) {
        if (!seen.has(key) && !routeRows.some((r) => `${r.file}|${r.kind.toUpperCase()}|${r.path}` === key)) {
          stale.push(key);
        }
      }
      assert.deepEqual(unexpected, [], 'ungated routes not covered by a documented reason');
      assert.deepEqual(stale, [], 'allowlist entries no longer present in the sources');
    });

    test('the ungated-but-authenticated allowlist is self-scoped in its controllers (static evidence)', () => {
      const read = (f) => stripComments(fs.readFileSync(path.join(SRC_DIR, 'controllers', f), 'utf8'));

      // notifications: 5 routes, owner always comes from the verified token.
      const notif = read('notification.controller.js');
      assert.ok(notif.includes('req.user.id'), 'notification handlers derive the owner from req.user');
      assert.ok(!/req\.body\.(userId|patientId|recipientId)/.test(notif), 'no body-supplied recipient');

      // biometric credentials: caller id bound on every handler, never taken from body/params.
      const biometric = read('biometric.controller.js');
      assert.ok((biometric.match(/requireUser\(req\)/g) ?? []).length >= 5, 'every biometric handler binds the caller id');
      assert.ok(!/req\.body\.(userId|patientId)/.test(biometric), 'no body-supplied owner');
      assert.ok(!/req\.params\.userId/.test(biometric), 'no cross-user parameter');

      // credential revocation binds caller AND credential id in SQL.
      const biometricRepo = stripComments(fs.readFileSync(path.join(SRC_DIR, 'repositories', 'biometric.repository.js'), 'utf8'));
      assert.match(biometricRepo, /\[credentialId,\s*userId\]/, 'revocation is scoped to the caller in SQL');

      // approval creation: the requester is always the token subject.
      const approval = read('approval.controller.js');
      assert.ok(approval.includes('requestedBy: req.user?.id'), 'requests record the token owner');
      assert.ok(!/req\.body\.(requestedBy|userId)/.test(approval), 'no body-supplied requester');

      // scanner barcode lookup: barcode from body (catalog key), audited caller from token.
      const scanner = read('scanner.controller.js');
      assert.match(scanner, /lookupBarcode\(req\.body\.barcode, req\.user\?\.id\)/, 'barcode lookup passes the caller id for audit');
    });

    test('no route source consults AUTH_ENABLED (Phase 2B regression)', () => {
      for (const r of routeRows) {
        const src = stripComments(fs.readFileSync(path.join(SRC_DIR, 'routes', r.file), 'utf8'));
        assert.ok(!src.includes('authEnv.authEnabled'), `${r.file} must not consult AUTH_ENABLED`);
      }
    });
  });

  // =========================================================================
  // 8. Legacy /uploads/ exposure
  // =========================================================================
  describe('8. legacy /uploads/ proxy cannot expose files', () => {
    test('the backend has no public /uploads handler anywhere in src', () => {
      const offenders = [];
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) { walk(full); continue; }
          if (!entry.name.endsWith('.js')) continue;
          const src = stripComments(fs.readFileSync(full, 'utf8'));
          if (/app\.use\(\s*['"`]\/uploads/.test(src)) offenders.push(`${full}: static /uploads mount`);
          if (/express\.static\([^)]*uploads/.test(src)) offenders.push(`${full}: express.static(uploads)`);
          if (/toPublicPath\(/.test(src) && !full.endsWith(path.join('services', 'storage.service.js'))) {
            offenders.push(`${full}: legacy /uploads URL builder in use`);
          }
        }
      };
      walk(SRC_DIR);
      assert.deepEqual(offenders, []);
    });

    test('the file-download surface is the authenticated /api/files route', () => {
      const filesSrc = stripComments(fs.readFileSync(path.join(SRC_DIR, 'routes', 'files.routes.js'), 'utf8'));
      assert.ok(filesSrc.includes('router.use(authenticate)'), 'file routes require authentication');
      assert.equal((filesSrc.match(/requirePermission\(/g) ?? []).length, 2, 'both file routes are permission-gated');
      const serverSrc = stripComments(fs.readFileSync(path.join(SRC_DIR, 'server.js'), 'utf8'));
      assert.ok(!serverSrc.includes('/uploads'), 'server.js never mounts /uploads');
    });

    test('nginx and the k8s ingress forward /uploads to the backend (which 404s) instead of serving from disk', () => {
      const nginx = fs.readFileSync(path.join(REPO_DIR, 'frontend', 'nginx.conf'), 'utf8');
      const block = /location\s+\/uploads\/\s*\{([^}]*)\}/.exec(nginx)?.[1] ?? '';
      assert.ok(block.length > 0, 'the /uploads location block still exists (documented legacy rule)');
      assert.ok(block.includes('proxy_pass'), 'it proxies rather than serving files');
      assert.ok(!/\b(alias|root)\b/.test(block), 'nginx never serves /uploads from a local volume');

      const ingress = fs.readFileSync(path.join(REPO_DIR, 'deploy', 'k8s', '30-frontend.yaml'), 'utf8');
      const uploadsRule = /- path: \/uploads[\s\S]*?backend: \{[^}]*name: (\w+)/.exec(ingress);
      assert.ok(uploadsRule, 'the /uploads ingress rule exists');
      assert.equal(uploadsRule[1], 'backend', 'the rule targets the backend service, not the frontend pod');
    });
  });

  // =========================================================================
  // 9. Frontend <-> backend permission consistency
  // =========================================================================
  describe('9. frontend navigation policy vs backend gates', () => {
    const policySrc = fs.readFileSync(path.join(REPO_DIR, 'src', 'services', 'navigationPolicy.js'), 'utf8');
    // Parse the two policy tables separately: ROUTE_PERMISSIONS (permission
    // gates) and ROUTE_ROLES (role gates, added by Phase 2F for /staff).
    const permBlock = /const ROUTE_PERMISSIONS = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(policySrc)?.[1] ?? '';
    const roleBlock = /const ROUTE_ROLES = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(policySrc)?.[1] ?? '';
    const policy = new Map();
    for (const m of permBlock.matchAll(/\['([^']+)',\s*'([^']+)'\]/g)) policy.set(m[1], m[2]);
    const rolePolicy = new Map();
    for (const m of roleBlock.matchAll(/\['([^']+)',\s*'([^']+)'\]/g)) rolePolicy.set(m[1], m[2]);

    const gateOf = (file, method, routePath) => {
      const row = inventoryOf(path.join(SRC_DIR, 'routes'))
        .find((r) => r.file === file && r.kind === method && r.path === routePath);
      assert.ok(row, `${file} ${method} ${routePath} must exist`);
      return row.mw.find((mw) => mw.startsWith('require')) ?? null;
    };

    test('the policy is parsed from the real frontend source', () => {
      assert.ok(policy.size >= 10, `expected the full route table, parsed ${policy.size}`);
    });

    test('/patients, /billing, /laboratory, /pharmacy and /staff map to real backend gates', () => {
      assert.equal(policy.get('/patients'), 'patient:read');
      assert.equal(gateOf('patients.routes.js', 'get', '/'), 'requirePermission');

      assert.equal(policy.get('/billing'), 'billing:read');
      assert.equal(gateOf('billing.routes.js', 'get', '/:invoiceId'), 'requirePermission');

      assert.equal(policy.get('/laboratory'), 'lab:write');
      assert.equal(gateOf('labReports.routes.js', 'post', '/'), 'requirePermission');

      assert.equal(policy.get('/pharmacy'), 'prescription:read');
      assert.equal(gateOf('pharmacy.routes.js', 'get', '/'), 'requireAnyPermission');

      // Phase 2F (R5): /staff is role-gated on BOTH sides now. The frontend
      // policy requires the backend-issued "admin" ROLE, mirroring
      // rbac.routes.js requireRole(admin). The former permission-based UI
      // check (rbac:manage) also matched "system", which the backend's
      // role gate rejects — the UI would have advertised a page whose every
      // request 403s.
      assert.equal(policy.has('/staff'), false, '/staff is no longer permission-gated in the UI policy');
      assert.equal(rolePolicy.get('/staff'), 'admin', '/staff mirrors the backend admin ROLE gate');
      const staffGates = ['roles', 'users/:userId/roles'].map((p) => gateOf('rbac.routes.js', 'get', p === 'roles' ? '/roles' : `/${p}`));
      assert.deepEqual(staffGates, ['requireRole', 'requireRole'],
        '/staff is gated by ROLE admin on the backend AND by the admin ROLE in the frontend policy');
    });

    test('the frontend billing API paths have no backend counterpart (documented mismatch)', async () => {
      // src/api/billingApi.js:11,21 call GET/POST /billing/invoices, but
      // billing.routes.js only defines GET /:invoiceId and PATCH /:invoiceId/status.
      // Both probes stop in routing/validation — no controller, no database.
      const clerk = tokenForRole('billingClerk', 'clerk-1', [ROLES.BILLING_CLERK]);
      const list = await req('GET', '/api/billing/invoices', { token: clerk });
      assert.equal(list.status, 400, '"invoices" is parsed as :invoiceId and rejected by the UUID validator');
      const create = await req('POST', '/api/billing/invoices', { token: clerk, body: {} });
      assert.equal(create.status, 404, 'no invoice-create endpoint exists on the backend');
    });

    test('the frontend never invents a permission the backend does not enforce', () => {
      // Every permission the frontend uses must appear as a real gate on the
      // backend route files (not merely exist in the vocabulary).
      const backendSrc = ['patients', 'billing', 'labReports', 'pharmacy', 'prescriptions', 'approval']
        .map((f) => stripComments(fs.readFileSync(path.join(SRC_DIR, 'routes', `${f}.routes.js`), 'utf8')))
        .join('\n');
      for (const [route, permission] of policy) {
        if (!['/patients', '/billing', '/laboratory', '/pharmacy', '/prescriptions'].includes(route)) continue;
        const constant = Object.entries(PERMISSIONS).find(([, v]) => v === permission)?.[0];
        assert.ok(constant, `${route}: ${permission} exists in PERMISSIONS`);
        assert.ok(
          backendSrc.includes(`PERMISSIONS.${constant}`),
          `${route}: the backend route sources actually reference PERMISSIONS.${constant}`,
        );
      }
    });

    test('every permission used by the frontend exists in the backend vocabulary', () => {
      const backendPermissions = new Set(Object.values(PERMISSIONS));
      for (const [, permission] of policy) {
        assert.ok(backendPermissions.has(permission), `unknown backend permission: ${permission}`);
      }
    });
  });
});
