// backend/services/intakeService.js
//
// Team 1 — Intake orchestration. Wires together the question engine,
// clinical history assembler, and persistence layer.
//
// Persistence is INJECTED via `deps` (defaulting to the real
// Postgres-backed models). This is deliberate: it lets the question
// engine / clinical-history / session-lifecycle business logic be
// exercised by fast, deterministic tests (backend/tests/*) using an
// in-memory fake store, without requiring a live database — which, as
// documented in the implementation report, is not reachable in this
// environment. The real models (models/IntakeSession.js,
// models/ClinicalHistory.js) are the default and are what runs in
// production once a database is available.

import crypto from "node:crypto";
import * as IntakeSessionModel from "../models/IntakeSession.js";
import * as ClinicalHistoryModel from "../models/ClinicalHistory.js";
import pool from "../db.js";
import { getNextQuestion, findQuestionById, inferCertaintyFromText, computeCompletion } from "./questionEngine.js";
import { assembleClinicalHistory, ClinicalDataSafetyError } from "./clinicalHistoryService.js";
import { generateSessionToken, hashSessionToken, verifySessionToken } from "./sessionToken.js";

export class IntakeValidationError extends Error {}
export class IntakeNotFoundError extends Error {}
export class IntakeAuthError extends Error {}

const defaultPatientRepo = {
  async exists(patientId) {
    const { rows } = await pool.query("SELECT 1 FROM patients WHERE id = $1", [patientId]);
    return rows.length > 0;
  },
};

const defaultDeps = {
  sessions: IntakeSessionModel,
  histories: ClinicalHistoryModel,
  patients: defaultPatientRepo,
};

// Test seam only: lets automated tests (backend/tests/*) inject an
// in-memory store instead of the real Postgres-backed models, since no
// live database is reachable in this environment. Does NOT change any
// API contract, database schema, or business logic — every exported
// function still defaults to `currentDeps`, which is the real
// Postgres-backed `defaultDeps` unless a test explicitly overrides it.
let currentDeps = defaultDeps;
export function __setDepsForTesting(deps) {
  currentDeps = deps ?? defaultDeps;
}

function answersArrayToMap(answerRows) {
  const map = {};
  for (const row of answerRows) {
    map[row.question_id ?? row.questionId] = {
      // NOTE: for the real Postgres path, `raw_value` is a JSONB column —
      // node-pg already decodes JSONB into a native JS value on read, so
      // no JSON.parse is needed (and would corrupt a plain string value
      // such as "Chest pain for two days"). The in-memory test fixture
      // mirrors this by storing the native value directly, for parity.
      rawValue: row.raw_value ?? row.rawValue,
      certainty: row.certainty,
      source: row.source,
      sourceMessageId: row.source_message_id ?? row.sourceMessageId ?? null,
      section: row.section,
      capturedAt: row.created_at ?? row.capturedAt,
    };
  }
  return map;
}

/** Staff-authenticated: creates a session for a specific existing patient. */
export async function createSession({ patientId, encounterId = null, intakeMode = "STANDARD", staffUid }, deps = currentDeps) {
  if (!patientId) throw new IntakeValidationError("patientId is required");
  if (!staffUid) throw new IntakeAuthError("Session creation requires an authenticated staff identity");

  const patientExists = await deps.patients.exists(patientId);
  if (!patientExists) throw new IntakeNotFoundError(`No patient found for patientId ${patientId}`);

  const rawToken = generateSessionToken();
  const now = new Date().toISOString();
  const session = await deps.sessions.insertSession({
    id: crypto.randomUUID(),
    patientId,
    encounterId,
    status: "CREATED",
    intakeMode,
    consentGiven: false,
    sessionTokenHash: hashSessionToken(rawToken),
    createdByStaffUid: staffUid,
    startedAt: now,
    updatedAt: now,
  });

  return { session: toApiSession(session), sessionToken: rawToken };
}

/** Verifies a kiosk-presented token against the session it claims to belong to. */
export async function authorizeSessionToken(sessionId, rawToken, deps = currentDeps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");
  const hash = session.session_token_hash ?? session.sessionTokenHash;
  if (!verifySessionToken(rawToken, hash)) {
    throw new IntakeAuthError("Invalid session token for this session");
  }
  return session;
}

export async function getSessionState(sessionId, deps = currentDeps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");
  const answerRows = await deps.sessions.listAnswers(sessionId);
  const answers = answersArrayToMap(answerRows);
  const intakeMode = session.intake_mode ?? session.intakeMode ?? "STANDARD";
  const nextQuestion = getNextQuestion(answers, intakeMode);
  return { session: toApiSession(session), answers, nextQuestion };
}

export async function updateSessionFields(sessionId, patch, deps = currentDeps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");
  if ((session.status ?? session.status) === "COMPLETED") {
    throw new IntakeValidationError("Cannot modify a completed session");
  }
  const dbPatch = {};
  if (patch.language !== undefined) dbPatch.language = patch.language;
  if (patch.interactionMode !== undefined) dbPatch.interaction_mode = patch.interactionMode;
  if (patch.intakeMode !== undefined) dbPatch.intake_mode = patch.intakeMode;
  if (patch.consentGiven !== undefined) {
    dbPatch.consent_given = patch.consentGiven;
    dbPatch.consent_captured_at = new Date().toISOString();
  }
  if (session.status === "CREATED" && Object.keys(dbPatch).length > 0) {
    dbPatch.status = "IN_PROGRESS";
  }
  const updated = await deps.sessions.updateSession(sessionId, dbPatch);
  return toApiSession(updated);
}

export async function appendMessage(sessionId, { role, content, inputMode, language, questionId }, deps = currentDeps) {
  if (!["SYSTEM", "ASSISTANT", "PATIENT"].includes(role)) {
    throw new IntakeValidationError("Invalid message role");
  }
  const message = await deps.sessions.insertMessage({
    id: crypto.randomUUID(),
    sessionId,
    role,
    content,
    inputMode,
    language,
    questionId,
    createdAt: new Date().toISOString(),
  });
  return message;
}

/**
 * Submits a structured answer, advances the deterministic engine, and
 * returns the next question. Every answer written here goes through
 * assertSafeFact indirectly via assembleClinicalHistory downstream —
 * but we also validate the answerType/source combination up front so
 * an obviously malformed request is rejected before it's ever stored.
 */
export async function submitAnswer(sessionId, { questionId, rawValue, certainty, source, sourceMessageId, inputMode }, deps = currentDeps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");
  if (session.status === "COMPLETED") throw new IntakeValidationError("Cannot answer a completed session");

  const question = findQuestionById(questionId);
  if (!question) throw new IntakeValidationError(`Unknown questionId: ${questionId}`);

  const resolvedCertainty =
    certainty ?? (typeof rawValue === "string" ? inferCertaintyFromText(rawValue) : "CONFIRMED");
  const resolvedSource = source ?? (inputMode === "VOICE" ? "PATIENT_VOICE" : "PATIENT_TEXT");

  if (resolvedSource === "AI_DERIVED" && resolvedCertainty === "CONFIRMED") {
    throw new IntakeValidationError("AI-derived answers can never be stored as CONFIRMED");
  }

  const saved = await deps.sessions.upsertAnswer({
    id: crypto.randomUUID(),
    sessionId,
    questionId: question.questionId,
    section: question.section,
    answerType: question.answerType,
    rawValue,
    certainty: resolvedCertainty,
    source: resolvedSource,
    sourceMessageId,
    capturedAt: new Date().toISOString(),
  });

  const answerRows = await deps.sessions.listAnswers(sessionId);
  const answers = answersArrayToMap(answerRows);
  const intakeMode = session.intake_mode ?? session.intakeMode ?? "STANDARD";
  const nextQuestion = getNextQuestion(answers, intakeMode);

  if (session.status === "CREATED") {
    await deps.sessions.updateSession(sessionId, { status: "IN_PROGRESS" });
  }

  return { answer: saved, nextQuestion, completion: computeCompletion(answers, intakeMode) };
}

async function buildAndPersistHistory(sessionId, deps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");
  const answerRows = await deps.sessions.listAnswers(sessionId);
  const flatAnswers = answerRows.map((row) => ({
    questionId: row.question_id ?? row.questionId,
    section: row.section,
    rawValue: row.raw_value ?? row.rawValue,
    certainty: row.certainty,
    source: row.source,
    sourceMessageId: row.source_message_id ?? row.sourceMessageId ?? null,
    capturedAt: row.created_at ?? row.capturedAt,
  }));
  const intakeMode = session.intake_mode ?? session.intakeMode ?? "STANDARD";

  let history;
  try {
    history = assembleClinicalHistory(flatAnswers, intakeMode);
  } catch (err) {
    if (err instanceof ClinicalDataSafetyError) {
      throw new IntakeValidationError(`Clinical data safety violation: ${err.message}`);
    }
    throw err;
  }

  await deps.histories.upsertClinicalHistory({
    id: crypto.randomUUID(),
    sessionId,
    patientId: session.patient_id ?? session.patientId,
    historyJson: history,
    completionStatus: history.completion.status,
  });

  return history;
}

export async function getHistory(sessionId, deps = currentDeps) {
  return buildAndPersistHistory(sessionId, deps);
}

export async function editAnswer(sessionId, { questionId, rawValue }, deps = currentDeps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");
  if (session.status === "COMPLETED") throw new IntakeValidationError("Cannot edit a completed session's history");

  await submitAnswer(sessionId, { questionId, rawValue }, deps);
  return buildAndPersistHistory(sessionId, deps);
}

export async function completeSession(sessionId, deps = currentDeps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");

  if (session.status === "COMPLETED") {
    // Idempotent: return the already-completed state rather than erroring.
    const history = await deps.histories.findBySessionId(sessionId);
    return { status: "COMPLETED", completedAt: session.completed_at ?? session.completedAt, history };
  }

  const history = await buildAndPersistHistory(sessionId, deps);
  const completed = await deps.sessions.completeSessionIfNotAlready(sessionId);
  if (completed) {
    await deps.histories.markCompleted(sessionId);
  }
  return { status: "COMPLETED", completedAt: completed?.completed_at ?? new Date().toISOString(), history };
}

/** Staff-authenticated read for Teams 4/5/6. */
export async function exportSession(sessionId, deps = currentDeps) {
  const session = await deps.sessions.findSessionById(sessionId);
  if (!session) throw new IntakeNotFoundError("Session not found");
  const history = await deps.histories.findBySessionId(sessionId);
  const messages = deps.sessions.listMessages ? await deps.sessions.listMessages(sessionId) : undefined;
  return {
    session: toApiSession(session),
    history: history ? (typeof history.history_json === "string" ? JSON.parse(history.history_json) : history.history_json ?? history.historyJson) : null,
    conversationSummary: messages,
  };
}

function toApiSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id ?? row.patientId,
    encounterId: row.encounter_id ?? row.encounterId ?? null,
    status: row.status,
    language: row.language ?? null,
    interactionMode: row.interaction_mode ?? row.interactionMode ?? null,
    intakeMode: row.intake_mode ?? row.intakeMode ?? "STANDARD",
    consentGiven: row.consent_given ?? row.consentGiven ?? false,
    startedAt: row.started_at ?? row.startedAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    completedAt: row.completed_at ?? row.completedAt ?? null,
  };
}

export const _internal = { answersArrayToMap, toApiSession };
