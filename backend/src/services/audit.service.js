import pool from '../config/db.js';
import { logger } from '../utils/logger.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Records an immutable audit trail entry. Never throws — audit logging
 * must not break the primary request flow, so failures are only logged.
 */
export async function recordAudit({
  userId = SYSTEM_USER_ID,
  prescriptionId = null,
  action,
  details = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, prescription_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, prescriptionId, action, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (err) {
    logger.error('Failed to record audit log', { action, error: err.message });
  }
}

export function auditContextFromRequest(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}
