// backend/sih/models/ClinicalHistory.js
//
// Persistence for the clinical_histories table.
//
// PHASE 3 — DATABASE INTEGRATION: migrated from the raw `pg` pool
// (backend/sih/db.js) to the shared MediCare Pro Prisma client
// (backend/db.js) — the SAME single PrismaClient instance the rest of the
// host uses. The SIH ClinicalHistory Prisma model maps 1:1 onto the
// exact table this module has always targeted (clinical_histories), and
// the public API/return shape is preserved unchanged: callers still get
// the snake_case row shape (`history_json`, `completion_status`,
// `patient_id`, ...) they depended on before.

import prisma from "../../db.js";

function toInt(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) ? n : null;
}

function mapClinicalHistory(row) {
  if (!row) return null;
  return {
    id: row.id,
    session_id: row.sessionId,
    patient_id: row.patientId,
    history_json: row.historyJson,
    completion_status: row.completionStatus,
    version: row.version,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    completed_at: row.completedAt ?? null,
  };
}

export async function upsertClinicalHistory({ id, sessionId, patientId, historyJson, completionStatus }) {
  const now = new Date();
  const row = await prisma.clinicalHistory.upsert({
    where: { sessionId },
    create: {
      id,
      sessionId,
      patientId: toInt(patientId),
      historyJson,
      completionStatus,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      historyJson,
      completionStatus,
      // Matches the old SQL: version is incremented on every update, not
      // reset. Prisma has no direct "increment from current SQL value in
      // the same statement" for a non-atomic upsert path we can rely on,
      // so this preserves the +1-per-update semantics.
      version: { increment: 1 },
      updatedAt: now,
    },
  });
  return mapClinicalHistory(row);
}

export async function markCompleted(sessionId) {
  const now = new Date();
  const result = await prisma.clinicalHistory.updateMany({
    where: { sessionId },
    data: { completionStatus: "COMPLETE", completedAt: now, updatedAt: now },
  });
  if (result.count === 0) return null;
  const row = await prisma.clinicalHistory.findUnique({ where: { sessionId } });
  return mapClinicalHistory(row);
}

export async function findBySessionId(sessionId) {
  const row = await prisma.clinicalHistory.findUnique({ where: { sessionId } });
  return mapClinicalHistory(row);
}