// =============================================================================
// Medicare Pro — Migration target safety guard (fail-closed)
//
// Migrations are the most destructive operation this codebase can perform.
// Before the migration runner issues ANY statement against PostgreSQL —
// including `CREATE TABLE IF NOT EXISTS schema_migrations` — it must pass
// this guard.
//
// Design rules:
//   * Fail closed. An unknown, ambiguous or production-like target is
//     rejected. Only an explicitly declared, development-like target may
//     proceed.
//   * The database NAME alone never proves the target is safe. The guard
//     therefore layers several independent checks:
//       1. The operator must explicitly declare the intended target via
//          MIGRATION_TARGET, and it must equal the resolved PGDATABASE
//          exactly (catches "I thought I was pointing at dev" mistakes).
//       2. NODE_ENV=production is always rejected — this repository has NO
//          automated production migration procedure; production changes go
//          through a manual, reviewed runbook that is implemented elsewhere.
//       3. A production-looking database name (prod/prod_*/.../production)
//          is rejected even in development environments.
//       4. Non-loopback hosts are rejected unless MIGRATION_ALLOW_REMOTE=yes
//          is also set, so a stale PGHOST pointing at a shared server cannot
//          be migrated by accident.
//   * The guard is a pure function: no I/O, no env access inside it, no
//     database. It is unit-tested without any PostgreSQL instance.
// =============================================================================

/** Database names that indicate a production target (layer 3). */
export const PRODUCTION_DB_NAME_PATTERN = /(^|[_\-.])(prod|production)([_\-.]|$)/i;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1']);

export class MigrationTargetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MigrationTargetError';
  }
}

/**
 * Validate the migration target configuration. Returns a small summary
 * `{ database, host }` on success; throws MigrationTargetError otherwise.
 * Never accepts, returns or logs a password.
 *
 * @param {object} cfg
 * @param {string|undefined} cfg.database       resolved PGDATABASE
 * @param {string|undefined} cfg.host           resolved PGHOST
 * @param {string|undefined} cfg.migrationTarget MIGRATION_TARGET (must equal database)
 * @param {string|undefined} cfg.nodeEnv        NODE_ENV
 * @param {string|undefined} cfg.allowRemote    MIGRATION_ALLOW_REMOTE ("yes" to allow)
 * @returns {{ database: string, host: string }}
 */
export function assertSafeMigrationTarget({
  database,
  host,
  migrationTarget,
  nodeEnv,
  allowRemote,
} = {}) {
  const db = database ? String(database).trim() : '';
  const target = migrationTarget ? String(migrationTarget).trim() : '';
  const env = nodeEnv ? String(nodeEnv).trim() : 'development';

  // Layer 0 — the target must be known at all.
  if (!db) {
    throw new MigrationTargetError(
      'Refusing to migrate: PGDATABASE is not set. Set PGDATABASE explicitly (see backend/.env.example). ' +
        'The migrator never guesses a database name.',
    );
  }

  // Layer 1 — explicit, deliberate target declaration that must match.
  if (!target) {
    throw new MigrationTargetError(
      'Refusing to migrate: MIGRATION_TARGET is not set. Migrations require an explicit, deliberate ' +
        `target declaration — set MIGRATION_TARGET to the exact database you intend to migrate ` +
        `(e.g. MIGRATION_TARGET=${db}).`,
    );
  }
  if (target !== db) {
    throw new MigrationTargetError(
      `Refusing to migrate: MIGRATION_TARGET ("${target}") does not match the configured PGDATABASE ` +
        `("${db}"). This usually means the environment is not the one you think it is — fix the ` +
        'configuration instead of widening the guard.',
    );
  }

  // Layer 2 — production is always rejected here. No automated production
  // procedure exists in this repository; see the runbook requirement in
  // backend/src/db/migrate.js --help.
  if (env === 'production') {
    throw new MigrationTargetError(
      'Refusing to migrate: NODE_ENV=production. This repository has no automated production migration ' +
        'procedure. Production schema changes require a manual, reviewed runbook executed by an operator — ' +
        'this tool will not run against production.',
    );
  }

  // Layer 3 — production-looking database names are rejected outright.
  if (PRODUCTION_DB_NAME_PATTERN.test(db)) {
    throw new MigrationTargetError(
      `Refusing to migrate: database name "${db}" looks like a production database. ` +
        'Use a development/test database name (e.g. medicare_pro_dev) or follow the manual production runbook.',
    );
  }

  // Layer 4 — remote hosts require an additional explicit confirmation.
  const normalizedHost = host ? String(host).trim() : '';
  const isLoopback = !normalizedHost || LOOPBACK_HOSTS.has(normalizedHost);
  if (!isLoopback && allowRemote !== 'yes') {
    throw new MigrationTargetError(
      `Refusing to migrate: PGHOST "${normalizedHost}" is not a loopback address and MIGRATION_ALLOW_REMOTE ` +
        'is not "yes". If you really intend to migrate a remote development database, set ' +
        'MIGRATION_ALLOW_REMOTE=yes deliberately.',
    );
  }

  return { database: db, host: normalizedHost || 'localhost (pg default)' };
}
