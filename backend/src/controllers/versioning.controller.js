import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as versioningService from '../services/versioning.service.js';

export const getHistory = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const versions = await versioningService.getHistory(entityType, entityId);
  res.json({ success: true, data: versions });
});

export const getVersion = asyncHandler(async (req, res) => {
  const { entityType, entityId, versionNumber } = req.params;
  const version = await versioningService.getVersion(entityType, entityId, versionNumber);
  res.json({ success: true, data: version });
});

export const diff = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const { from, to } = req.query;
  if (!from || !to) throw AppError.badRequest('Query params "from" and "to" (version numbers) are required.');
  const [versionA, versionB] = await Promise.all([
    versioningService.getVersion(entityType, entityId, from),
    versioningService.getVersion(entityType, entityId, to),
  ]);
  res.json({ success: true, data: { from: versionA.version_number, to: versionB.version_number, changes: versioningService.diffVersions(versionA, versionB) } });
});

export const restore = asyncHandler(async (req, res) => {
  const { entityType, entityId, versionNumber } = req.params;
  const result = await versioningService.prepareRestore(entityType, entityId, versionNumber, req.user?.id);

  await recordAudit({
    userId: req.user?.id,
    action: 'ENTITY_VERSION_RESTORED',
    details: { entityType, entityId, versionNumber },
    ...auditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: result,
    meta: { note: 'Payload prepared and snapshotted. The owning module must apply it to the live record.' },
  });
});
