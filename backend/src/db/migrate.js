// =============================================================================
// Medicare Pro — Versioned migration runner
//
// Replaces the previous "run these 4 files in order" script with real,
// tracked, ordered, checksummed migrations.
//
//   node src/db/migrate.js              apply all pending migrations
//   node src/db/migrate.js --status     show applied / pending, verify checksums
//   node src/db/migrate.js --dry-run    list what would run, change nothing
//   node src/db/migrate.js --help
//
// Guarantees:
//   * FAIL-CLOSED TARGET GUARD: before the runner connects to PostgreSQL or
//     issues ANY statement (including creating `schema_migrations`), the
//     target must pass config/migrationTarget.js: MIGRATION_TARGET must be
//     set and must equal PGDATABASE, production is rejected, production-like
//     database names are rejected, and non-loopback hosts require
//     MIGRATION_ALLOW_REMOTE=yes.
//   * CONCURRENCY SAFETY: the apply phase runs while holding a PostgreSQL
//     session advisory lock, so two concurrent migration processes serialize
//     instead of racing (the second one re-reads state only after the first
//     has fully finished).
//   * Every migration is recorded in `schema_migrations` with a SHA-256 checksum.
//   * An already-applied migration whose file has since CHANGED is a hard error.
//     Edit history is immutable: add a new migration instead of editing an old one.
//   * Each migration runs inside its own transaction and is rolled back on error.
//   * A migration may opt out of the wrapping transaction by containing the
//     marker `-- migrate:transactional=false` (required for operations that
//     cannot run inside a transaction block).
//   * The process always exits — the connection pool is closed explicitly.
// =============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import pool, { closePool } from '../config/db.js';
import { env } from '../config/env.js';
import { assertSafeMigrationTarget } from '../config/migrationTarget.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Opt-out marker for migrations that contain operations PostgreSQL forbids
 * inside a transaction block.
 *
 * Matched ONLY when it appears as a standalone directive line, e.g.
 *
 *     -- migrate:transactional=false
 *
 * Requiring a full standalone line means prose that merely *mentions* the
 * marker (for example, the explanatory header inside a baseline migration)
 * cannot accidentally opt the migration out of its transaction.
 */
const NON_TRANSACTIONAL_MARKER =
  /^[ \t]*--[ \t]*migrate:transactional[ \t]*=[ \t]*false[ \t]*$/im;
const FILENAME_PATTERN = /^(\d{4,})_([a-z0-9_]+)\.sql$/;

// -----------------------------------------------------------------------------
// Migration file discovery
// -----------------------------------------------------------------------------

/**
 * Discover, validate and checksum every migration file in `dir`.
 *
 * The ENTIRE set is validated (filename shape, duplicate versions, version
 * contiguity from 0001, non-empty content) before anything is applied, so a
 * broken set can never half-apply. Throws on the first structural problem.
 *
 * @param {string} dir directory to scan (defaults to the real migrations dir)
 */
function loadMigrationFiles(dir = MIGRATIONS_DIR) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations directory not found: ${dir}`);
  }

  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort();

  const seen = new Map();
  const migrations = [];

  for (const filename of entries) {
    const match = FILENAME_PATTERN.exec(filename);
    if (!match) {
      throw new Error(
        `Invalid migration filename "${filename}". Expected NNNN_snake_case_name.sql (e.g. 0005_add_appointments.sql)`,
      );
    }

    const version = Number.parseInt(match[1], 10);
    const name = match[2];

    if (seen.has(version)) {
      throw new Error(
        `Duplicate migration version ${version}: "${seen.get(version)}" and "${filename}".`,
      );
    }
    seen.set(version, filename);

    const fullPath = path.join(dir, filename);
    const sql = fs.readFileSync(fullPath, 'utf8');

    // Reject empty or comment-only migrations: a migration must contain at
    // least one real SQL statement (repeated re-application is separately
    // handled by the idempotent DDL inside each baseline).
    const withoutComments = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (!withoutComments) {
      throw new Error(
        `Migration "${filename}" contains no SQL statements (empty or comments only). A migration must not be blank.`,
      );
    }

    const checksum = crypto.createHash('sha256').update(sql, 'utf8').digest('hex');

    migrations.push({
      version,
      name,
      filename,
      fullPath,
      sql,
      checksum,
      transactional: !NON_TRANSACTIONAL_MARKER.test(sql),
    });
  }

  // Versions must be contiguous from 1 — catches accidentally deleted files.
  migrations.sort((a, b) => a.version - b.version);
  migrations.forEach((m, i) => {
    const expected = i + 1;
    if (m.version !== expected) {
      throw new Error(
        `Migration version gap: expected ${String(expected).padStart(4, '0')}, found ${String(m.version).padStart(4, '0')} (${m.filename}). A migration file is missing.`,
      );
    }
  });

  return migrations;
}

// -----------------------------------------------------------------------------
// schema_migrations bookkeeping table
// -----------------------------------------------------------------------------

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version       INTEGER PRIMARY KEY,
  name          TEXT        NOT NULL,
  filename      TEXT        NOT NULL,
  checksum      CHAR(64)    NOT NULL,
  execution_ms  INTEGER     NOT NULL,
  applied_by    TEXT,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

/**
 * Read the recorded migrations.
 *
 * `optionalTable` is set for the read-only modes (--status / --dry-run): if
 * `schema_migrations` does not exist yet, report "nothing applied" rather than
 * creating the table. Those modes must never write to the database.
 * A missing table in the real apply path is an error — migrate() creates it
 * explicitly beforehand, so it should exist by then.
 */
async function fetchAppliedMigrations({ optionalTable = false } = {}) {
  try {
    const { rows } = await pool.query(
      'SELECT version, name, filename, checksum, execution_ms, applied_at FROM schema_migrations ORDER BY version',
    );
    return rows;
  } catch (err) {
    if (optionalTable && err && err.code === '42P01') {
      return [];
    }
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Checksum verification — detects post-application edits to historical files
// -----------------------------------------------------------------------------

function verifyChecksums(applied, files) {
  const byVersion = new Map(files.map((m) => [m.version, m]));
  const problems = [];

  for (const row of applied) {
    const file = byVersion.get(row.version);
    if (!file) {
      problems.push(
        `Migration ${row.version} (${row.filename}) is recorded as applied but its file is missing from ${MIGRATIONS_DIR}.`,
      );
      continue;
    }
    if (file.checksum !== row.checksum) {
      problems.push(
        `Checksum mismatch for migration ${row.version} (${file.filename}).\n` +
          `    applied : ${row.checksum}\n` +
          `    on disk : ${file.checksum}\n` +
          `    An already-applied migration file was modified. Migrations are immutable — revert the edit and add a NEW migration instead.`,
      );
    }
  }

  return problems;
}

// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------

// Session-level advisory lock key. Arbitrary but fixed: any two concurrent
// migration processes that agree on this key serialize with each other.
const MIGRATION_LOCK_KEY = 847220101;

/**
 * Apply one migration using an ALREADY-LOCKED client provided by the caller
 * (see runWithMigrationLock). Does not connect or release anything itself;
 * the caller owns the client lifecycle, including discarding a client whose
 * ROLLBACK failed (that case is flagged on the thrown error as
 * `err.rollbackFailed = true`).
 */
async function applyMigration(migration, appliedBy, client) {
  const startedAt = Date.now();
  const recordParams = [
    migration.version,
    migration.name,
    migration.filename,
    migration.checksum,
    Date.now() - startedAt,
    appliedBy,
  ];

  if (migration.transactional) {
    await client.query('BEGIN');
    try {
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO schema_migrations (version, name, filename, checksum, execution_ms, applied_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        recordParams,
      );
      await client.query('COMMIT');
    } catch (err) {
      // A failed ROLLBACK must never replace the migration error that caused
      // it: the original error is always the one reported to the operator.
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // The client is now in an unknown transaction state. Flag the error
        // so the caller discards this client instead of pooling it.
        err.rollbackFailed = true;
        logger.error('ROLLBACK failed; reporting the original migration error instead', {
          migration: migration.filename,
          rollbackError: rollbackErr.message,
        });
      }
      throw err;
    }
  } else {
    // Explicitly non-transactional: run statements as-is, then record.
    // (Opted out via the `-- migrate:transactional=false` marker.)
    logger.warn(`Migration ${migration.filename} runs OUTSIDE a transaction (opted out via marker)`);
    await client.query(migration.sql);
    await client.query(
      `INSERT INTO schema_migrations (version, name, filename, checksum, execution_ms, applied_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      recordParams,
    );
  }

  return Date.now() - startedAt;
}

/**
 * Run `fn(client)` on a dedicated client that holds a session-level
 * PostgreSQL advisory lock for the whole duration. Concurrent migration
 * processes block here instead of racing; if a holder crashes, PostgreSQL
 * releases the lock automatically when its session ends.
 *
 * Client lifecycle rules:
 *   * normally: unlock (best effort), then release back to the pool;
 *   * if a migration's ROLLBACK failed (`err.rollbackFailed`): the client is
 *     poisoned and is released WITH the error so pg discards the connection
 *     (which also drops the advisory lock with it).
 */
async function runWithMigrationLock(fn) {
  const client = await pool.connect();
  let locked = false;
  let released = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    locked = true;
    return await fn(client);
  } catch (err) {
    if (err && err.rollbackFailed) {
      released = true;
      client.release(err);
    }
    throw err;
  } finally {
    if (!released) {
      if (locked) {
        try {
          await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
        } catch (unlockErr) {
          logger.error('Failed to release the migration advisory lock; discarding client', {
            error: unlockErr.message,
          });
          released = true;
          client.release(unlockErr);
        }
      }
      if (!released) client.release();
    }
  }
}

async function migrate({ dryRun = false, statusOnly = false } = {}) {
  const files = loadMigrationFiles();

  // -------------------------------------------------------------------------
  // FAIL-CLOSED TARGET GUARD — runs before the runner connects to PostgreSQL
  // or issues ANY statement, including `CREATE TABLE schema_migrations`.
  // See config/migrationTarget.js for the layered checks (explicit
  // MIGRATION_TARGET declaration, production rejection, production-like
  // database-name rejection, remote-host confirmation).
  // -------------------------------------------------------------------------
  const target = assertSafeMigrationTarget({
    database: env.db.database,
    host: env.db.host,
    migrationTarget: process.env.MIGRATION_TARGET,
    nodeEnv: env.nodeEnv,
    allowRemote: process.env.MIGRATION_ALLOW_REMOTE,
  });
  logger.info('Migration target safety check passed', target);

  // Read-only modes (--status / --dry-run) must not perform any database
  // write — no table creation, no DDL. Only the real apply path may create
  // the bookkeeping table.
  const readOnly = statusOnly || dryRun;
  if (readOnly) {
    const applied = await fetchAppliedMigrations({ optionalTable: true });
    const appliedByVersion = new Map(applied.map((r) => [r.version, r]));

    const problems = verifyChecksums(applied, files);
    if (problems.length > 0) {
      for (const p of problems) logger.error(p);
      throw new Error(`${problems.length} migration integrity problem(s) detected.`);
    }

    const pending = files.filter((m) => !appliedByVersion.has(m.version));

    if (statusOnly) {
      logger.info(`Migration status — ${applied.length} applied, ${pending.length} pending`);
      for (const m of files) {
        const row = appliedByVersion.get(m.version);
        const state = row ? 'APPLIED ' : 'PENDING ';
        const when = row ? row.applied_at.toISOString() : '-';
        const ms = row ? `${row.execution_ms}ms` : '-';
        // eslint-disable-next-line no-console
        console.log(`  ${state} ${String(m.version).padStart(4, '0')}  ${m.filename.padEnd(46)} ${when}  ${ms}`);
      }
      if (pending.length === 0) logger.info('Database schema is up to date.');
      return { applied: applied.length, pending: pending.length, files };
    }

    if (pending.length === 0) {
      logger.info('Dry run: no pending migrations. Nothing to do.');
    } else {
      logger.info(`Dry run: would apply ${pending.length} migration(s):`);
      for (const m of pending) {
        // eslint-disable-next-line no-console
        console.log(`    -> ${m.filename}${m.transactional ? '' : '  [NON-TRANSACTIONAL]'}`);
      }
    }
    return { applied: applied.length, pending: pending.length, files };
  }

  // -------------------------------------------------------------------------
  // Apply path — everything below runs on a dedicated client holding the
  // migration advisory lock, so concurrent migration processes serialize.
  // -------------------------------------------------------------------------
  return runWithMigrationLock(async (client) => {
    // The bookkeeping table is created only after the guard above has passed.
    await client.query(ENSURE_TABLE_SQL);

    const { rows: applied } = await client.query(
      'SELECT version, name, filename, checksum, execution_ms, applied_at FROM schema_migrations ORDER BY version',
    );
    const appliedByVersion = new Map(applied.map((r) => [r.version, r]));

    const problems = verifyChecksums(applied, files);
    if (problems.length > 0) {
      for (const p of problems) logger.error(p);
      throw new Error(`${problems.length} migration integrity problem(s) detected.`);
    }

    const pending = files.filter((m) => !appliedByVersion.has(m.version));

    if (pending.length === 0) {
      logger.info('Database schema is up to date. No pending migrations.');
      return { applied: applied.length, pending: 0, files };
    }

    const appliedBy = process.env.PGUSER || process.env.USER || 'unknown';
    let succeeded = 0;

    for (const migration of pending) {
      logger.info(`Applying ${migration.filename} ...`);
      try {
        const ms = await applyMigration(migration, appliedBy, client);
        logger.info(`  ✓ ${migration.filename} applied in ${ms}ms`);
        succeeded += 1;
      } catch (err) {
        logger.error(`  ✗ ${migration.filename} FAILED and was rolled back`, { error: err.message });
        const wrapped = new Error(
          `Migration ${migration.filename} failed: ${err.message}. ` +
            `Stopped after ${succeeded} successful migration(s); earlier migrations remain applied.`,
        );
        // Preserve the "client is poisoned" signal so the lock wrapper
        // discards the connection instead of pooling it.
        wrapped.rollbackFailed = err.rollbackFailed === true;
        throw wrapped;
      }
    }

    logger.info(`✅ Migration complete. ${succeeded} applied, ${pending.length - succeeded} failed.`);
    return { applied: succeeded, pending: pending.length, files };
  });
}

// -----------------------------------------------------------------------------
// CLI entry point
// -----------------------------------------------------------------------------

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    statusOnly: argv.includes('--status'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(`
Medicare Pro database migrator

Usage:
  node src/db/migrate.js              Apply all pending migrations
  node src/db/migrate.js --status     Show applied/pending and verify checksums
  node src/db/migrate.js --dry-run    Show what would be applied; change nothing
  node src/db/migrate.js --help       This message

Configuration (see backend/.env.example):
  PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

Target safety (fail-closed — see src/config/migrationTarget.js):
  MIGRATION_TARGET        REQUIRED. Must equal PGDATABASE exactly, e.g.
                          MIGRATION_TARGET=medicare_pro_dev
  MIGRATION_ALLOW_REMOTE  Set to "yes" to allow a non-loopback PGHOST.
  Production (NODE_ENV=production) and production-like database names are
  ALWAYS rejected by this runner; production schema changes require a
  separate, manual, reviewed runbook that is not implemented here.

Notes:
  * Migrations are immutable once applied. To change the schema, add a new
    numbered file under src/db/migrations/ — never edit an applied one.
  * Each migration runs in its own transaction and rolls back on failure.
  * Concurrent runs are serialized with a PostgreSQL advisory lock.
  * Add '-- migrate:transactional=false' inside a file only if it contains
    operations that cannot run inside a transaction block.
`);
    return;
  }

  try {
    await migrate({ dryRun: args.dryRun, statusOnly: args.statusOnly });
  } catch (err) {
    logger.error(`Migration aborted: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
  }
}

// Only run when invoked directly, so the module can be imported by tests.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main();
}

export { migrate, loadMigrationFiles, verifyChecksums, ENSURE_TABLE_SQL };
