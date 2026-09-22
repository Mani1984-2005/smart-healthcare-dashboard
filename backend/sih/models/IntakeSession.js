// backend/sih/models/IntakeSession.js
//
// Persistence for intake_sessions, conversation_messages, and
// intake_answers.
//
// PHASE 3 — DATABASE INTEGRATION: this module was migrated from the raw
// `pg` pool (backend/sih/db.js) to the shared MediCare Pro Prisma client
// (backend/db.js) — the SAME single PrismaClient instance every other
// host module already uses. No second PrismaClient and no second
// database were introduced.
//
// The SIH Prisma models (IntakeSession / ConversationMessage /
// IntakeAnswer) already map 1:1 onto the exact tables this module has
// always targeted (intake_sessions / conversation_messages /
// intake_answers), so the public API and its return shapes are
// deliberately UNCHANGED: every function still accepts and returns the
// same snake_case row shape the intakeService contract depends on
// (`session_token_hash`, `raw_value`, `source_message_id`, ...). Each
// Prisma record is mapped back to that snake_case shape so no caller
// needs to change.

import prisma from "../../db.js";

/** Coerce a patientId to the integer the `patients.id` FK requires, or null. */
function toInt(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) ? n : null;
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    patient_id: row.patientId,
    encounter_id: row.encounterId ?? null,
    status: row.status,
    language: row.language ?? null,
    interaction_mode: row.interactionMode ?? null,
    intake_mode: row.intakeMode,
    consent_given: row.consentGiven,
    consent_captured_at: row.consentCapturedAt ?? null,
    session_token_hash: row.sessionTokenHash ?? null,
    created_by_staff_uid: row.createdByStaffUid ?? null,
    started_at: row.startedAt,
    updated_at: row.updatedAt,
    completed_at: row.completedAt ?? null,
  };
}

function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    session_id: row.sessionId,
    role: row.role,
    content: row.content,
    input_mode: row.inputMode ?? null,
    language: row.language ?? null,
    question_id: row.questionId ?? null,
    created_at: row.createdAt,
  };
}

function mapAnswer(row) {
  if (!row) return null;
  return {
    id: row.id,
    session_id: row.sessionId,
    question_id: row.questionId,
    section: row.section,
    answer_type: row.answerType,
    raw_value: row.rawValue,
    certainty: row.certainty,
    source: row.source,
    source_message_id: row.sourceMessageId ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

// The service builds its update patch with snake_case column keys (the
// shape the old raw-pg UPDATE used). Map them explicitly to Prisma fields
// so that contract is preserved verbatim.
const SESSION_PATCH_MAP = {
  language: "language",
  interaction_mode: "interactionMode",
  intake_mode: "intakeMode",
  consent_given: "consentGiven",
  consent_captured_at: "consentCapturedAt",
  status: "status",
  encounter_id: "encounterId",
};

export async function insertSession(session) {
  const row = await prisma.intakeSession.create({
    data: {
      id: session.id,
      patientId: toInt(session.patientId),
      encounterId: session.encounterId ?? null,
      status: session.status,
      language: session.language ?? null,
      interactionMode: session.interactionMode ?? null,
      intakeMode: session.intakeMode,
      consentGiven: session.consentGiven,
      consentCapturedAt: session.consentCapturedAt ? new Date(session.consentCapturedAt) : null,
      sessionTokenHash: session.sessionTokenHash,
      createdByStaffUid: session.createdByStaffUid ?? null,
      startedAt: new Date(session.startedAt),
      updatedAt: new Date(session.updatedAt),
    },
  });
  return mapSession(row);
}

export async function findSessionById(id) {
  const row = await prisma.intakeSession.findUnique({ where: { id } });
  return mapSession(row);
}

export async function updateSession(id, patch) {
  const fields = Object.keys(patch ?? {});
  if (fields.length === 0) return findSessionById(id);

  const data = { updatedAt: new Date() };
  for (const key of fields) {
    const prismaField = SESSION_PATCH_MAP[key] ?? key;
    let value = patch[key];
    if (prismaField === "consentCapturedAt" && value) value = new Date(value);
    data[prismaField] = value;
  }

  try {
    const row = await prisma.intakeSession.update({ where: { id }, data });
    return mapSession(row);
  } catch (err) {
    // Preserve the old `rows[0] ?? null` contract: an id that matches no
    // row yields null rather than throwing.
    if (err?.code === "P2025") return null;
    throw err;
  }
}

/** Idempotent completion: only transitions rows that are NOT already COMPLETED. */
export async function completeSessionIfNotAlready(id) {
  const now = new Date();
  const result = await prisma.intakeSession.updateMany({
    where: { id, status: { not: "COMPLETED" } },
    data: { status: "COMPLETED", completedAt: now, updatedAt: now },
  });
  if (result.count === 0) return null; // already COMPLETED (idempotent no-op)
  return findSessionById(id);
}

export async function insertMessage(message) {
  const row = await prisma.conversationMessage.create({
    data: {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      inputMode: message.inputMode ?? null,
      language: message.language ?? null,
      questionId: message.questionId ?? null,
      createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
    },
  });
  return mapMessage(row);
}

export async function upsertAnswer(answer) {
  const fields = {
    section: answer.section,
    answerType: answer.answerType,
    rawValue: answer.rawValue,
    certainty: answer.certainty,
    source: answer.source,
    sourceMessageId: answer.sourceMessageId ?? null,
  };
  const capturedAt = answer.capturedAt ? new Date(answer.capturedAt) : undefined;

  const row = await prisma.intakeAnswer.upsert({
    where: {
      sessionId_questionId: {
        sessionId: answer.sessionId,
        questionId: answer.questionId,
      },
    },
    create: {
      id: answer.id,
      sessionId: answer.sessionId,
      questionId: answer.questionId,
      ...fields,
      createdAt: capturedAt,
      updatedAt: capturedAt,
    },
    update: {
      ...fields,
      updatedAt: new Date(),
    },
  });
  return mapAnswer(row);
}

export async function listAnswers(sessionId) {
  const rows = await prisma.intakeAnswer.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapAnswer);
}