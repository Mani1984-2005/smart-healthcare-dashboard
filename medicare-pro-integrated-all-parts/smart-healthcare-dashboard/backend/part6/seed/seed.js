// Idempotent seeding of the Part 6 dataset. Consents are created through the same shape the service uses,
// with timestamps relative to the (controllable) clock so the demo always has a realistic mix of states.
import { COLLECTIONS } from "../store/repository.js";
import { CONSENT_STATUS } from "../domain/constants.js";
import { SYSTEM_ACTOR } from "../audit/auditService.js";
import { ORGANIZATIONS, USERS, PATIENTS, IDENTITY_LINKS, SOURCE_RECORDS } from "./demoData.js";

const DAY = 86_400_000;
export const DEFAULT_SETTINGS = Object.freeze({ maxConsentDurationDays: 90, defaultConsentDurationDays: 30 });

function seedConsent(repo, clock, fields) {
  const seq = repo.nextSeq("consent");
  const id = `CONS-DEMO-${String(seq).padStart(3, "0")}`;
  const now = clock.now().getTime();
  const created = new Date(now - fields.createdDaysAgo * DAY);
  const c = {
    id,
    patientId: fields.patientId,
    origin: fields.origin ?? "provider-request",
    requester: fields.requester,
    recipientOrgId: fields.recipientOrgId,
    purpose: fields.purpose,
    requestedCategories: fields.categories,
    grantedCategories: [],
    requestedDurationDays: fields.durationDays,
    durationDays: null,
    status: fields.status,
    createdAt: created.toISOString(),
    decidedAt: null,
    decidedBy: null,
    grantedAt: null,
    expiresAt: null,
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    denialReason: null,
    note: fields.note ?? null,
    history: [{ at: created.toISOString(), status: CONSENT_STATUS.PENDING, by: fields.requester.userName }],
  };
  if (fields.status !== CONSENT_STATUS.PENDING) {
    const decided = new Date(created.getTime() + 3_600_000);
    c.decidedAt = decided.toISOString();
    c.decidedBy = fields.patientName;
    if (fields.status === CONSENT_STATUS.DENIED) {
      c.history.push({ at: c.decidedAt, status: CONSENT_STATUS.DENIED, by: fields.patientName });
    } else {
      c.grantedCategories = fields.grantedCategories ?? fields.categories;
      c.durationDays = fields.durationDays;
      c.grantedAt = c.decidedAt;
      c.expiresAt = new Date(decided.getTime() + fields.durationDays * DAY).toISOString();
      c.history.push({ at: c.decidedAt, status: CONSENT_STATUS.GRANTED, by: fields.patientName });
      if (fields.status === CONSENT_STATUS.REVOKED) {
        c.revokedAt = new Date(decided.getTime() + DAY).toISOString();
        c.revokedBy = fields.patientName;
        c.revocationReason = "Seeded example: revoked by patient.";
        c.history.push({ at: c.revokedAt, status: CONSENT_STATUS.REVOKED, by: fields.patientName });
      }
      if (fields.status === CONSENT_STATUS.EXPIRED) {
        c.history.push({ at: c.expiresAt, status: CONSENT_STATUS.EXPIRED, by: "System" });
      }
    }
  }
  repo.put(COLLECTIONS.consents, id, c);
}

export function seedIfEmpty({ repo, clock, audit }) {
  if (repo.getMeta("seeded", false)) return false;

  for (const o of ORGANIZATIONS) repo.put(COLLECTIONS.organizations, o.id, o);
  for (const u of USERS) repo.put(COLLECTIONS.users, u.id, u);
  for (const p of PATIENTS) repo.put(COLLECTIONS.patients, p.id, p);
  for (const l of IDENTITY_LINKS) repo.put(COLLECTIONS.identityLinks, l.id, l);
  for (const r of SOURCE_RECORDS) repo.put(COLLECTIONS.sourceRecords, r.id, r);
  repo.put(COLLECTIONS.settings, "global", { ...DEFAULT_SETTINGS });

  const clinicDoc = { orgId: "ORG-DEMO-002", orgName: "Demo Community Clinic", userId: "USR-DOC-002", userName: "Dr. Demo Two" };
  const hospDoc = { orgId: "ORG-DEMO-001", orgName: "MediCare Demo Hospital", userId: "USR-DOC-001", userName: "Dr. Demo User" };

  // A realistic mix so the dashboard/consent screens are meaningful before any interaction.
  seedConsent(repo, clock, { patientId: "MCP-DEMO-001", patientName: "Demo Patient", requester: clinicDoc, recipientOrgId: "ORG-DEMO-002", purpose: "CARE_CONTINUITY", categories: ["clinical-history", "medications", "allergies"], grantedCategories: ["medications", "allergies"], durationDays: 30, status: CONSENT_STATUS.GRANTED, createdDaysAgo: 3 });
  seedConsent(repo, clock, { patientId: "MCP-DEMO-001", patientName: "Demo Patient", requester: clinicDoc, recipientOrgId: "ORG-DEMO-002", purpose: "REFERRAL", categories: ["lab-reports", "diagnostic-reports"], durationDays: 14, status: CONSENT_STATUS.PENDING, createdDaysAgo: 1 });
  seedConsent(repo, clock, { patientId: "MCP-DEMO-001", patientName: "Demo Patient", requester: clinicDoc, recipientOrgId: "ORG-DEMO-002", purpose: "CLINICAL_CARE", categories: ["documents"], durationDays: 10, status: CONSENT_STATUS.EXPIRED, createdDaysAgo: 40 });
  seedConsent(repo, clock, { patientId: "MCP-DEMO-002", patientName: "Demo Patient Two", requester: hospDoc, recipientOrgId: "ORG-DEMO-001", purpose: "CLINICAL_CARE", categories: ["clinical-history", "lab-reports", "medications"], durationDays: 30, status: CONSENT_STATUS.GRANTED, createdDaysAgo: 2 });
  seedConsent(repo, clock, { patientId: "MCP-DEMO-002", patientName: "Demo Patient Two", requester: hospDoc, recipientOrgId: "ORG-DEMO-001", purpose: "REFERRAL", categories: ["documents", "allergies"], durationDays: 7, status: CONSENT_STATUS.PENDING, createdDaysAgo: 0 });
  seedConsent(repo, clock, { patientId: "MCP-DEMO-002", patientName: "Demo Patient Two", requester: hospDoc, recipientOrgId: "ORG-DEMO-001", purpose: "CLINICAL_CARE", categories: ["diagnostic-reports"], durationDays: 30, status: CONSENT_STATUS.DENIED, createdDaysAgo: 6 });
  seedConsent(repo, clock, { patientId: "MCP-DEMO-002", patientName: "Demo Patient Two", requester: hospDoc, recipientOrgId: "ORG-DEMO-001", purpose: "CARE_CONTINUITY", categories: ["medications"], durationDays: 30, status: CONSENT_STATUS.REVOKED, createdDaysAgo: 12 });

  repo.setMeta("seeded", true);
  audit.append({
    actor: SYSTEM_ACTOR,
    action: "DEMO_SEEDED",
    resource: { type: "Dataset", id: "part6-demo" },
    metadata: { patients: PATIENTS.length, organizations: ORGANIZATIONS.length, users: USERS.length, consents: 7 },
  });
  return true;
}

/**
 * Reset demo data to the pristine seeded state. The audit trail is deliberately PRESERVED (and gets a
 * DEMO_RESET entry): resetting a demo must not be a way to erase evidence of what happened.
 */
export function resetDemo({ repo, clock, audit, actor }) {
  const entries = audit.all();
  const head = repo.getMeta("auditHead");
  const auditSeq = repo.getMeta("seq:audit", 0);
  repo.clearAll();
  for (const e of entries) repo.put(COLLECTIONS.auditLogs, e.id, e);
  if (head) repo.setMeta("auditHead", head);
  repo.setMeta("seq:audit", auditSeq);
  clock.reset();
  audit.append({ actor: actor ?? SYSTEM_ACTOR, action: "DEMO_RESET", resource: { type: "Dataset", id: "part6-demo" }, metadata: { auditEntriesPreserved: entries.length } });
  return seedIfEmpty({ repo, clock, audit });
}
