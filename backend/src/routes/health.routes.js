// =============================================================================
// Medicare Pro — Health / readiness endpoints
//
// These endpoints are deliberately PUBLIC (used by container orchestrators and
// load balancers) and therefore must never leak:
//   * credentials, connection strings, host names, ports, database names
//   * SQL text, driver stack traces, or internal file paths
//   * any patient or business data
//
// Status semantics:
//   GET /api/health        200 when fully ready, 503 when a critical dependency
//                          (PostgreSQL) is unavailable. Reports the truth.
//   GET /api/health/live   200 as long as the process is alive (liveness).
//   GET /api/health/ready  200 only when dependencies are healthy (readiness).
// =============================================================================

import { Router } from 'express';

import pool, { probeDatabase } from '../config/db.js';
import { env } from '../config/env.js';

const router = Router();

const startedAt = Date.now();
const SERVICE_NAME = 'medicare-pro-backend';
const SERVICE_VERSION = '3.0.0';

/**
 * Count applied/pending migrations without ever throwing.
 * A missing `schema_migrations` table simply means "not yet migrated".
 */
async function readMigrationState() {
  try {
    const { rows } = await pool.query('SELECT version FROM schema_migrations ORDER BY version DESC');
    return {
      status: 'up_to_date',
      applied: rows.length,
      latest: rows.length > 0 ? rows[0].version : null,
    };
  } catch (err) {
    // 42P01 = undefined_table; anything else is a connectivity problem we
    // already surface through probeDatabase(), so stay quiet here.
    if (err && err.code === '42P01') {
      return { status: 'not_initialized', applied: 0, latest: null };
    }
    return { status: 'unknown', applied: null, latest: null };
  }
}

async function buildReport() {
  const db = await probeDatabase();
  const migrations = await readMigrationState();

  return {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    status: db.ok ? 'ok' : 'degraded',
    environment: env.nodeEnv,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    dependencies: {
      // `reason` is already sanitized by probeDatabase() — no host/user/SQL.
      database: {
        status: db.ok ? 'connected' : 'unavailable',
        latencyMs: db.latencyMs,
        ...(db.ok ? {} : { reason: db.error }),
      },
      migrations,
    },
    timestamp: new Date().toISOString(),
  };
}

// Combined liveness + readiness — the primary endpoint.
router.get('/', async (req, res) => {
  const report = await buildReport();
  res.status(report.status === 'ok' ? 200 : 503).json(report);
});

// Liveness: is the process running? Never checks dependencies.
router.get('/live', (req, res) => {
  res.status(200).json({
    service: SERVICE_NAME,
    status: 'alive',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Readiness: can we actually serve traffic right now?
router.get('/ready', async (req, res) => {
  const report = await buildReport();
  res.status(report.status === 'ok' ? 200 : 503).json(report);
});

export default router;
