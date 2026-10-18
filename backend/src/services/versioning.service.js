import { AppError } from '../utils/AppError.js';
import * as versioningRepo from '../repositories/versioning.repository.js';

/**
 * Generic, entity-agnostic version history. Any service in the codebase
 * can call recordVersion(...) after a meaningful mutation (prescription
 * edit, invoice change, patient record update, approval decision) without
 * this module knowing anything about that entity's shape — `payload` is
 * an opaque JSON snapshot. This keeps the versioning concern orthogonal
 * to domain logic (single-responsibility) and reusable across modules
 * (open/closed: new entity types need zero changes here).
 */
export async function recordVersion({ entityType, entityId, payload, changedBy, changeReason }) {
  if (!entityType || !entityId) throw AppError.badRequest('"entityType" and "entityId" are required to record a version.');
  const versionNumber = await versioningRepo.nextVersionNumber(entityType, entityId);
  return versioningRepo.insertVersion({ entityType, entityId, versionNumber, payload, changedBy, changeReason });
}

export async function getHistory(entityType, entityId) {
  return versioningRepo.listVersions(entityType, entityId);
}

export async function getVersion(entityType, entityId, versionNumber) {
  const version = await versioningRepo.findVersion(entityType, entityId, Number(versionNumber));
  if (!version) throw AppError.notFound(`Version ${versionNumber} not found for ${entityType} ${entityId}.`);
  return version;
}

/**
 * Shallow key-level diff between two JSON snapshots — enough for a review
 * UI to highlight "what changed" without a full deep-diff dependency.
 */
export function diffVersions(versionA, versionB) {
  const a = versionA?.payload || {};
  const b = versionB?.payload || {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changes = [];
  for (const key of keys) {
    const before = a[key];
    const after = b[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ field: key, before, after });
    }
  }
  return changes;
}

/**
 * Restoring doesn't overwrite the target entity's live table directly
 * (that responsibility belongs to the owning domain service, which knows
 * how to validate and persist its own shape). Instead this returns the
 * historical payload plus a fresh version entry recording the restore
 * intent, so a domain controller can apply it and the audit trail always
 * shows *why* the current state changed.
 */
export async function prepareRestore(entityType, entityId, versionNumber, restoredBy) {
  const version = await getVersion(entityType, entityId, versionNumber);
  const restoreVersion = await recordVersion({
    entityType, entityId, payload: version.payload, changedBy: restoredBy,
    changeReason: `restored_from_version_${versionNumber}`,
  });
  return { payload: version.payload, versionRecord: restoreVersion };
}
