import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import * as approvalRepo from '../repositories/approval.repository.js';
import * as notificationService from './notification.service.js';
import * as versioningService from './versioning.service.js';

/**
 * Approval execution handlers — the seam between this generic workflow
 * engine and domain modules (billing, pharmacy, prescriptions, ...).
 * A domain module calls registerApprovalHandler(entityType, action, fn)
 * once at startup; when a request for that entityType+action is approved,
 * `fn(entityId, payload, decidedBy)` runs the actual side effect (e.g.
 * void an invoice, release a dispensation). Nothing in this file needs to
 * know about invoices or medicines — new workflows are pure config.
 */
const handlers = new Map();

export function registerApprovalHandler(entityType, action, handler) {
  handlers.set(`${entityType}:${action}`, handler);
}

function keyFor(entityType, action) {
  return `${entityType}:${action}`;
}

export async function createRequest({ entityType, entityId, action, requestedBy, requiredRole, payload, reason }) {
  const request = await approvalRepo.insertApprovalRequest({
    entityType, entityId, action, requestedBy, requiredRole, payload, reason,
  });

  await approvalRepo.insertAction({ approvalRequestId: request.id, actorId: requestedBy, action: 'submitted', note: reason });

  // Snapshot entity state at submission time so reviewers (and the audit
  // trail) can always answer "what did this look like when it was asked
  // for approval" via the version-history endpoints.
  try {
    await versioningService.recordVersion({
      entityType, entityId, payload: payload || {}, changedBy: requestedBy, changeReason: `approval_requested:${action}`,
    });
  } catch (err) {
    logger.warn('Failed to snapshot version on approval request', { error: err.message });
  }

  return request;
}

export async function getQueue(filters) {
  return approvalRepo.listQueue(filters);
}

export async function getRequest(id) {
  const request = await approvalRepo.findById(id);
  if (!request) throw AppError.notFound('Approval request not found.');
  const actions = await approvalRepo.listActions(id);
  return { request, actions };
}

export async function decide(id, { decision, decidedBy, note }) {
  if (!['approve', 'reject'].includes(decision)) throw AppError.badRequest('"decision" must be "approve" or "reject".');

  const request = await approvalRepo.findById(id);
  if (!request) throw AppError.notFound('Approval request not found.');
  if (request.status !== 'pending') throw AppError.conflict(`Request is already "${request.status}".`);

  const status = decision === 'approve' ? 'approved' : 'rejected';
  const updated = await approvalRepo.updateStatus(id, { status, decidedBy, decisionNote: note });
  if (!updated) throw AppError.conflict('Request was already decided by another reviewer.');

  await approvalRepo.insertAction({ approvalRequestId: id, actorId: decidedBy, action: status, note });

  if (status === 'approved') {
    const handler = handlers.get(keyFor(request.entity_type, request.action));
    if (handler) {
      try {
        await handler(request.entity_id, request.payload, decidedBy);
      } catch (err) {
        logger.error('Approval handler execution failed', { entityType: request.entity_type, action: request.action, error: err.message });
        throw AppError.internal(`Approved, but executing "${request.action}" failed: ${err.message}`);
      }
    } else {
      logger.warn('No approval handler registered — decision recorded with no automatic side effect', {
        entityType: request.entity_type, action: request.action,
      });
    }
  }

  if (request.requested_by) {
    await notificationService.dispatch({
      userId: request.requested_by,
      category: 'approval_decision',
      title: `Your ${request.action} request was ${status}`,
      body: note || `Decision made on ${request.entity_type} ${request.entity_id}.`,
      entityType: request.entity_type,
      entityId: request.entity_id,
      priority: status === 'rejected' ? 'high' : 'normal',
    });
  }

  return updated;
}

export async function escalate(id, { escalatedBy, note, newRequiredRole }) {
  const request = await approvalRepo.findById(id);
  if (!request) throw AppError.notFound('Approval request not found.');
  if (request.status !== 'pending') throw AppError.conflict(`Only pending requests can be escalated (current status: "${request.status}").`);

  await approvalRepo.insertAction({ approvalRequestId: id, actorId: escalatedBy, action: 'escalated', note });
  // Escalation re-targets the required reviewer role; the request itself
  // stays "pending" so it remains actionable.
  const requiredRole = newRequiredRole || 'admin';
  const updated = await approvalRepo.updateRequiredRole(id, requiredRole);
  return { ...updated, escalated: true };
}
