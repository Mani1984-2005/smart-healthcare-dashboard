import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as approvalService from '../services/approval.service.js';

export const createRequest = asyncHandler(async (req, res) => {
  const { entityType, entityId, action, requiredRole, payload, reason } = req.body || {};
  const request = await approvalService.createRequest({
    entityType, entityId, action, requiredRole, payload, reason, requestedBy: req.user?.id,
  });

  await recordAudit({
    userId: req.user?.id,
    action: 'APPROVAL_REQUESTED',
    details: { approvalRequestId: request.id, entityType, entityId, action: request.action },
    ...auditContextFromRequest(req),
  });

  res.status(201).json({ success: true, data: request });
});

export const getQueue = asyncHandler(async (req, res) => {
  const { status = 'pending', entityType } = req.query;
  const rows = await approvalService.getQueue({
    status, entityType, requiredRole: req.roles?.[0], limit: req.pagination?.limit, offset: req.pagination?.offset,
  });
  res.json({ success: true, data: rows });
});

export const getRequest = asyncHandler(async (req, res) => {
  const data = await approvalService.getRequest(req.params.id);
  res.json({ success: true, data });
});

export const decide = asyncHandler(async (req, res) => {
  const { decision, note } = req.body || {};
  const updated = await approvalService.decide(req.params.id, { decision, decidedBy: req.user?.id, note });

  await recordAudit({
    userId: req.user?.id,
    action: decision === 'approve' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
    details: { approvalRequestId: updated.id, entityType: updated.entity_type, entityId: updated.entity_id },
    ...auditContextFromRequest(req),
  });

  res.json({ success: true, data: updated });
});

export const escalate = asyncHandler(async (req, res) => {
  const { note, newRequiredRole } = req.body || {};
  const updated = await approvalService.escalate(req.params.id, { escalatedBy: req.user?.id, note, newRequiredRole });

  await recordAudit({
    userId: req.user?.id,
    action: 'APPROVAL_ESCALATED',
    details: { approvalRequestId: req.params.id, newRequiredRole },
    ...auditContextFromRequest(req),
  });

  res.json({ success: true, data: updated });
});
