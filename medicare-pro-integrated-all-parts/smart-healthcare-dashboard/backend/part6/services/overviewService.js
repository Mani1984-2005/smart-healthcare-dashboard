// Dashboard numbers are computed from real Part 6 state (never hard-coded).
import { COLLECTIONS } from "../store/repository.js";
import { ROLES } from "../domain/constants.js";
import { publicConfig } from "../config.js";

export function createOverviewService({ repo, source, audit, consent, share, fhir, config }) {
  return {
    get(user) {
      const consents = consent.list(user);
      const shares = share.list(user);

      let resourceCount;
      if (user.role === ROLES.SYSTEM_ADMIN) resourceCount = repo.count(COLLECTIONS.fhirResources);
      else if (user.role === ROLES.PATIENT) resourceCount = repo.list(COLLECTIONS.fhirResources).filter((r) => r.patientId === user.patientId).length;
      else resourceCount = fhir.listResources(user).length;

      const resolveCustodian = (patientId) => source.getPatient(patientId)?.custodianOrgId ?? null;
      const { entries } = audit.query(user, { resolveCustodian });
      const security = entries.filter((e) => e.securityEvent);

      const validation = fhir.validationStats((v) => {
        if (user.role === ROLES.SYSTEM_ADMIN) return true;
        if (user.role === ROLES.DOCTOR) return v.byUserId === user.id;
        if (user.role === ROLES.HOSPITAL_ADMIN) return v.orgId === user.orgId;
        return false;
      });

      return {
        scope: user.role,
        modes: publicConfig(config),
        counts: {
          fhirResources: resourceCount,
          fhirBundles: user.role === ROLES.SYSTEM_ADMIN ? repo.count(COLLECTIONS.fhirBundles) : user.role === ROLES.PATIENT ? 0 : fhir.listBundles(user).length,
          activeConsents: consents.filter((c) => c.active).length,
          pendingRequests: consents.filter((c) => c.status === "Pending").length,
          sharedRecords: shares.length,
          sharedResources: shares.reduce((n, s) => n + s.resourceIds.length, 0),
          securityEvents: security.length,
        },
        validation,
        recentActivity: entries.slice(0, 8),
      };
    },
  };
}
