import pool from '../config/db.js';

export async function insertNotification(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO notifications (user_id, category, title, body, entity_type, entity_id, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.userId, data.category, data.title, data.body, data.entityType || null, data.entityId || null, data.priority || 'normal']
  );
  return rows[0];
}

export async function listForUser(userId, { unreadOnly, limit = 50, offset = 0 } = {}, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM notifications
     WHERE user_id = $1 ${unreadOnly ? 'AND read_at IS NULL' : ''}
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

export async function markRead(id, userId, client = pool) {
  const { rows } = await client.query(
    `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING *`,
    [id, userId]
  );
  return rows[0] || null;
}

export async function markAllRead(userId, client = pool) {
  const result = await client.query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [userId]);
  return result.rowCount;
}

export async function countUnread(userId, client = pool) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`, [userId]);
  return rows[0].count;
}

export async function getPreferences(userId, client = pool) {
  const { rows } = await client.query(`SELECT * FROM notification_preferences WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

export async function upsertPreferences(userId, { channels, categoriesMuted }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO notification_preferences (user_id, channels, categories_muted)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET channels = EXCLUDED.channels, categories_muted = EXCLUDED.categories_muted, updated_at = now()
     RETURNING *`,
    [userId, JSON.stringify(channels || ['in_app']), JSON.stringify(categoriesMuted || [])]
  );
  return rows[0];
}
