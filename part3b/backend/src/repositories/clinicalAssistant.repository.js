import pool from '../config/db.js';

export async function createSession({ prescriptionId, patientId, startedBy }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO clinical_assistant_sessions (prescription_id, patient_id, started_by)
     VALUES ($1,$2,$3) RETURNING *`,
    [prescriptionId || null, patientId || null, startedBy || null]
  );
  return rows[0];
}

export async function findSession(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM clinical_assistant_sessions WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function findSessionByPrescription(prescriptionId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM clinical_assistant_sessions WHERE prescription_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [prescriptionId]
  );
  return rows[0] || null;
}

export async function insertMessage({ sessionId, role, content, provider, groundingRefs }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO clinical_assistant_messages (session_id, role, content, provider, grounding_refs)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [sessionId, role, content, provider || null, JSON.stringify(groundingRefs || [])]
  );
  return rows[0];
}

export async function listMessages(sessionId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM clinical_assistant_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  return rows;
}
