// Part6FHIRService: generation, storage, retrieval and validation of FHIR R4 demo resources and bundles.
// Generation is an IN-HOUSE mapping preview for the data custodian. Releasing data outside the custodian
// (export / sharing) is a separate, consent-gated operation (see shareService).
import { COLLECTIONS } from "../store/repository.js";
import { SUPPORTED_RESOURCE_TYPES, categoryOfResource } from "../domain/constants.js";
import { mapPatientRecord } from "../fhir/mappers.js";
import { buildBundle, checksum, countByType } from "../fhir/bundle.js";
import { validateFhir, validateBundle } from "../fhir/validator.js";
import { actorFromUser } from "../audit/auditService.js";
import { Errors } from "../errors.js";
import { ROLES } from "../domain/constants.js";

export function createFHIRService({ repo, source, clock, audit, config, security }) {
  const ctx = () => ({ now: clock.now(), baseUrl: config.fhirBaseUrl });

  function requireCustodianOf(user, patientId, req) {
    const patient = source.getPatient(patientId);
    if (!patient) throw Errors.notFound("Patient");
    if (!user.orgId || patient.custodianOrgId !== user.orgId) {
      security.deny(user, {
        resource: { type: "Patient", id: patientId },
        patientId,
        reason: "caller organisation is not the data custodian; use consent-based exchange",
        publicMessage: "Your organisation is not the data custodian for this patient. Request access through a consent instead.",
        code: "NOT_CUSTODIAN",
        req,
      });
    }
    return patient;
  }

  function parseTypes(types) {
    if (types === undefined || types === null) return null;
    if (!Array.isArray(types) || types.some((t) => !SUPPORTED_RESOURCE_TYPES.includes(t))) {
      throw Errors.validation(`resourceTypes must be an array drawn from: ${SUPPORTED_RESOURCE_TYPES.join(", ")}.`);
    }
    return new Set(types);
  }

  function recordValidation(user, result) {
    const id = `VAL-${String(repo.nextSeq("validation")).padStart(5, "0")}`;
    repo.put(COLLECTIONS.validations, id, {
      id,
      at: clock.now().toISOString(),
      byUserId: user.id,
      orgId: user.orgId ?? null,
      status: result.status,
      resourceType: result.resourceType,
      errorCount: result.errorCount,
    });
  }

  function persistResource(user, resource, patientId, validation) {
    repo.put(COLLECTIONS.fhirResources, `${resource.resourceType}/${resource.id}`, {
      key: `${resource.resourceType}/${resource.id}`,
      resourceType: resource.resourceType,
      id: resource.id,
      patientId,
      category: categoryOfResource(resource),
      generatedAt: clock.now().toISOString(),
      generatedBy: { userId: user.id, name: user.displayName, orgId: user.orgId },
      validation: { status: validation.status, errorCount: validation.errorCount },
      resource,
    });
  }

  return {
    /** Pure mapping used by the share pipeline (no auth, no persistence). Caller must already be authorised. */
    mapForPatient(patientId) {
      return mapPatientRecord(source, patientId, ctx());
    },

    generate(user, { patientId, resourceTypes }, req) {
      requireCustodianOf(user, patientId, req);
      const wanted = parseTypes(resourceTypes);
      let resources = mapPatientRecord(source, patientId, ctx());
      // Patient is always generated first so every other resource can reference it.
      if (wanted) resources = resources.filter((r) => r.resourceType === "Patient" || wanted.has(r.resourceType));
      const out = resources.map((resource) => {
        const validation = validateFhir(resource);
        persistResource(user, resource, patientId, validation);
        recordValidation(user, validation);
        return { resource, validation: { status: validation.status, errorCount: validation.errorCount } };
      });
      audit.append({
        actor: actorFromUser(user),
        action: "FHIR_RESOURCES_GENERATED",
        resource: { type: "Patient", id: patientId },
        patientId,
        req,
        metadata: { counts: countByType(resources), total: resources.length },
      });
      return {
        label: "FHIR DEMO RESOURCE",
        fhirVersion: config.fhirVersion,
        patientId,
        count: out.length,
        resources: out,
      };
    },

    listResources(user, { patientId, resourceType } = {}) {
      return repo
        .list(COLLECTIONS.fhirResources)
        .filter((r) => {
          const patient = source.getPatient(r.patientId);
          return patient && patient.custodianOrgId === user.orgId;
        })
        .filter((r) => (!patientId || r.patientId === patientId) && (!resourceType || r.resourceType === resourceType))
        .map(({ resource: _omit, ...summary }) => summary)
        .sort((a, b) => a.key.localeCompare(b.key));
    },

    getResource(user, resourceType, id, req) {
      const stored = repo.get(COLLECTIONS.fhirResources, `${resourceType}/${id}`);
      if (!stored) throw Errors.notFound("FHIR resource");
      requireCustodianOf(user, stored.patientId, req);
      audit.append({ actor: actorFromUser(user), action: "RECORD_ACCESSED", resource: { type: resourceType, id }, patientId: stored.patientId, req, metadata: { view: "fhir-resource" } });
      const validation = validateFhir(stored.resource);
      return { label: "FHIR DEMO RESOURCE", meta: { generatedAt: stored.generatedAt, generatedBy: stored.generatedBy.name }, resource: stored.resource, validation };
    },

    generateBundle(user, { patientId, resourceTypes }, req) {
      requireCustodianOf(user, patientId, req);
      const wanted = parseTypes(resourceTypes);
      let resources = mapPatientRecord(source, patientId, ctx());
      if (wanted) resources = resources.filter((r) => ["Patient", "Practitioner", "Organization"].includes(r.resourceType) || wanted.has(r.resourceType));
      const id = `BND-DEMO-${String(repo.nextSeq("bundle")).padStart(3, "0")}`;
      const bundle = buildBundle({ id, resources, now: clock.now(), baseUrl: config.fhirBaseUrl });
      const validation = validateBundle(bundle);
      recordValidation(user, validation);
      for (const r of resources) persistResource(user, r, patientId, validateFhir(r));
      const summary = {
        id,
        patientId,
        createdAt: clock.now().toISOString(),
        createdBy: { userId: user.id, name: user.displayName, orgId: user.orgId },
        type: bundle.type,
        entryCount: bundle.entry.length,
        resourceTypes: countByType(resources),
        validation: { status: validation.status, errorCount: validation.errorCount },
        checksum: checksum(bundle),
      };
      repo.put(COLLECTIONS.fhirBundles, id, { ...summary, bundle });
      audit.append({ actor: actorFromUser(user), action: "FHIR_BUNDLE_GENERATED", resource: { type: "Bundle", id }, patientId, req, metadata: { entries: summary.entryCount, status: validation.status } });
      return { label: "FHIR DEMO RESOURCE", fhirVersion: config.fhirVersion, summary, bundle, validation };
    },

    listBundles(user) {
      return repo
        .list(COLLECTIONS.fhirBundles)
        .filter((b) => source.getPatient(b.patientId)?.custodianOrgId === user.orgId)
        .map(({ bundle: _omit, ...summary }) => summary)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    getBundle(user, id, req) {
      const stored = repo.get(COLLECTIONS.fhirBundles, id);
      if (!stored) throw Errors.notFound("FHIR bundle");
      requireCustodianOf(user, stored.patientId, req);
      audit.append({ actor: actorFromUser(user), action: "RECORD_ACCESSED", resource: { type: "Bundle", id }, patientId: stored.patientId, req, metadata: { view: "fhir-bundle" } });
      const { bundle, ...summary } = stored;
      return { label: "FHIR DEMO RESOURCE", summary, bundle, validation: validateBundle(bundle) };
    },

    /** Validate pasted JSON (`raw`), a supplied object (`resource`), or a stored bundle/resource by reference. */
    validate(user, input, req) {
      let subject;
      let patientId = null;
      if (typeof input.raw === "string") subject = input.raw;
      else if (input.resource !== undefined) subject = input.resource;
      else if (typeof input.bundleId === "string") {
        const stored = repo.get(COLLECTIONS.fhirBundles, input.bundleId);
        if (!stored) throw Errors.notFound("FHIR bundle");
        if (user.role !== ROLES.SYSTEM_ADMIN) requireCustodianOf(user, stored.patientId, req);
        else security.deny(user, { resource: { type: "Bundle", id: input.bundleId }, patientId: stored.patientId, reason: "system admin may not read clinical content", req });
        subject = stored.bundle;
        patientId = stored.patientId;
      } else if (input.resourceType && input.id) {
        const stored = repo.get(COLLECTIONS.fhirResources, `${input.resourceType}/${input.id}`);
        if (!stored) throw Errors.notFound("FHIR resource");
        if (user.role === ROLES.SYSTEM_ADMIN) {
          security.deny(user, { resource: { type: input.resourceType, id: input.id }, patientId: stored.patientId, reason: "system admin may not read clinical content", req });
        }
        requireCustodianOf(user, stored.patientId, req);
        subject = stored.resource;
        patientId = stored.patientId;
      } else {
        throw Errors.validation("Provide one of: raw (JSON text), resource (object), bundleId, or resourceType + id.");
      }
      const result = validateFhir(subject);
      recordValidation(user, result);
      audit.append({
        actor: actorFromUser(user),
        action: "FHIR_VALIDATED",
        resource: { type: result.resourceType ?? "Unknown", id: result.resourceId ?? null },
        patientId,
        status: "success",
        req,
        metadata: { result: result.status, errors: result.errorCount },
      });
      return result;
    },

    validationStats(filter = () => true) {
      const rows = repo.list(COLLECTIONS.validations).filter(filter);
      const valid = rows.filter((r) => r.status === "VALID").length;
      return { total: rows.length, valid, rate: rows.length ? Math.round((valid / rows.length) * 100) : null };
    },
  };
}
