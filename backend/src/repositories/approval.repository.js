import pool from '../config/db.js';

export async function insertApprovalRequest(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO approval_requests
       (entity_type, entity_id, action, requested_by, required_role, payload, reason, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
     RETURNING *`,
    [
      data.entityType, data.entityId, data.action, data.requestedBy || null,
      data.requiredRole || null, JSON.stringify(data.payload || {}), data.reason || null,
    ]
  );
  return rows[0];
}

export async function findById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM approval_requests WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function listQueue({ status, entityType, requiredRole, limit = 50, offset = 0 } = {}, client = pool) {
  const clauses = [];
  const params = [];
  let i = 1;
  if (status) { clauses.push(`status = $${i++}`); params.push(status); }
  if (entityType) { clauses.push(`entity_type = $${i++}`); params.push(entityType); }
  if (requiredRole) { clauses.push(`(required_role = $${i++} OR required_role IS NULL)`); params.push(requiredRole); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit, offset);
  const { rows } = await client.query(
    `SELECT * FROM approval_requests ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return rows;
}

export async function updateStatus(id, { status, decidedBy, decisionNote }, client = pool) {
  const { rows } = await client.query(
    `UPDATE approval_requests
     SET status = $2, decided_by = $3, decision_note = $4, decided_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, status, decidedBy || null, decisionNote || null]
  );
  return rows[0] || null;
}

export async function updateRequiredRole(id, requiredRole, client = pool) {
  const { rows } = await client.query(
    `UPDATE approval_requests SET required_role = $2 WHERE id = $1 RETURNING *`,
    [id, requiredRole]
  );
  return rows[0] || null;
}

export async function insertAction(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO approval_actions (approval_request_id, actor_id, action, note)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.approvalRequestId, data.actorId || null, data.action, data.note || null]
  );
  return rows[0];
}

export async function listActions(approvalRequestId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM approval_actions WHERE approval_request_id = $1 ORDER BY created_at ASC`,
    [approvalRequestId]
  );
  return rows;
}
