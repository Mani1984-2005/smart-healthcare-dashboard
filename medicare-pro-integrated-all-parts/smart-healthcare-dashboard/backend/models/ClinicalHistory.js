// backend/models/ClinicalHistory.js
//
// Persistence for the clinical_histories table. Same live-db caveat as
// IntakeSession.js — not exercised against a real Postgres instance in
// this environment (see implementation report, section C).

import pool from "../db.js";

export async function upsertClinicalHistory({ id, sessionId, patientId, historyJson, completionStatus }) {
  const { rows } = await pool.query(
    `INSERT INTO clinical_histories (id, session_id, patient_id, history_json, completion_status, version, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,1,now(),now())
     ON CONFLICT (session_id)
     DO UPDATE SET history_json = EXCLUDED.history_json,
                   completion_status = EXCLUDED.completion_status,
                   version = clinical_histories.version + 1,
                   updated_at = now()
     RETURNING *`,
    [id, sessionId, patientId, JSON.stringify(historyJson), completionStatus]
  );
  return rows[0];
}

export async function markCompleted(sessionId) {
  const { rows } = await pool.query(
    `UPDATE clinical_histories SET completion_status = 'COMPLETE', completed_at = now(), updated_at = now()
     WHERE session_id = $1 RETURNING *`,
    [sessionId]
  );
  return rows[0] ?? null;
}

export async function findBySessionId(sessionId) {
  const { rows } = await pool.query(`SELECT * FROM clinical_histories WHERE session_id = $1`, [sessionId]);
  return rows[0] ?? null;
}
