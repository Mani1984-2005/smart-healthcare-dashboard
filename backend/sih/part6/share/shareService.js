// Part6DataSharing: the consent-gated exchange pipeline.
//
//   authenticated caller (route)  ->  role permission record.share (route)
//   -> consent exists & caller's organisation is a party      (else CONSENT_VIOLATION_ATTEMPT)
//   -> consent is ACTIVE: granted, not revoked, not expired    (else SHARE_BLOCKED)
//   -> requested categories are inside the granted scope       (else CONSENT_VIOLATION_ATTEMPT)
//   -> FHIR mapping -> minimum-necessary scoping -> FHIR validation
//   -> release the Bundle + record the share + audit
//
// Every rule is enforced HERE, on the server, not in the UI. Disabling a button is never the control.
import { COLLECTIONS } from "../store/repository.js";
import { CONSENT_STATUS as S, DATA_CATEGORIES, ROLES } from "../domain/constants.js";
import { actorFromUser } from "../audit/auditService.js";
import { buildBundle, scopeToCategories, checksum, countByType } from "../fhir/bundle.js";
import { validateBundle } from "../fhir/validator.js";
import { Errors } from "../errors.js";

export function createShareService({ repo, source, clock, audit, consent, fhir, config }) {
  const D = COLLECTIONS.dataShares;

  function block({ user, req, consentRecord, consentId, code, message, reason, violation = false, details }) {
    audit.append({
      actor: actorFromUser(user),
      action: violation ? "CONSENT_VIOLATION_ATTEMPT" : "SHARE_BLOCKED",
      resource: { type: "Consent", id: consentId ?? null },
      patientId: consentRecord?.patientId ?? null,
      consentId: consentId ?? null,
      status: "denied",
      reason,
      req,
      metadata: { code },
    });
    throw Errors.consentBlocked(code, message, details);
  }

  return {
    execute(user, input, req) {
      const consentId = typeof input?.consentId === "string" ? input.consentId : null;
      if (!consentId) {
        block({ user, req, consentId: null, code: "CONSENT_REQUIRED", message: "Valid consent is required before this data can be shared.", reason: "no consentId supplied" });
      }
      const c = consent.getRaw(consentId);
      if (!c) {
        block({ user, req, consentId, code: "CONSENT_REQUIRED", message: "Valid consent is required before this data can be shared.", reason: "consent not found" });
      }

      // Party check: only the custodian (releasing) or the recipient (pulling) organisation may act on it.
      const patient = source.getPatient(c.patientId);
      const isParty = user.orgId && (user.orgId === c.recipientOrgId || user.orgId === patient.custodianOrgId);
      if (!isParty) {
        block({
          user, req, consentRecord: c, consentId,
          code: "CONSENT_NOT_FOR_CALLER",
          message: "This consent does not authorise your organisation.",
          reason: "caller organisation is neither the recipient nor the custodian",
          violation: true,
        });
      }

      // Lifecycle state.
      if (!consent.isActive(c)) {
        const table = {
          [S.PENDING]: ["CONSENT_PENDING", "Consent has not been granted yet."],
          [S.DENIED]: ["CONSENT_DENIED", "Consent was denied."],
          [S.REVOKED]: ["CONSENT_REVOKED", "Consent is no longer active."],
          [S.EXPIRED]: ["CONSENT_EXPIRED", "Consent has expired."],
        };
        const [code, message] = table[c.status] ?? ["CONSENT_NOT_ACTIVE", "Consent is no longer active."];
        block({ user, req, consentRecord: c, consentId, code, message, reason: `consent status is ${c.status}` });
      }

      // Scope: never more than the patient granted; default to everything granted.
      let categories = c.grantedCategories;
      if (input.categories !== undefined) {
        if (!Array.isArray(input.categories) || input.categories.length === 0 || input.categories.some((k) => !Object.hasOwn(DATA_CATEGORIES, k))) {
          throw Errors.validation(`categories must be a non-empty array of: ${Object.keys(DATA_CATEGORIES).join(", ")}.`);
        }
        categories = [...new Set(input.categories)];
        const outside = categories.filter((k) => !c.grantedCategories.includes(k));
        if (outside.length) {
          block({
            user, req, consentRecord: c, consentId,
            code: "SCOPE_EXCEEDED",
            message: "Requested data is outside what the patient consented to share.",
            reason: `categories outside consent scope: ${outside.join(", ")}`,
            violation: true,
            details: { notConsented: outside },
          });
        }
      }

      // Consent is valid. Map -> minimise -> validate -> release.
      const all = fhir.mapForPatient(c.patientId);
      const { resources, redactions } = scopeToCategories(all, categories);
      const bundleId = `BND-SHR-${String(repo.nextSeq("shareBundle")).padStart(3, "0")}`;
      const now = clock.now();
      const bundle = buildBundle({ id: bundleId, resources, now, baseUrl: config.fhirBaseUrl });
      const validation = validateBundle(bundle);
      if (validation.status !== "VALID") {
        // Never release something that fails our own validation; this is a server-side defect, not user error.
        audit.append({ actor: actorFromUser(user), action: "SHARE_BLOCKED", resource: { type: "Bundle", id: bundleId }, patientId: c.patientId, consentId, status: "failure", reason: "internal bundle failed validation", req });
        throw new Error("Shared bundle failed validation");
      }

      const share = {
        id: `SHR-DEMO-${String(repo.nextSeq("share")).padStart(3, "0")}`,
        consentId,
        patientId: c.patientId,
        sharedAt: now.toISOString(),
        sharedBy: { userId: user.id, name: user.displayName, orgId: user.orgId },
        side: user.orgId === patient.custodianOrgId ? "custodian-release" : "recipient-pull",
        recipientOrgId: c.recipientOrgId,
        purpose: c.purpose,
        categories,
        bundleId,
        resourceCounts: countByType(resources),
        resourceIds: resources.map((r) => `${r.resourceType}/${r.id}`),
        redactedReferences: redactions.length,
        checksum: checksum(bundle), // payload itself is NOT stored; only its integrity hash
      };
      repo.put(D, share.id, share);
      audit.append({
        actor: actorFromUser(user),
        action: "RECORD_SHARED",
        resource: { type: "Bundle", id: bundleId },
        patientId: c.patientId,
        consentId,
        req,
        metadata: { shareId: share.id, categories, entries: resources.length, side: share.side, redactedReferences: redactions.length },
      });

      return {
        label: "FHIR DEMO RESOURCE",
        share,
        bundle,
        validation: { status: validation.status, errorCount: validation.errorCount },
        minimisation: {
          categoriesShared: categories,
          categoriesWithheld: Object.keys(DATA_CATEGORIES).filter((k) => !categories.includes(k)),
          redactions,
          note: "Patient identity is always included as the subject. Supporting Practitioner/Organization resources are included only if referenced. References to withheld records are removed.",
        },
      };
    },

    list(user) {
      const rows = repo.list(D).filter((s) => {
        switch (user.role) {
          case ROLES.PATIENT:
            return s.patientId === user.patientId;
          case ROLES.DOCTOR:
          case ROLES.HOSPITAL_ADMIN:
            return s.recipientOrgId === user.orgId || source.getPatient(s.patientId)?.custodianOrgId === user.orgId;
          case ROLES.SYSTEM_ADMIN:
            return true;
          default:
            return false;
        }
      });
      const orgs = new Map(source.listOrganizations().map((o) => [o.id, o.name]));
      return rows
        .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
        .map((s) => ({ ...s, recipientOrgName: orgs.get(s.recipientOrgId) ?? s.recipientOrgId }));
    },
  };
}
