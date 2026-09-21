// Part 6 patient identity: keeps the internal MediCare Pro patient id and the ABHA/ABDM identity as two
// DIFFERENT identifiers. No ABHA verification is ever performed here (no ABDM credentials, demo mode).
import { ROLES } from "../domain/constants.js";
import { actorFromUser } from "../audit/auditService.js";

const maskName = (name) =>
  name
    .split(/\s+/)
    .map((p) => `${p[0]}.`)
    .join(" ");

export function createIdentityService({ source, audit, security }) {
  /** True if the user's organisation is the data custodian (HIP) for this patient. */
  const isCustodian = (user, patient) => Boolean(user.orgId) && patient.custodianOrgId === user.orgId;

  function abhaBlock(link) {
    return {
      status: link?.status ?? "DEMO_NOT_CONNECTED",
      statusLabel: "Demo / Not Connected",
      identifier: link?.abhaAddress ?? null,
      maskedNumber: link?.abhaNumberMasked ?? "XX-XXXX-XXXX-XXXX",
      verification: link?.verification ?? "PROTOTYPE",
      verifiedAt: null,
      note: "Placeholder only. No ABDM/ABHA verification has been performed: this prototype has no ABDM sandbox or production credentials.",
    };
  }

  return {
    isCustodian,

    /** Patients the caller may see in a selector, with the minimum fields for their relationship. */
    list(user) {
      const patients = source.listPatients();
      const orgs = new Map(source.listOrganizations().map((o) => [o.id, o.name]));
      const rows = patients.map((p) => {
        const base = { id: p.id, custodianOrgId: p.custodianOrgId, custodianOrgName: orgs.get(p.custodianOrgId) ?? null };
        switch (user.role) {
          case ROLES.PATIENT:
            return user.patientId === p.id ? { ...base, displayName: p.fullName, relation: "self" } : null;
          case ROLES.DOCTOR:
          case ROLES.HOSPITAL_ADMIN:
            return isCustodian(user, p)
              ? { ...base, displayName: p.fullName, relation: "custodian" }
              : { ...base, displayName: p.fullName, relation: "directory" };
          case ROLES.SYSTEM_ADMIN:
            return { ...base, displayName: maskName(p.fullName), relation: "masked" };
          default:
            return null;
        }
      });
      return rows.filter(Boolean);
    },

    getIdentity(user, patientId, req) {
      const patient = source.getPatient(patientId);
      if (!patient) return null;
      const orgName = source.getOrganization(patient.custodianOrgId)?.name ?? null;
      const link = source.getIdentityLink(patientId);
      const own = user.role === ROLES.PATIENT && user.patientId === patientId;
      const custodian = (user.role === ROLES.DOCTOR || user.role === ROLES.HOSPITAL_ADMIN) && isCustodian(user, patient);
      const masked = user.role === ROLES.SYSTEM_ADMIN;

      if (!own && !custodian && !masked) {
        security.deny(user, {
          resource: { type: "Patient", id: patientId },
          patientId,
          reason: own === false && user.role === ROLES.PATIENT ? "patient attempted to view another patient's identity" : "caller is not the data custodian for this patient",
          req,
        });
      }
      audit.append({ actor: actorFromUser(user), action: "RECORD_ACCESSED", resource: { type: "Patient", id: patientId }, patientId, req, metadata: { view: "identity", masked } });

      return {
        demoLabel: "DEMO DATA",
        internal: { label: "Internal MediCare Pro Patient ID", patientId: patient.id },
        abha: abhaBlock(link),
        separateIdentifiersNote: "The internal patient ID and the ABHA / ABDM identity are different identifiers and are never treated as interchangeable.",
        displayName: masked ? maskName(patient.fullName) : patient.fullName,
        gender: masked ? null : patient.gender,
        birthDate: masked ? null : patient.birthDate,
        custodian: { id: patient.custodianOrgId, name: orgName },
        view: masked ? "masked" : own ? "self" : "custodian",
      };
    },
  };
}
