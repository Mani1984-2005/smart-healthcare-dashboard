// backend/models/IntakeSession.js
//
// Persistence for intake_sessions, conversation_messages, and
// intake_answers — using the CONFIRMED-LIVE db pool (backend/db.js,
// the same one routes/patients.js uses), per Phase 1.5 verification.
// backend/config/db.js is intentionally NOT used (confirmed dead path).
//
// NOTE: These functions require a live, migrated Postgres database to
// actually run. As documented in the implementation report, no such
// database is reachable in this environment, so this module has not
// been exercised against a real database — only unit-tested with an
// injected in-memory fake (see backend/tests/fixtures/inMemoryStore.js).

import pool from "../db.js";

export async function insertSession(session) {
  const { rows } = await pool.query(
    `INSERT INTO intake_sessions
      (id, patient_id, encounter_id, status, language, interaction_mode, intake_mode,
       consent_given, consent_captured_at, session_token_hash, created_by_staff_uid,
       started_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      session.id,
      session.patientId,
      session.encounterId ?? null,
      session.status,
      session.language ?? null,
      session.interactionMode ?? null,
      session.intakeMode,
      session.consentGiven,
      session.consentCapturedAt ?? null,
      session.sessionTokenHash,
      session.createdByStaffUid ?? null,
      session.startedAt,
      session.updatedAt,
    ]
  );
  return rows[0];
}

export async function findSessionById(id) {
  const { rows } = await pool.query(`SELECT * FROM intake_sessions WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function updateSession(id, patch) {
  const fields = Object.keys(patch);
  if (fields.length === 0) return findSessionById(id);
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const { rows } = await pool.query(
    `UPDATE intake_sessions SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, ...fields.map((f) => patch[f])]
  );
  return rows[0] ?? null;
}

/** Idempotent completion: only transitions rows that are NOT already COMPLETED. */
export async function completeSessionIfNotAlready(id) {
  const { rows } = await pool.query(
    `UPDATE intake_sessions
     SET status = 'COMPLETED', completed_at = now(), updated_at = now()
     WHERE id = $1 AND status != 'COMPLETED'
     RETURNING *`,
    [id]
  );
  return rows[0] ?? null; // null means it was already COMPLETED (idempotent no-op)
}

export async function insertMessage(message) {
  const { rows } = await pool.query(
    `INSERT INTO conversation_messages (id, session_id, role, content, input_mode, language, question_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      message.id,
      message.sessionId,
      message.role,
      message.content,
      message.inputMode ?? null,
      message.language ?? null,
      message.questionId ?? null,
      message.createdAt,
    ]
  );
  return rows[0];
}

export async function upsertAnswer(answer) {
  const { rows } = await pool.query(
    `INSERT INTO intake_answers
      (id, session_id, question_id, section, answer_type, raw_value, certainty, source, source_message_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
     ON CONFLICT (session_id, question_id)
     DO UPDATE SET raw_value = EXCLUDED.raw_value, certainty = EXCLUDED.certainty,
                   source = EXCLUDED.source, source_message_id = EXCLUDED.source_message_id,
                   updated_at = now()
     RETURNING *`,
    [
      answer.id,
      answer.sessionId,
      answer.questionId,
      answer.section,
      answer.answerType,
      JSON.stringify(answer.rawValue),
      answer.certainty,
      answer.source,
      answer.sourceMessageId ?? null,
      answer.capturedAt,
    ]
  );
  return rows[0];
}

export async function listAnswers(sessionId) {
  const { rows } = await pool.query(
    `SELECT * FROM intake_answers WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  return rows;
}
