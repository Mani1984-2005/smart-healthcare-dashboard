// backend/tests/migrationSafety.test.js
// -----------------------------------------------------------------------------
// Migration/database safety proofs. NONE of these tests require PostgreSQL,
// Docker or network access:
//   * the target guard is a pure function (config/migrationTarget.js);
//   * file discovery/validation and checksum verification are pure filesystem
//     operations against temporary directories or the checked-in migrations;
//   * the runner-ordering test proves migrate() rejects an unsafe target
//     BEFORE it ever attempts a database connection (the error observed is
//     the guard's, not a connection error).
// -----------------------------------------------------------------------------
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertSafeMigrationTarget,
  MigrationTargetError,
  PRODUCTION_DB_NAME_PATTERN,
} from '../src/config/migrationTarget.js';
import { loadMigrationFiles, verifyChecksums, migrate } from '../src/db/migrate.js';

const SAFE_DEV_TARGET = Object.freeze({
  database: 'medicare_pro_dev',
  host: '127.0.0.1',
  migrationTarget: 'medicare_pro_dev',
  nodeEnv: 'development',
  allowRemote: undefined,
});

function guardThrows(cfg) {
  assert.throws(() => assertSafeMigrationTarget(cfg), MigrationTargetError);
}

describe('Migration target safety guard (fail-closed, no database)', () => {
  test('Layer 0: missing PGDATABASE is rejected', () => {
    guardThrows({ ...SAFE_DEV_TARGET, database: undefined });
    guardThrows({ ...SAFE_DEV_TARGET, database: '' });
    guardThrows({ ...SAFE_DEV_TARGET, database: '   ' });
  });

  test('Layer 1: missing MIGRATION_TARGET is rejected (no silent default target)', () => {
    guardThrows({ ...SAFE_DEV_TARGET, migrationTarget: undefined });
    guardThrows({ ...SAFE_DEV_TARGET, migrationTarget: '' });
  });

  test('Layer 1: MIGRATION_TARGET not matching PGDATABASE is rejected (unexpected target)', () => {
    guardThrows({ ...SAFE_DEV_TARGET, migrationTarget: 'medicare_pro' });
    guardThrows({ ...SAFE_DEV_TARGET, database: 'medicare_pro_dev', migrationTarget: 'medicare_pro_prod' });
  });

  test('Layer 2: NODE_ENV=production is always rejected', () => {
    guardThrows({ ...SAFE_DEV_TARGET, nodeEnv: 'production' });
  });

  test('Layer 3: production-looking database names are rejected even outside production', () => {
    guardThrows({ ...SAFE_DEV_TARGET, database: 'medicare_prod', migrationTarget: 'medicare_prod' });
    guardThrows({ ...SAFE_DEV_TARGET, database: 'hospital_production', migrationTarget: 'hospital_production' });
    guardThrows({ ...SAFE_DEV_TARGET, database: 'prod', migrationTarget: 'prod' });
    assert.ok(PRODUCTION_DB_NAME_PATTERN.test('medicare-pro.production'));
    assert.ok(!PRODUCTION_DB_NAME_PATTERN.test('medicare_pro_dev'));
  });

  test('Layer 4: non-loopback hosts are rejected without MIGRATION_ALLOW_REMOTE=yes', () => {
    guardThrows({ ...SAFE_DEV_TARGET, host: 'db-dev.internal.example.com' });
    guardThrows({ ...SAFE_DEV_TARGET, host: '10.0.0.5', allowRemote: undefined });
    guardThrows({ ...SAFE_DEV_TARGET, host: '10.0.0.5', allowRemote: 'no' });
  });

  test('Layer 4: remote host is allowed only with explicit MIGRATION_ALLOW_REMOTE=yes', () => {
    const result = assertSafeMigrationTarget({ ...SAFE_DEV_TARGET, host: 'db-dev.internal.example.com', allowRemote: 'yes' });
    assert.equal(result.host, 'db-dev.internal.example.com');
  });

  test('A safe development configuration passes and returns a summary without secrets', () => {
    const result = assertSafeMigrationTarget(SAFE_DEV_TARGET);
    assert.equal(result.database, 'medicare_pro_dev');
    assert.equal(result.host, '127.0.0.1');
    assert.equal(Object.keys(result).length, 2, 'summary must not carry credentials');
  });

  test('Missing host (libpq default) is treated as local', () => {
    const result = assertSafeMigrationTarget({ ...SAFE_DEV_TARGET, host: undefined });
    assert.match(result.host, /localhost/);
  });
});

describe('Real migrations directory (checked-in baselines)', () => {
  let files;
  before(() => {
    files = loadMigrationFiles();
  });

  test('loads exactly the four baseline migrations with versions 1..4', () => {
    assert.equal(files.length, 4);
    assert.deepEqual(files.map((m) => m.version), [1, 2, 3, 4]);
    assert.deepEqual(files.map((m) => m.filename), [
      '0001_baseline_core_ocr.sql',
      '0002_baseline_ai_intelligence.sql',
      '0003_baseline_enterprise_core.sql',
      '0004_baseline_workflow_security.sql',
    ]);
  });

  test('every checksum is a 64-char sha256 hex digest', () => {
    for (const m of files) {
      assert.match(m.checksum, /^[0-9a-f]{64}$/, `${m.filename} checksum`);
    }
  });

  test('every baseline is transactional — header prose mentioning the opt-out marker must not opt out', () => {
    // Regression: the baseline headers deliberately MENTION the marker in a
    // sentence; only a standalone directive line may opt out.
    for (const m of files) {
      assert.equal(m.transactional, true, `${m.filename} must remain transactional`);
    }
  });

  test('versions are contiguous from 1 (no gaps, no duplicates)', () => {
    files.forEach((m, i) => assert.equal(m.version, i + 1));
  });
});

describe('Migration file validation (temp directories, no database)', () => {
  test('duplicate versions are rejected', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-dup-'));
    try {
      fs.writeFileSync(path.join(dir, '0001_alpha.sql'), 'CREATE TABLE a (id int);');
      fs.writeFileSync(path.join(dir, '0001_beta.sql'), 'CREATE TABLE b (id int);');
      assert.throws(() => loadMigrationFiles(dir), /Duplicate migration version/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('version gaps are rejected (missing migration file)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-gap-'));
    try {
      fs.writeFileSync(path.join(dir, '0001_alpha.sql'), 'CREATE TABLE a (id int);');
      fs.writeFileSync(path.join(dir, '0003_gamma.sql'), 'CREATE TABLE c (id int);');
      assert.throws(() => loadMigrationFiles(dir), /Migration version gap/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('invalid filenames are rejected', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-badname-'));
    try {
      fs.writeFileSync(path.join(dir, 'schema.sql'), 'CREATE TABLE a (id int);');
      assert.throws(() => loadMigrationFiles(dir), /Invalid migration filename/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('empty or comment-only migrations are rejected', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-empty-'));
    try {
      fs.writeFileSync(path.join(dir, '0001_empty.sql'), '-- just a comment\n   \n-- another comment\n');
      assert.throws(() => loadMigrationFiles(dir), /no SQL statements/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a standalone directive line opts out of the transaction; prose mentioning it does not', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-marker-'));
    try {
      fs.writeFileSync(path.join(dir, '0001_prose.sql'), 'CREATE TABLE a (id int);\n-- see docs about migrate:transactional=false for details\n');
      fs.writeFileSync(path.join(dir, '0002_directive.sql'), '-- migrate:transactional=false\nCREATE TABLE b (id int);\n');
      const [prose, directive] = loadMigrationFiles(dir);
      assert.equal(prose.transactional, true);
      assert.equal(directive.transactional, false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a valid migration set loads with checksums', () => {
    const validDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicare-valid-'));
    try {
      fs.writeFileSync(path.join(validDir, '0001_valid.sql'), 'CREATE TABLE a (id int);\n');
      const loaded = loadMigrationFiles(validDir);
      assert.equal(loaded.length, 1);
      assert.match(loaded[0].checksum, /^[0-9a-f]{64}$/);
    } finally {
      fs.rmSync(validDir, { recursive: true, force: true });
    }
  });
});

describe('Checksum verification (immutability of applied migrations)', () => {
  const files = [
    { version: 1, filename: '0001_alpha.sql', checksum: 'a'.repeat(64) },
    { version: 2, filename: '0002_beta.sql', checksum: 'b'.repeat(64) },
  ];

  test('no problems when applied rows match files', () => {
    const applied = [
      { version: 1, filename: '0001_alpha.sql', checksum: 'a'.repeat(64) },
    ];
    assert.deepEqual(verifyChecksums(applied, files), []);
  });

  test('detects a modified already-applied migration file', () => {
    const applied = [
      { version: 1, filename: '0001_alpha.sql', checksum: 'c'.repeat(64) },
    ];
    const problems = verifyChecksums(applied, files);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /Checksum mismatch for migration 1/);
  });

  test('detects an applied migration whose file disappeared', () => {
    const applied = [
      { version: 9, filename: '0009_ghost.sql', checksum: 'd'.repeat(64) },
    ];
    const problems = verifyChecksums(applied, files);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /recorded as applied but its file is missing/);
  });
});

describe('Runner ordering: the target guard fires BEFORE any database connection', () => {
  // env.js resolves process.env once at import time; these tests mutate the
  // in-memory env.db snapshot (and restore it) so they are deterministic and
  // can never reach a real database connection.
  async function expectGuardRejection(mutate, pattern) {
    const { env } = await import('../src/config/env.js');
    const savedDb = { ...env.db };
    const savedTarget = process.env.MIGRATION_TARGET;
    const savedAllowRemote = process.env.MIGRATION_ALLOW_REMOTE;
    try {
      env.db.database = 'medicare_pro_dev';
      env.db.host = '127.0.0.1';
      delete process.env.MIGRATION_TARGET;
      delete process.env.MIGRATION_ALLOW_REMOTE;
      mutate({ env });
      await assert.rejects(
        () => migrate(),
        (err) => {
          assert.match(err.message, pattern);
          assert.ok(!/ECONNREFUSED|timeout|connect/i.test(err.message), 'must not be a connection error');
          return true;
        },
      );
    } finally {
      Object.assign(env.db, savedDb);
      if (savedTarget === undefined) delete process.env.MIGRATION_TARGET;
      else process.env.MIGRATION_TARGET = savedTarget;
      if (savedAllowRemote === undefined) delete process.env.MIGRATION_ALLOW_REMOTE;
      else process.env.MIGRATION_ALLOW_REMOTE = savedAllowRemote;
    }
  }

  test('migrate() rejects a missing MIGRATION_TARGET before touching the database', async () => {
    await expectGuardRejection(() => {}, /MIGRATION_TARGET is not set/);
  });

  test('migrate() --status also refuses an unexpected target before touching the database', async () => {
    await expectGuardRejection(
      ({ env }) => { env.db.database = 'medicare_pro_dev'; process.env.MIGRATION_TARGET = 'some_other_database'; },
      /does not match the configured PGDATABASE/,
    );
  });
});
