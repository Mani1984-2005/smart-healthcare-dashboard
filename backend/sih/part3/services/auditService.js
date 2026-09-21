// Append-only audit trail. Records WHO did WHAT to WHICH resource and WHEN. Never stores document text, values or file names (no PHI).
import crypto from "node:crypto";

export function createAuditService(store, logger = console) {
  return {
    record({ actor, action, resourceType, resourceId, patientId = null, outcome = "success", requestId = null, details = {} }) {
      try {
        store.appendAudit({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          actor: actor ? { id: actor.id, role: actor.role } : null,
          action,
          resourceType,
          resourceId,
          patientId,
          outcome,
          requestId,
          source: "part3-api",
          details,
        });
      } catch (err) {
        // Auditing must not break the clinical workflow, but a failure must be visible to developers.
        logger.error(JSON.stringify({ level: "error", service: "part3", code: "AUDIT_WRITE_FAILED", message: err.message }));
      }
    },
    list: (filter) => store.listAudit(filter),
  };
}
