// =============================================================================
// Medicare Pro — PostgreSQL connection layer
//
// Design rule (non-negotiable): there is NO silent fallback. If PostgreSQL is
// unreachable, queries throw. They are never served from an in-memory store,
// a mock, or any fabricated dataset. Callers must surface a real error.
// =============================================================================

import pkg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pkg;

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Surface unexpected pool-level errors (e.g. a client failing mid-query).
pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

// -----------------------------------------------------------------------------
// Health probing
// -----------------------------------------------------------------------------

/**
 * Cheap connectivity probe used by the /api/health endpoint.
 * Reports the truth: no fabricated success, no swallowed failure.
 *
 * @returns {Promise<{ok: boolean, latencyMs: number|null, error: string|null}>}
 *          `error` is a short, sanitized reason — never a connection string,
 *          password, or raw driver stack.
 */
export async function probeDatabase() {
  const startedAt = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    return { ok: true, latencyMs: Date.now() - startedAt, error: null };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: sanitizeDbError(err),
    };
  }
}

/**
 * Boolean connectivity check, kept for callers that only need yes/no.
 * Returns false on failure — it never throws and never fabricates success.
 */
export async function checkDbConnection() {
  const probe = await probeDatabase();
  if (probe.ok) {
    logger.info('PostgreSQL connection verified', { latencyMs: probe.latencyMs });
  } else {
    logger.warn('PostgreSQL unreachable', { reason: probe.error });
  }
  return probe.ok;
}

/**
 * Map a driver error to a short, non-sensitive reason string.
 * Deliberately omits host, port, user, database name and password.
 */
function sanitizeDbError(err) {
  if (!err) return 'unknown_error';
  const code = err.code || null;
  switch (code) {
    case 'ECONNREFUSED':
      return 'connection_refused';
    case 'ETIMEDOUT':
    case 'CONNECT_TIMEOUT':
      return 'connection_timeout';
    case 'ENOTFOUND':
      return 'host_not_found';
    case '28P01':
      return 'authentication_failed';
    case '3D000':
      return 'database_not_found';
    case '28000':
      return 'authorization_failed';
    default:
      // Fall back to the driver's own short code/name only.
      return code ? String(code).toLowerCase() : 'unavailable';
  }
}

// -----------------------------------------------------------------------------
// Transactions
// -----------------------------------------------------------------------------

/**
 * Run `fn(client)` inside a transaction. Commits on resolve, rolls back on
 * throw. Use this for any multi-statement clinical, inventory or financial
 * operation so partial writes can never be persisted.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('Transaction rollback failed', { error: rollbackErr.message });
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close the pool. Used by the migration runner and by tests so the process
 * can exit instead of hanging on open handles.
 */
export async function closePool() {
  await pool.end();
}

export default pool;
