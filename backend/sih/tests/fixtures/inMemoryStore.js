// backend/tests/fixtures/inMemoryStore.js
//
// TEST-ONLY fixture. Implements the same shape intakeService.js expects
// from `deps.sessions` / `deps.histories` / `deps.patients`, backed by
// plain in-memory objects instead of Postgres.
//
// Why this exists: the live database is unreachable in this environment
// (no DATABASE_URL, no local Postgres — see implementation report).
// This fixture lets Team 1's actual business logic (session lifecycle,
// question engine integration, provenance rules, token isolation) be
// exercised by real, passing/failing automated tests rather than left
// completely unverified. It is NOT a substitute for testing against a
// real database once one is available — that remains a documented
// limitation.

import crypto from "node:crypto";

export function createInMemoryStore({ existingPatientIds = ["patient-1"] } = {}) {
  const sessionsById = new Map();
  const messagesBySession = new Map();
  const answersBySessionAndQuestion = new Map(); // key: `${sessionId}::${questionId}`
  const historiesBySession = new Map();

  const sessions = {
    async insertSession(session) {
      sessionsById.set(session.id, { ...session });
      return { ...session };
    },
    async findSessionById(id) {
      return sessionsById.has(id) ? { ...sessionsById.get(id) } : null;
    },
    async updateSession(id, patch) {
      const existing = sessionsById.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
      sessionsById.set(id, updated);
      return { ...updated };
    },
    async completeSessionIfNotAlready(id) {
      const existing = sessionsById.get(id);
      if (!existing || existing.status === "COMPLETED") return null;
      const updated = { ...existing, status: "COMPLETED", completed_at: new Date().toISOString() };
      sessionsById.set(id, updated);
      return { ...updated };
    },
    async insertMessage(message) {
      const list = messagesBySession.get(message.sessionId) ?? [];
      list.push({ ...message });
      messagesBySession.set(message.sessionId, list);
      return { ...message };
    },
    async listMessages(sessionId) {
      return [...(messagesBySession.get(sessionId) ?? [])];
    },
    async upsertAnswer(answer) {
      const key = `${answer.sessionId}::${answer.questionId}`;
      const row = {
        id: answer.id,
        session_id: answer.sessionId,
        question_id: answer.questionId,
        section: answer.section,
        answer_type: answer.answerType,
        raw_value: answer.rawValue,
        certainty: answer.certainty,
        source: answer.source,
        source_message_id: answer.sourceMessageId ?? null,
        created_at: answer.capturedAt,
        updated_at: answer.capturedAt,
      };
      answersBySessionAndQuestion.set(key, row);
      return row;
    },
    async listAnswers(sessionId) {
      return [...answersBySessionAndQuestion.values()]
        .filter((a) => a.session_id === sessionId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
  };

  const histories = {
    async upsertClinicalHistory({ id, sessionId, patientId, historyJson, completionStatus }) {
      const existing = historiesBySession.get(sessionId);
      const row = {
        id: existing?.id ?? id,
        session_id: sessionId,
        patient_id: patientId,
        history_json: historyJson,
        completion_status: completionStatus,
        version: (existing?.version ?? 0) + 1,
      };
      historiesBySession.set(sessionId, row);
      return row;
    },
    async markCompleted(sessionId) {
      const existing = historiesBySession.get(sessionId);
      if (!existing) return null;
      const updated = { ...existing, completion_status: "COMPLETE" };
      historiesBySession.set(sessionId, updated);
      return updated;
    },
    async findBySessionId(sessionId) {
      return historiesBySession.get(sessionId) ?? null;
    },
  };

  const patients = {
    async exists(patientId) {
      return existingPatientIds.includes(patientId);
    },
  };

  return { sessions, histories, patients, _internal: { sessionsById, answersBySessionAndQuestion } };
}

export function uuid() {
  return crypto.randomUUID();
}
