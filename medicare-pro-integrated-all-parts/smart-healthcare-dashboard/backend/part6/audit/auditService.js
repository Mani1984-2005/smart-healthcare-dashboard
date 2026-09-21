// Part6AuditService: append-only, hash-chained audit log.
// Each entry stores the SHA-256 of (previous hash + its own canonical content), so any later edit or
// deletion of a stored entry is detectable with verifyChain(). This is tamper-EVIDENT, not tamper-proof:
// a party with full write access to the store could rebuild the chain (production: ship to WORM storage).
import crypto from "node:crypto";
import { COLLECTIONS } from "../store/repository.js";
import { ROLES } from "../domain/constants.js";
import { sanitizeMetadata, maskIp } from "../security/redact.js";

export const AUDIT_ACTIONS = Object.freeze({
  AUTH_LOGIN_SUCCESS: { label: "User Authenticated", category: "authentication", security: false },
  AUTH_LOGIN_FAILED: { label: "Authentication Failed", category: "authentication", security: true },
  AUTH_TOKEN_REJECTED: { label: "Invalid or Missing Credentials", category: "authentication", security: true },
  AUTH_LOGOUT: { label: "User Signed Out", category: "authentication", security: false },
  PERMISSION_DENIED: { label: "Permission Denied", category: "authorization", security: true },
  RATE_LIMITED: { label: "Rate Limit Triggered", category: "authorization", security: true },
  FHIR_RESOURCES_GENERATED: { label: "FHIR Resources Generated", category: "fhir", security: false },
  FHIR_BUNDLE_GENERATED: { label: "FHIR Bundle Generated", category: "fhir", security: false },
  FHIR_VALIDATED: { label: "FHIR Validation Run", category: "fhir", security: false },
  RECORD_ACCESSED: { label: "Record Accessed", category: "fhir", security: false },
  CONSENT_REQUESTED: { label: "Consent Requested", category: "consent", security: false },
  CONSENT_GRANTED: { label: "Consent Granted", category: "consent", security: false },
  CONSENT_DENIED: { label: "Consent Denied", category: "consent", security: false },
  CONSENT_REVOKED: { label: "Consent Revoked", category: "consent", security: true },
  CONSENT_EXPIRED: { label: "Consent Expired", category: "consent", security: false },
  RECORD_SHARED: { label: "Record Shared / Exported", category: "exchange", security: false },
  SHARE_BLOCKED: { label: "Share Blocked", category: "exchange", security: true },
  CONSENT_VIOLATION_ATTEMPT: { label: "Consent Violation Attempt", category: "exchange", security: true },
  SETTINGS_CHANGED: { label: "Settings Changed", category: "admin", security: false },
  DEMO_CLOCK_ADVANCED: { label: "Demo Clock Advanced", category: "admin", security: false },
  DEMO_RESET: { label: "Demo Data Reset", category: "admin", security: false },
  DEMO_SEEDED: { label: "Demo Dataset Seeded", category: "system", security: false },
});

export const ANONYMOUS_ACTOR = Object.freeze({ userId: null, name: "Unknown Request", role: null, orgId: null });
export const SYSTEM_ACTOR = Object.freeze({ userId: "SYSTEM", name: "System", role: "SYSTEM", orgId: null });

export function actorFromUser(user) {
  return user ? { userId: user.id, name: user.displayName, role: user.role, orgId: user.orgId ?? null } : ANONYMOUS_ACTOR;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const GENESIS = "0".repeat(64);

export function createAuditService({ repo, clock }) {
  const C = COLLECTIONS.auditLogs;

  function hashOf(entry, prevHash) {
    const rest = { ...entry };
    delete rest.hash; // the hash covers everything except itself
    return sha256(`${prevHash}|${stable(rest)}`);
  }

  function append({ actor, action, resource, patientId, consentId, status = "success", reason, req, metadata }) {
    const def = AUDIT_ACTIONS[action];
    if (!def) throw new Error(`Unknown audit action: ${action}`);
    const seq = repo.nextSeq("audit");
    const prevHash = repo.getMeta("auditHead", GENESIS);
    const entry = {
      id: `AUD-${String(seq).padStart(5, "0")}`,
      seq,
      ts: clock.now().toISOString(),
      actor: actor ?? ANONYMOUS_ACTOR,
      action,
      label: def.label,
      category: def.category,
      securityEvent: def.security || status !== "success",
      resource: resource ?? null,
      patientId: patientId ?? null,
      consentId: consentId ?? null,
      status,
      reason: reason ?? null,
      requestId: req?.part6?.requestId ?? null,
      ip: maskIp(req?.part6?.ip),
      metadata: sanitizeMetadata(metadata ?? {}),
      prevHash,
    };
    entry.hash = hashOf(entry, prevHash);
    repo.put(C, entry.id, entry);
    repo.setMeta("auditHead", entry.hash);
    return entry;
  }

  const all = () => repo.list(C).sort((a, b) => a.seq - b.seq);

  /** Which entries a given user may see. Returns a predicate. */
  function visibleTo(user, resolveCustodian) {
    switch (user.role) {
      case ROLES.SYSTEM_ADMIN:
        return () => true;
      case ROLES.HOSPITAL_ADMIN:
        return (e) => e.actor.orgId === user.orgId || (e.patientId && resolveCustodian(e.patientId) === user.orgId);
      case ROLES.DOCTOR:
        return (e) => e.actor.userId === user.id; // limited: own actions only
      case ROLES.PATIENT:
        return (e) => e.patientId === user.patientId; // limited: events about own record
      default:
        return () => false;
    }
  }

  function query(user, { resolveCustodian = () => null, filters = {} } = {}) {
    const visible = visibleTo(user, resolveCustodian);
    let rows = all().filter(visible);
    if (filters.action) rows = rows.filter((e) => e.action === filters.action);
    if (filters.category) rows = rows.filter((e) => e.category === filters.category);
    if (filters.status) rows = rows.filter((e) => e.status === filters.status);
    if (filters.securityOnly) rows = rows.filter((e) => e.securityEvent);
    if (filters.patientId) rows = rows.filter((e) => e.patientId === filters.patientId);
    const total = rows.length;
    rows = rows.reverse().slice(0, filters.limit ?? 200); // newest first
    // Patients see a reduced view: no request ids / masked IPs / actor internals beyond name+role.
    if (user.role === ROLES.PATIENT) {
      rows = rows.map(({ requestId: _r, ip: _i, hash: _h, prevHash: _p, ...e }) => ({ ...e, actor: { name: e.actor.name, role: e.actor.role } }));
    }
    return { total, entries: rows };
  }

  function verifyChain() {
    const entries = all();
    let prev = GENESIS;
    for (const e of entries) {
      if (e.prevHash !== prev || hashOf(e, e.prevHash) !== e.hash) {
        return { ok: false, total: entries.length, brokenAt: e.id };
      }
      prev = e.hash;
    }
    if (repo.getMeta("auditHead", GENESIS) !== prev) {
      return { ok: false, total: entries.length, brokenAt: "TAIL (entries removed)" };
    }
    return { ok: true, total: entries.length, brokenAt: null };
  }

  return { append, query, verifyChain, all };
}
