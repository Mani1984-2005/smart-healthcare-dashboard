// RecordSource: the ONLY seam between Part 6 and any system that holds patient data.
//
// Part 6 ships a self-contained implementation backed by its own synthetic dataset (createDemoRecordSource).
// To integrate MediCare Pro's other modules later, implement this same interface in an adapter that reads
// their data and returns records in the shapes below. Part 6 never imports another module directly.
//
// @typedef {object} RecordSource
// @property {(id: string) => object|null} getPatient
// @property {() => object[]} listPatients
// @property {(id: string) => object|null} getOrganization
// @property {() => object[]} listOrganizations
// @property {(id: string) => object|null} getPractitioner
// @property {(patientId: string) => object|null} getIdentityLink
// @property {(patientId: string) => object[]} getClinicalRecords   // records tagged with `type`
import { COLLECTIONS } from "../store/repository.js";

export function createDemoRecordSource(repo) {
  return {
    getPatient: (id) => repo.get(COLLECTIONS.patients, id),
    listPatients: () => repo.list(COLLECTIONS.patients),
    getOrganization: (id) => repo.get(COLLECTIONS.organizations, id),
    listOrganizations: () => repo.list(COLLECTIONS.organizations),
    getPractitioner(id) {
      const rec = repo.get(COLLECTIONS.sourceRecords, id);
      return rec?.type === "practitioner" ? rec : null;
    },
    getIdentityLink: (patientId) => repo.get(COLLECTIONS.identityLinks, `LNK-${patientId}`),
    getClinicalRecords: (patientId) =>
      repo
        .list(COLLECTIONS.sourceRecords)
        .filter((r) => r.patientId === patientId && r.type !== "practitioner")
        .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
