import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateEntityTypeParam, validateUuidParam } from '../middleware/validateWorkflow.js';
import { PERMISSIONS, ROLES } from '../config/roles.js';
import { AppError } from '../utils/AppError.js';
import { getHistory, getVersion, diff, restore } from '../controllers/versioning.controller.js';

const router = Router();

// Phase 2F (approval A.4): prescription version history is readable by
// clinical roles only; every OTHER entity type keeps its existing
// VERSION_HISTORY_READ authorization unchanged (approval: "preserve
// appropriate authorization for other entity types").
const PRESCRIPTION_HISTORY_ROLES = [
  ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST, ROLES.LAB_TECHNICIAN, ROLES.ADMIN, ROLES.SYSTEM,
];

// The decision runs on a NORMALIZED form of the path param (trim, case-fold,
// one trailing plural "s") so casing, whitespace or a plural spelling of
// "prescription" cannot dodge the check. The repository compares this same
// string verbatim, so the gate and the query can never disagree: a variant
// that skipped this gate could never match rows written under the plain
// spelling, and a variant that does reach those rows is gated here.
export function normalizeEntityTypeParam(value) {
  return String(value ?? '').trim().toLowerCase().replace(/s$/, '');
}

export function requireClinicalPrescriptionHistory(req, res, next) {
  if (normalizeEntityTypeParam(req.params.entityType) !== 'prescription') return next();
  const roles = req.roles || [];
  if (!roles.some((role) => PRESCRIPTION_HISTORY_ROLES.includes(role))) {
    return next(new AppError('Prescription version history requires a clinical role', 403, 'FORBIDDEN'));
  }
  return next();
}

router.get('/:entityType/:entityId', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_READ), requireClinicalPrescriptionHistory, validateEntityTypeParam, validateUuidParam('entityId'), getHistory);
router.get('/:entityType/:entityId/diff', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_READ), requireClinicalPrescriptionHistory, validateEntityTypeParam, validateUuidParam('entityId'), diff);
router.get('/:entityType/:entityId/:versionNumber', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_READ), requireClinicalPrescriptionHistory, validateEntityTypeParam, validateUuidParam('entityId'), getVersion);
// Restore stays on VERSION_HISTORY_RESTORE (admin/system only) — already
// stricter than the clinical read set, so no entity-type check is needed here.
router.post('/:entityType/:entityId/:versionNumber/restore', authenticate, requirePermission(PERMISSIONS.VERSION_HISTORY_RESTORE), validateEntityTypeParam, validateUuidParam('entityId'), restore);

export default router;
