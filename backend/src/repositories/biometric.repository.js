import pool from '../config/db.js';

export async function insertCredential(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO biometric_credentials (user_id, credential_id, public_key, device_label, modality, sign_count)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.userId, data.credentialId, data.publicKey, data.deviceLabel || null, data.modality || 'platform', 0]
  );
  return rows[0];
}

export async function findCredentialById(credentialId, client = pool) {
  const { rows } = await client.query(`SELECT * FROM biometric_credentials WHERE credential_id = $1 AND revoked_at IS NULL`, [credentialId]);
  return rows[0] || null;
}

export async function listCredentialsForUser(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, credential_id, device_label, modality, sign_count, created_at, last_used_at
     FROM biometric_credentials WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function touchCredential(credentialId, signCount, client = pool) {
  await client.query(
    `UPDATE biometric_credentials SET sign_count = $2, last_used_at = now() WHERE credential_id = $1`,
    [credentialId, signCount]
  );
}

export async function revokeCredential(credentialId, userId, client = pool) {
  const { rows } = await client.query(
    `UPDATE biometric_credentials SET revoked_at = now() WHERE credential_id = $1 AND user_id = $2 RETURNING *`,
    [credentialId, userId]
  );
  return rows[0] || null;
}

export async function insertChallenge(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO biometric_challenges (user_id, purpose, challenge, expires_at)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.userId, data.purpose, data.challenge, data.expiresAt]
  );
  return rows[0];
}

export async function consumeChallenge(challengeId, client = pool) {
  const { rows } = await client.query(
    `UPDATE biometric_challenges SET consumed_at = now()
     WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING *`,
    [challengeId]
  );
  return rows[0] || null;
}
