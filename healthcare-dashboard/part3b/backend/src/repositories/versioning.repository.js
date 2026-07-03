import pool from '../config/db.js';

export async function nextVersionNumber(entityType, entityId, client = pool) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM entity_versions WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, entityId]
  );
  return rows[0].next;
}

export async function insertVersion(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO entity_versions (entity_type, entity_id, version_number, payload, changed_by, change_reason)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.entityType, data.entityId, data.versionNumber, JSON.stringify(data.payload || {}), data.changedBy || null, data.changeReason || null]
  );
  return rows[0];
}

export async function listVersions(entityType, entityId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, entity_type, entity_id, version_number, changed_by, change_reason, created_at
     FROM entity_versions WHERE entity_type = $1 AND entity_id = $2 ORDER BY version_number DESC`,
    [entityType, entityId]
  );
  return rows;
}

export async function findVersion(entityType, entityId, versionNumber, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM entity_versions WHERE entity_type = $1 AND entity_id = $2 AND version_number = $3`,
    [entityType, entityId, versionNumber]
  );
  return rows[0] || null;
}

export async function findLatestVersion(entityType, entityId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM entity_versions WHERE entity_type = $1 AND entity_id = $2 ORDER BY version_number DESC LIMIT 1`,
    [entityType, entityId]
  );
  return rows[0] || null;
}
