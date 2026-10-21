// =============================================================================
// Database-backed integration suite — isolated PostgreSQL test cluster.
//
// These tests exercise the REAL PostgreSQL repositories — no test doubles,
// no __setRepositoryForTests seams — against the disposable test cluster:
//   PGHOST=localhost PGPORT=5433 PGDATABASE=medicare_pro_test
//   PGUSER=medicare_pro_test_app
//
// Safety properties:
//   * The suite REFUSES to run unless the process env is pinned to the
//     isolated cluster, and it re-verifies the live connection identity
//     (current_setting('port') = 5433, current_database() = medicare_pro_test)
//     before creating anything.
//   * All fixtures use the reserved synthetic namespace 'ITEST-*' / 'itest-*'
//     and cleanup deletes ONLY rows in that namespace (never TRUNCATE).
//   * No external identity provider contact: tokens are minted locally
//     (HS256 local-only secret), JWKS URI left empty.
// =============================================================================

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'crypto';

import { authEnv } from '../backend/src/config/authEnv.js';
import { mintDevToken } from '../backend/src/services/keycloakAdapter.service.js';
import { errorHandler } from '../backend/src/middleware/errorHandler.js';
import patientRoutes from '../backend/src/routes/patients.routes.js';
import approvalRoutes from '../backend/src/routes/approval.routes.js';
import healthRoutes from '../backend/src/routes/health.routes.js';
import biometricRoutes from '../backend/src/routes/biometric.routes.js';
import { ROLES } from '../backend/src/config/roles.js';
import pool from '../backend/src/config/db.js';
import { resolvePermissions } from '../backend/src/services/rbac.service.js';

const savedDevJwtSecret = authEnv.devJwtSecret;
before(() => {
  authEnv.devJwtSecret = 'dbintegration-root-suite-test-secret-not-for-production';
});
after(() => {
  authEnv.devJwtSecret = savedDevJwtSecret;
});

const PINNED =
  process.env.PGHOST === 'localhost' &&
  process.env.PGPORT === '5433' &&
  process.env.PGDATABASE === 'medicare_pro_test' &&
  process.env.PGUSER === 'medicare_pro_test_app';

let identityVerified = false;
let server;
let baseUrl;

// Synthetic fixture identifiers (namespace reserved for this suite).
const MRN1 = 'ITEST-P1';
const MRN2 = 'ITEST-P2';
const INV1 = 'ITEST-INV-1';
const INV2 = 'ITEST-INV-2';
const INV3 = 'ITEST-INV-3';
const CRED_ID = 'itest-cred-1';
const createdApprovalIds = [];

const tokens = {};

describe(
  'Database-backed integration (medicare_pro_test @ localhost:5433)',
  {
    skip: PINNED
      ? false
      : 'PG env not pinned to the isolated test cluster ' +
        '(PGHOST=localhost PGPORT=5433 PGDATABASE=medicare_pro_test PGUSER=medicare_pro_test_app)',
  },
  () => {
  before(async () => {
    // Gate 1 — refuse to run unless the env is pinned to the isolated cluster.
    if (!PINNED) {
      throw new Error(
        'Refusing to run: PG env is not pinned to the isolated test cluster ' +
          '(expected PGHOST=localhost PGPORT=5433 PGDATABASE=medicare_pro_test ' +
          'PGUSER=medicare_pro_test_app).'
      );
    }

    // Gate 2 — prove the live connection reaches the new cluster by identity,
    // not just by environment spelling, before anything is created.
    const identity = await pool.query(
      "SELECT current_setting('port') AS port, current_database() AS db"
    );
    assert.equal(identity.rows[0].port, '5433', 'connection must reach port 5433');
    assert.equal(
      identity.rows[0].db,
      'medicare_pro_test',
      'connection must reach medicare_pro_test'
    );
    identityVerified = true;

    // Self-healing prepare: remove only leftovers from a prior aborted run of
    // this same suite (same reserved namespace), so fixtures are deterministic.
    await pool.query(
      'DELETE FROM audit_logs WHERE action IN ' +
        "('BIOMETRIC_CREDENTIAL_REGISTERED','BIOMETRIC_AUTH_SUCCEEDED') " +
        'AND details->>$1 = $2',
      ['credentialId', CRED_ID]
    );
    await pool.query("DELETE FROM role_permissions rp USING roles r, permissions p " +
      'WHERE rp.role_id = r.id AND rp.permission_id = p.id ' +
      "AND r.name = 'receptionist' AND p.key = 'billing:read'");
    await pool.query(
      "DELETE FROM biometric_challenges WHERE user_id IN " +
        "(SELECT id FROM users WHERE keycloak_subject_id LIKE 'itest-%')"
    );
    await pool.query('DELETE FROM biometric_credentials WHERE credential_id = $1', [CRED_ID]);
    await pool.query(
      'DELETE FROM entity_versions ev USING invoices i ' +
        "WHERE ev.entity_id = i.id AND ev.entity_type = 'invoice' " +
        "AND i.invoice_number LIKE 'ITEST-INV-%' " +
        "AND ev.change_reason LIKE 'approval_requested:%'"
    );
    await pool.query("DELETE FROM invoices WHERE invoice_number LIKE 'ITEST-INV-%'");
    await pool.query("DELETE FROM patients WHERE mrn LIKE 'ITEST-P%'");
    await pool.query(
      "DELETE FROM user_roles WHERE user_id IN " +
        "(SELECT id FROM users WHERE keycloak_subject_id LIKE 'itest-%')"
    );
    await pool.query("DELETE FROM users WHERE keycloak_subject_id LIKE 'itest-%'");

    // Synthetic patients + invoices (test-created fixtures).
    await pool.query(
      'INSERT INTO patients (mrn, full_name) VALUES ' +
        "($1, 'Itest Patient One'), ($2, 'Itest Patient Two')",
      [MRN1, MRN2]
    );
    await pool.query(
      'INSERT INTO invoices (invoice_number, patient_id) ' +
        'SELECT v.inv, p.id FROM (VALUES ($1, $2), ($3, $2), ($4, $5)) AS v(inv, mrn) ' +
        'JOIN patients p ON p.mrn = v.mrn',
      [INV1, MRN1, INV2, INV3, MRN2]
    );

    // Local-only auth: dev tokens minted by this process, no IdP contact.
    tokens.clerk = mintDevToken({
      subject: 'itest-clerk-1',
      email: 'itest-clerk@test.com',
      fullName: 'Itest Clerk',
      roles: [ROLES.BILLING_CLERK],
    });
    tokens.receptionist = mintDevToken({
      subject: 'itest-recep-1',
      email: 'itest-recep@test.com',
      fullName: 'Itest Receptionist',
      roles: [ROLES.RECEPTIONIST],
    });
    tokens.doctor = mintDevToken({
      subject: 'itest-doctor-1',
      email: 'itest-doctor@test.com',
      fullName: 'Itest Doctor',
      roles: [ROLES.DOCTOR],
    });
    tokens.nurse = mintDevToken({
      subject: 'itest-nurse-1',
      email: 'itest-nurse@test.com',
      fullName: 'Itest Nurse',
      roles: [ROLES.NURSE],
    });
    tokens.patient = mintDevToken({
      subject: 'itest-biou-1',
      email: 'itest-biou@test.com',
      fullName: 'Itest Biometric User',
      roles: [ROLES.PATIENT],
    });

    const app = express();
    app.use(express.json());
    app.use('/api/patients', patientRoutes);
    app.use('/api/approvals', approvalRoutes);
    app.use('/api/health', healthRoutes);
    app.use('/api/biometric', biometricRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    try {
      // Cleanup deletes ONLY rows this suite created (reserved namespace).
      if (identityVerified) {
        if (createdApprovalIds.length) {
          await pool.query('DELETE FROM audit_logs WHERE details->>$1 = ANY($2::text[])', [
            'approvalRequestId',
            createdApprovalIds,
          ]);
          await pool.query('DELETE FROM approval_requests WHERE id = ANY($1::uuid[])', [
            createdApprovalIds,
          ]);
        }
        await pool.query(
          "DELETE FROM audit_logs WHERE action IN " +
            "('BIOMETRIC_CREDENTIAL_REGISTERED','BIOMETRIC_AUTH_SUCCEEDED') " +
            'AND details->>$1 = $2',
          ['credentialId', CRED_ID]
        );
        await pool.query(
          "DELETE FROM role_permissions rp USING roles r, permissions p " +
            'WHERE rp.role_id = r.id AND rp.permission_id = p.id ' +
            "AND r.name = 'receptionist' AND p.key = 'billing:read'"
        );
        await pool.query(
          'DELETE FROM biometric_challenges WHERE user_id IN ' +
            "(SELECT id FROM users WHERE keycloak_subject_id LIKE 'itest-%')"
        );
        await pool.query('DELETE FROM biometric_credentials WHERE credential_id = $1', [CRED_ID]);
        await pool.query(
          'DELETE FROM entity_versions ev USING invoices i ' +
            'WHERE ev.entity_id = i.id AND ev.entity_type = ' +
            "'invoice' AND i.invoice_number LIKE 'ITEST-INV-%' " +
            "AND ev.change_reason LIKE 'approval_requested:%'"
        );
        await pool.query("DELETE FROM invoices WHERE invoice_number LIKE 'ITEST-INV-%'");
        await pool.query(
          'DELETE FROM audit_logs WHERE user_id IN ' +
            "(SELECT id FROM users WHERE keycloak_subject_id LIKE 'itest-%')"
        );
        await pool.query("DELETE FROM patients WHERE mrn LIKE 'ITEST-P%'");
        await pool.query(
          'DELETE FROM user_roles WHERE user_id IN ' +
            "(SELECT id FROM users WHERE keycloak_subject_id LIKE 'itest-%')"
        );
        await pool.query("DELETE FROM users WHERE keycloak_subject_id LIKE 'itest-%'");
      }
    } finally {
      if (server) {
        const closed = new Promise((resolve) => server.close(resolve));
        if (server.closeAllConnections) server.closeAllConnections();
        await closed;
      }
      await pool.end().catch(() => {});
    }
  });

  test('GET /api/health/ready reports 200 with connected DB and 4 migrations', async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.equal(res.status, 200, 'readiness must be 200 when DB is reachable');
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.dependencies.database.status, 'connected');
    assert.equal(body.dependencies.migrations.status, 'up_to_date');
    assert.equal(body.dependencies.migrations.applied, 4);
    assert.equal(body.dependencies.migrations.latest, 4);
  });

  test('billing clerk gets 200 on the patient-narrowed invoice list (real repo)', async () => {
    const p1 = await pool.query('SELECT id FROM patients WHERE mrn = $1', [MRN1]);
    const patientId = p1.rows[0].id;

    const res = await fetch(`${baseUrl}/patients/${patientId}/invoices`, {
      headers: { Authorization: `Bearer ${tokens.clerk}` },
    });
    assert.equal(res.status, 200, 'billing clerk holds patient:read AND billing:read');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.length, 2, 'list must be narrowed to the requested patient');
    for (const row of body.data) {
      assert.equal(row.patientId, patientId);
    }
    const numbers = body.data.map((r) => r.invoiceNumber).sort();
    assert.deepEqual(numbers, [INV1, INV2]);
  });

  test('receptionist is denied the same invoice list (lacks billing:read)', async () => {
    const p1 = await pool.query('SELECT id FROM patients WHERE mrn = $1', [MRN1]);
    const res = await fetch(`${baseUrl}/patients/${p1.rows[0].id}/invoices`, {
      headers: { Authorization: `Bearer ${tokens.receptionist}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  test('doctor can create an approval request; row lands in PostgreSQL', async () => {
    const inv = await pool.query('SELECT id FROM invoices WHERE invoice_number = $1', [INV1]);
    const invoiceId = inv.rows[0].id;

    const res = await fetch(`${baseUrl}/approvals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.doctor}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'invoice',
        entityId: invoiceId,
        action: 'issue_invoice',
      }),
    });
    assert.equal(res.status, 201, 'doctor holds approval-create (prescription:write)');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.id, 'created approval request must carry an id');
    createdApprovalIds.push(body.data.id);

    const check = await pool.query('SELECT count(*)::int AS n FROM approval_requests WHERE id = $1', [
      body.data.id,
    ]);
    assert.equal(check.rows[0].n, 1, 'approval request must exist in the real database');
  });

  test('nurse is denied approval creation (excluded from all four action permissions)', async () => {
    const inv = await pool.query('SELECT id FROM invoices WHERE invoice_number = $1', [INV1]);
    const res = await fetch(`${baseUrl}/approvals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.nurse}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'invoice',
        entityId: inv.rows[0].id,
        action: 'issue_invoice',
      }),
    });
    assert.equal(res.status, 403, 'nurse must not hold any approval-create permission');
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  test('production-style role_permissions overrides resolve from the database', async () => {
    const baseline = await resolvePermissions(['receptionist']);
    assert.ok(
      !baseline.includes('billing:read'),
      'receptionist baseline must not include billing:read'
    );

    let inserted = 0;
    try {
      const ins = await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) ' +
          'SELECT r.id, p.id FROM roles r CROSS JOIN permissions p ' +
          "WHERE r.name = 'receptionist' AND p.key = 'billing:read' " +
          'AND NOT EXISTS (SELECT 1 FROM role_permissions rp ' +
          'WHERE rp.role_id = r.id AND rp.permission_id = p.id) ' +
          'RETURNING role_id'
      );
      inserted = ins.rowCount;
      assert.equal(inserted, 1, 'exactly one synthetic override row must be inserted');

      // Real repository (no __setRepositoryForTests seam in this suite).
      const overridden = await resolvePermissions(['receptionist']);
      assert.ok(
        overridden.includes('billing:read'),
        'override row must be picked up by role_permissions resolution'
      );
    } finally {
      if (inserted) {
        await pool.query(
          'DELETE FROM role_permissions rp USING roles r, permissions p ' +
            'WHERE rp.role_id = r.id AND rp.permission_id = p.id ' +
            "AND r.name = 'receptionist' AND p.key = 'billing:read'"
        );
      }
    }

    const restored = await resolvePermissions(['receptionist']);
    assert.ok(
      !restored.includes('billing:read'),
      'removing the override must restore the baseline permissions'
    );
  });

  test('biometric registration and assertion verify against real PostgreSQL', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

    // 1. Register the synthetic credential (authenticated, real repo write).
    const reg = await fetch(`${baseUrl}/biometric/register/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.patient}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentialId: CRED_ID,
        publicKey: publicKeyPem,
        deviceLabel: 'itest-device',
        modality: 'fingerprint',
      }),
    });
    assert.equal(reg.status, 201, 'credential registration must succeed');
    const regBody = await reg.json();
    assert.equal(regBody.data.credential_id ?? regBody.data.credentialId, CRED_ID);

    // 2. Fetch an authentication challenge (real random challenge row in DB).
    const opt = await fetch(`${baseUrl}/biometric/auth/options`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.patient}` },
    });
    assert.equal(opt.status, 200);
    const challenge = (await opt.json()).data;

    // 3. Sign the challenge with the synthetic private key and verify (pre-auth
    //    endpoint, real repository lookup + signature check).
    const signature = crypto
      .sign('sha256', Buffer.from(challenge.challenge), privateKey)
      .toString('base64');
    const ok = await fetch(`${baseUrl}/biometric/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: CRED_ID,
        challengeId: challenge.challengeId,
        signature,
      }),
    });
    assert.equal(ok.status, 200, 'valid synthetic assertion must verify');
    const okBody = await ok.json();
    assert.equal(okBody.data.verified, true);

    // 4. Negative — a consumed challenge must be rejected (failed closed).
    const replay = await fetch(`${baseUrl}/biometric/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: CRED_ID,
        challengeId: challenge.challengeId,
        signature,
      }),
    });
    assert.ok(replay.status >= 400 && replay.status < 500, 'challenge replay must fail');

    // 5. Negative — a wrong key's signature must be rejected (failed closed).
    const wrong = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const opt2 = await fetch(`${baseUrl}/biometric/auth/options`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.patient}` },
    });
    const challenge2 = (await opt2.json()).data;
    const badSignature = crypto
      .sign('sha256', Buffer.from(challenge2.challenge), wrong.privateKey)
      .toString('base64');
    const bad = await fetch(`${baseUrl}/biometric/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: CRED_ID,
        challengeId: challenge2.challengeId,
        signature: badSignature,
      }),
    });
    assert.ok(bad.status >= 400 && bad.status < 500, 'wrong signature must fail');
  });
  }
);
