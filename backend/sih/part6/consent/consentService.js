// Part6ConsentService: consent lifecycle  Request -> Review -> Grant/Deny -> Active -> Revoke/Expire.
//
// Stored status is one of Pending | Granted | Denied | Revoked | Expired. "Active" is DERIVED: Granted and
// not past expiresAt. Expiry is applied lazily on every read/decision (and audited once), so a consent
// can never be used after its expiry even if nothing "ran" at that exact moment.
import { COLLECTIONS } from "../store/repository.js";
import { CONSENT_STATUS as S, DATA_CATEGORIES, PURPOSES, ROLES } from "../domain/constants.js";
import { actorFromUser, SYSTEM_ACTOR } from "../audit/auditService.js";
import { Errors } from "../errors.js";

const DAY = 86_400_000;
const isCategoryList = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === "string" && Object.hasOwn(DATA_CATEGORIES, c));
const uniq = (arr) => [...new Set(arr)];

export function createConsentService({ repo, source, clock, audit, settings, security }) {
  const C = COLLECTIONS.consents;

  // ---- helpers --------------------------------------------------------------------------------
  function applyExpiry(consent) {
    if (consent.status === S.GRANTED && consent.expiresAt && Date.parse(consent.expiresAt) <= clock.now().getTime()) {
      const at = consent.expiresAt;
      consent.status = S.EXPIRED;
      consent.history.push({ at, status: S.EXPIRED, by: "System" });
      repo.put(C, consent.id, consent);
      audit.append({
        actor: SYSTEM_ACTOR,
        action: "CONSENT_EXPIRED",
        resource: { type: "Consent", id: consent.id },
        patientId: consent.patientId,
        consentId: consent.id,
        metadata: { expiresAt: at },
      });
    }
    return consent;
  }

  const fresh = (id) => {
    const c = repo.get(C, id);
    return c ? applyExpiry(c) : null;
  };

  const isActive = (c) => c.status === S.GRANTED && Date.parse(c.expiresAt) > clock.now().getTime();

  function present(user, c) {
    const patient = source.getPatient(c.patientId);
    const masked = user.role === ROLES.SYSTEM_ADMIN;
    const active = isActive(c);
    return {
      ...c,
      purposeLabel: PURPOSES[c.purpose] ?? c.purpose,
      recipientOrgName: source.getOrganization(c.recipientOrgId)?.name ?? c.recipientOrgId,
      patientDisplay: patient ? (masked ? patient.fullName.split(/\s+/).map((p) => `${p[0]}.`).join(" ") : patient.fullName) : null,
      active,
      daysRemaining: active ? Math.max(0, Math.ceil((Date.parse(c.expiresAt) - clock.now().getTime()) / DAY)) : null,
    };
  }

  function canSee(user, c) {
    switch (user.role) {
      case ROLES.PATIENT:
        return user.patientId === c.patientId;
      case ROLES.DOCTOR:
      case ROLES.HOSPITAL_ADMIN: {
        const custodian = source.getPatient(c.patientId)?.custodianOrgId;
        return c.recipientOrgId === user.orgId || custodian === user.orgId;
      }
      case ROLES.SYSTEM_ADMIN:
        return true;
      default:
        return false;
    }
  }

  function load(user, id, req) {
    const c = fresh(id);
    // Same response for "missing" and "not yours": do not leak which consent ids exist.
    if (!c) throw Errors.notFound("Consent");
    if (!canSee(user, c)) {
      security.deny(user, { resource: { type: "Consent", id }, patientId: c.patientId, consentId: id, reason: "caller is not a party to this consent", req, publicMessage: "You do not have permission to access this consent." });
    }
    return c;
  }

  function newId() {
    return `CONS-DEMO-${String(repo.nextSeq("consent")).padStart(3, "0")}`;
  }

  function validateScope(input, cfg) {
    const errors = [];
    if (!isCategoryList(input.categories)) errors.push(`categories must be a non-empty array of: ${Object.keys(DATA_CATEGORIES).join(", ")}. (Billing/administrative data is not shareable in this prototype.)`);
    if (!Object.hasOwn(PURPOSES, input.purpose)) errors.push(`purpose must be one of: ${Object.keys(PURPOSES).join(", ")}.`);
    const d = input.durationDays;
    if (!Number.isInteger(d) || d < 1 || d > cfg.maxConsentDurationDays) errors.push(`durationDays must be a whole number from 1 to ${cfg.maxConsentDurationDays}.`);
    if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 280)) errors.push("note must be text of at most 280 characters.");
    return errors;
  }

  // ---- public API -----------------------------------------------------------------------------
  return {
    /** Same expiry-aware read used by the share pipeline. */
    getRaw: (id) => fresh(id),
    isActive,

    catalog() {
      const cfg = settings.get();
      return {
        categories: Object.entries(DATA_CATEGORIES).map(([key, v]) => ({ key, ...v })),
        purposes: Object.entries(PURPOSES).map(([key, label]) => ({ key, label })),
        statuses: Object.values(S),
        notShareable: [{ key: "billing", label: "Billing / administrative", reason: "Out of scope for this prototype: never shared through Part 6." }],
        limits: { maxDurationDays: cfg.maxConsentDurationDays, defaultDurationDays: cfg.defaultConsentDurationDays },
        recipients: source.listOrganizations().map((o) => ({ id: o.id, name: o.name })),
      };
    },

    list(user, { status, patientId } = {}) {
      return repo
        .list(C)
        .map(applyExpiry)
        .filter((c) => canSee(user, c))
        .filter((c) => (!status || c.status === status) && (!patientId || c.patientId === patientId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((c) => present(user, c));
    },

    get(user, id, req) {
      return present(user, load(user, id, req));
    },

    /**
     * Provider role: creates a Pending REQUEST for the patient to review.
     * Patient role: creates a patient-initiated share, which is granted immediately (the patient is the
     * data principal and is the one deciding).
     */
    create(user, input, req) {
      const cfg = settings.get();
      const errors = validateScope(input, cfg);
      const patient = typeof input.patientId === "string" ? source.getPatient(input.patientId) : null;
      if (!patient) errors.push("patientId must identify an existing demo patient.");
      if (errors.length) throw Errors.validation("Consent request is invalid.", errors);

      const now = clock.now();
      const categories = uniq(input.categories);
      const base = {
        id: newId(),
        patientId: patient.id,
        purpose: input.purpose,
        requestedCategories: categories,
        grantedCategories: [],
        requestedDurationDays: input.durationDays,
        durationDays: null,
        createdAt: now.toISOString(),
        decidedAt: null,
        decidedBy: null,
        grantedAt: null,
        expiresAt: null,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
        denialReason: null,
        note: input.note?.trim() || null,
      };

      if (user.role === ROLES.PATIENT) {
        if (user.patientId !== patient.id) {
          security.deny(user, { resource: { type: "Patient", id: patient.id }, patientId: patient.id, reason: "patient attempted to create a consent for another patient", req });
        }
        const recipient = typeof input.recipientOrgId === "string" ? source.getOrganization(input.recipientOrgId) : null;
        if (!recipient) throw Errors.validation("Consent request is invalid.", ["recipientOrgId must identify an existing organisation."]);
        if (recipient.id === patient.custodianOrgId) throw Errors.validation("Consent request is invalid.", ["The recipient already holds this record; choose a different recipient."]);
        const consent = {
          ...base,
          origin: "patient-initiated",
          requester: { orgId: recipient.id, orgName: recipient.name, userId: user.id, userName: `${user.displayName} (patient-initiated)` },
          recipientOrgId: recipient.id,
          status: S.GRANTED,
          grantedCategories: categories,
          durationDays: input.durationDays,
          decidedAt: now.toISOString(),
          decidedBy: user.displayName,
          grantedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + input.durationDays * DAY).toISOString(),
          history: [
            { at: now.toISOString(), status: S.PENDING, by: user.displayName },
            { at: now.toISOString(), status: S.GRANTED, by: user.displayName },
          ],
        };
        repo.put(C, consent.id, consent);
        audit.append({ actor: actorFromUser(user), action: "CONSENT_GRANTED", resource: { type: "Consent", id: consent.id }, patientId: patient.id, consentId: consent.id, req, metadata: { origin: "patient-initiated", categories, durationDays: input.durationDays, recipientOrgId: recipient.id } });
        return present(user, consent);
      }

      // Provider request path.
      if (patient.custodianOrgId === user.orgId) {
        throw Errors.validation("Consent request is invalid.", ["Your organisation is already the custodian of this record; a consent request is not needed."]);
      }
      const consent = {
        ...base,
        origin: "provider-request",
        requester: { orgId: user.orgId, orgName: security.orgName(user.orgId), userId: user.id, userName: user.displayName },
        recipientOrgId: user.orgId,
        status: S.PENDING,
        history: [{ at: now.toISOString(), status: S.PENDING, by: user.displayName }],
      };
      repo.put(C, consent.id, consent);
      audit.append({ actor: actorFromUser(user), action: "CONSENT_REQUESTED", resource: { type: "Consent", id: consent.id }, patientId: patient.id, consentId: consent.id, req, metadata: { categories, purpose: input.purpose, durationDays: input.durationDays } });
      return present(user, consent);
    },

    grant(user, id, input = {}, req) {
      const c = load(user, id, req);
      if (user.role !== ROLES.PATIENT || user.patientId !== c.patientId) {
        security.deny(user, { resource: { type: "Consent", id }, patientId: c.patientId, consentId: id, reason: "only the patient may grant consent for their own record", req });
      }
      if (c.status !== S.PENDING) throw Errors.invalidState(`Only a Pending consent can be granted (current status: ${c.status}).`);

      const cats = input.categories === undefined ? c.requestedCategories : uniq(input.categories ?? []);
      if (!isCategoryList(cats) || cats.some((k) => !c.requestedCategories.includes(k))) {
        throw Errors.validation("Grant is invalid.", ["categories must be a non-empty subset of the categories that were requested."]);
      }
      const days = input.durationDays === undefined ? c.requestedDurationDays : input.durationDays;
      if (!Number.isInteger(days) || days < 1 || days > c.requestedDurationDays) {
        throw Errors.validation("Grant is invalid.", [`durationDays must be a whole number from 1 to ${c.requestedDurationDays} (you cannot extend beyond what was requested).`]);
      }
      const now = clock.now();
      c.status = S.GRANTED;
      c.grantedCategories = cats;
      c.durationDays = days;
      c.decidedAt = now.toISOString();
      c.decidedBy = user.displayName;
      c.grantedAt = now.toISOString();
      c.expiresAt = new Date(now.getTime() + days * DAY).toISOString();
      c.history.push({ at: c.decidedAt, status: S.GRANTED, by: user.displayName });
      repo.put(C, id, c);
      audit.append({ actor: actorFromUser(user), action: "CONSENT_GRANTED", resource: { type: "Consent", id }, patientId: c.patientId, consentId: id, req, metadata: { origin: c.origin, grantedCategories: cats, narrowed: cats.length < c.requestedCategories.length, durationDays: days } });
      return present(user, c);
    },

    deny(user, id, input = {}, req) {
      const c = load(user, id, req);
      if (user.role !== ROLES.PATIENT || user.patientId !== c.patientId) {
        security.deny(user, { resource: { type: "Consent", id }, patientId: c.patientId, consentId: id, reason: "only the patient may deny consent for their own record", req });
      }
      if (c.status !== S.PENDING) throw Errors.invalidState(`Only a Pending consent can be denied (current status: ${c.status}).`);
      const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 280) : "";
      c.status = S.DENIED;
      c.decidedAt = clock.now().toISOString();
      c.decidedBy = user.displayName;
      c.denialReason = reason || null;
      c.history.push({ at: c.decidedAt, status: S.DENIED, by: user.displayName });
      repo.put(C, id, c);
      audit.append({ actor: actorFromUser(user), action: "CONSENT_DENIED", resource: { type: "Consent", id }, patientId: c.patientId, consentId: id, req, metadata: { hasReason: Boolean(reason) } });
      return present(user, c);
    },

    revoke(user, id, input = {}, req) {
      const c = load(user, id, req);
      const isOwnPatient = user.role === ROLES.PATIENT && user.patientId === c.patientId;
      const custodian = source.getPatient(c.patientId)?.custodianOrgId;
      const isOrgAdmin = user.role === ROLES.HOSPITAL_ADMIN && (c.recipientOrgId === user.orgId || custodian === user.orgId);
      const isSysAdmin = user.role === ROLES.SYSTEM_ADMIN;
      if (!isOwnPatient && !isOrgAdmin && !isSysAdmin) {
        security.deny(user, { resource: { type: "Consent", id }, patientId: c.patientId, consentId: id, reason: `role ${user.role} may not revoke this consent`, req });
      }
      const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 280) : "";
      if (!isOwnPatient && reason.length < 5) {
        throw Errors.validation("A reason (at least 5 characters) is required for administrative revocation.");
      }
      if (c.status !== S.GRANTED) throw Errors.invalidState(`Only a Granted consent can be revoked (current status: ${c.status}).`);
      const now = clock.now().toISOString();
      c.status = S.REVOKED;
      c.revokedAt = now;
      c.revokedBy = user.displayName;
      c.revocationReason = reason || null;
      c.history.push({ at: now, status: S.REVOKED, by: user.displayName });
      repo.put(C, id, c);
      audit.append({ actor: actorFromUser(user), action: "CONSENT_REVOKED", resource: { type: "Consent", id }, patientId: c.patientId, consentId: id, req, metadata: { by: isOwnPatient ? "patient" : "administrator", hasReason: Boolean(reason) } });
      return present(user, c);
    },
  };
}
