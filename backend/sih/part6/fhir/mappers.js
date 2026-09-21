// Part6FHIRMapping: converts Part 6's internal (source) records into FHIR R4 resources.
// The mapping layer is pure: (source record, context) -> FHIR resource. To integrate another system
// later, implement the RecordSource adapter (../adapters/recordSource.js) and reuse these mappers.
//
// Terminology note: LOINC / SNOMED CT / HL7 code systems are used with illustrative, commonly used
// codes for synthetic data. They are NOT validated by a terminology server and are not clinical advice.
import { DEMO_TAG_SYSTEM } from "../domain/constants.js";

const HL7 = "http://terminology.hl7.org/CodeSystem";
const LOINC = "http://loinc.org";
const SNOMED = "http://snomed.info/sct";
const UCUM = "http://unitsofmeasure.org";

export const ref = (type, id, display) => ({ reference: `${type}/${id}`, ...(display ? { display } : {}) });
const refOpt = (type, id, display) => (id ? ref(type, id, display) : undefined);
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export function metaOf(ctx) {
  return {
    versionId: "1",
    lastUpdated: ctx.now.toISOString(),
    source: `${ctx.baseUrl}/part6-demo`,
    tag: [{ system: DEMO_TAG_SYSTEM, code: "DEMO-DATA", display: "FHIR DEMO RESOURCE - synthetic data, prototype" }],
  };
}

const idf = (ctx, kind, value, extra = {}) => ({ system: `${ctx.baseUrl}/id/${kind}`, value, ...extra });

export function mapOrganization(org, ctx) {
  return {
    resourceType: "Organization",
    id: org.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "organization", org.id)],
    active: true,
    type: [{ coding: [{ system: `${HL7}/organization-type`, code: "prov", display: "Healthcare Provider" }] }],
    name: org.name,
  };
}

export function mapPractitioner(prac, ctx) {
  return {
    resourceType: "Practitioner",
    id: prac.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "practitioner", prac.id), idf(ctx, "practitioner-registration-demo", prac.registration)],
    active: true,
    name: [{ use: "official", text: prac.name, family: prac.family, given: prac.given, prefix: prac.prefix }],
    qualification: [{ code: { text: `${prac.specialty} (demo)` } }],
  };
}

export function mapPatient(patient, link, org, ctx) {
  const identifier = [
    idf(ctx, "patient", patient.id, {
      use: "usual",
      type: { coding: [{ system: `${HL7}/v2-0203`, code: "MR", display: "Medical record number" }] },
      assigner: { display: org?.name },
    }),
  ];
  // The ABHA identifier is a DEMO placeholder in a demo namespace: never issued or verified by ABDM,
  // and intentionally a different identifier from the internal MediCare Pro patient id.
  if (link?.abhaAddress) {
    identifier.push(
      idf(ctx, "abha-demo", link.abhaAddress, {
        use: "temp",
        assigner: { display: "DEMO placeholder - not issued or verified by ABDM" },
      })
    );
  }
  return {
    resourceType: "Patient",
    id: patient.id,
    meta: metaOf(ctx),
    identifier,
    active: true,
    name: [{ use: "official", text: patient.fullName, family: patient.family, given: patient.given }],
    gender: patient.gender,
    birthDate: patient.birthDate,
    managingOrganization: ref("Organization", patient.custodianOrgId, org?.name),
  };
}

export function mapEncounter(e, ctx) {
  return clean({
    resourceType: "Encounter",
    id: e.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "encounter", e.id)],
    status: e.status,
    class: { system: `${HL7}/v3-ActCode`, code: e.classCode, display: e.classDisplay },
    type: e.typeText ? [{ text: e.typeText }] : undefined,
    subject: ref("Patient", e.patientId),
    participant: e.practitionerId ? [{ individual: ref("Practitioner", e.practitionerId) }] : undefined,
    period: { start: e.start, end: e.end },
    reasonCode: e.reason ? [{ text: e.reason }] : undefined,
    serviceProvider: ref("Organization", e.orgId),
  });
}

export function mapCondition(c, ctx) {
  return clean({
    resourceType: "Condition",
    id: c.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "condition", c.id)],
    clinicalStatus: { coding: [{ system: `${HL7}/condition-clinical`, code: c.clinicalStatus }] },
    verificationStatus: { coding: [{ system: `${HL7}/condition-ver-status`, code: c.verificationStatus }] },
    category: [{ coding: [{ system: `${HL7}/condition-category`, code: "problem-list-item", display: "Problem List Item" }] }],
    code: { coding: [{ system: SNOMED, code: c.code, display: c.display }], text: c.display },
    subject: ref("Patient", c.patientId),
    encounter: refOpt("Encounter", c.encounterId),
    onsetDateTime: c.onset,
    recordedDate: c.recordedDate,
  });
}

export function mapObservation(o, ctx) {
  const isLab = o.category === "laboratory";
  return clean({
    resourceType: "Observation",
    id: o.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "observation", o.id)],
    status: "final",
    category: [
      {
        coding: [
          {
            system: `${HL7}/observation-category`,
            code: isLab ? "laboratory" : "vital-signs",
            display: isLab ? "Laboratory" : "Vital Signs",
          },
        ],
      },
    ],
    code: { coding: [{ system: LOINC, code: o.code, display: o.display }], text: o.display },
    subject: ref("Patient", o.patientId),
    encounter: refOpt("Encounter", o.encounterId),
    effectiveDateTime: o.effective,
    performer: o.performerId ? [ref("Practitioner", o.performerId)] : undefined,
    valueQuantity: o.value ? { value: o.value.value, unit: o.value.unit, system: UCUM, code: o.value.ucum } : undefined,
    component: o.components?.map((c) => ({
      code: { coding: [{ system: LOINC, code: c.code, display: c.display }] },
      valueQuantity: { value: c.value, unit: c.unit, system: UCUM, code: c.ucum },
    })),
  });
}

export function mapMedicationRequest(m, ctx) {
  return clean({
    resourceType: "MedicationRequest",
    id: m.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "medication-request", m.id)],
    status: m.status,
    intent: "order",
    medicationCodeableConcept: { coding: [{ system: SNOMED, code: m.code, display: m.display }], text: m.display },
    subject: ref("Patient", m.patientId),
    encounter: refOpt("Encounter", m.encounterId),
    authoredOn: m.authoredOn,
    requester: refOpt("Practitioner", m.prescriberId),
    reasonReference: m.reasonConditionId ? [ref("Condition", m.reasonConditionId)] : undefined,
    dosageInstruction: m.dosageText ? [{ text: m.dosageText }] : undefined,
  });
}

export function mapDiagnosticReport(d, ctx) {
  return clean({
    resourceType: "DiagnosticReport",
    id: d.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "diagnostic-report", d.id)],
    status: d.status,
    category: [{ coding: [{ system: `${HL7}/v2-0074`, code: "LAB", display: "Laboratory" }] }],
    code: { coding: [{ system: LOINC, code: d.code, display: d.display }], text: d.display },
    subject: ref("Patient", d.patientId),
    encounter: refOpt("Encounter", d.encounterId),
    effectiveDateTime: d.effective,
    issued: d.issued,
    performer: d.performerId ? [ref("Practitioner", d.performerId)] : undefined,
    result: d.resultIds?.length ? d.resultIds.map((id) => ref("Observation", id)) : undefined,
    conclusion: d.conclusion,
  });
}

export function mapAllergy(a, ctx) {
  return clean({
    resourceType: "AllergyIntolerance",
    id: a.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "allergy", a.id)],
    clinicalStatus: { coding: [{ system: `${HL7}/allergyintolerance-clinical`, code: a.clinicalStatus }] },
    verificationStatus: { coding: [{ system: `${HL7}/allergyintolerance-verification`, code: a.verificationStatus }] },
    type: "allergy",
    category: ["medication"],
    criticality: a.criticality,
    code: { coding: [{ system: SNOMED, code: a.code, display: a.display }], text: a.display },
    patient: ref("Patient", a.patientId),
    recordedDate: a.recordedDate,
    reaction: a.reaction
      ? [{ manifestation: [{ coding: [{ system: SNOMED, code: a.reaction.code, display: a.reaction.display }] }], severity: a.reaction.severity }]
      : undefined,
  });
}

export function mapDocument(d, ctx) {
  return clean({
    resourceType: "DocumentReference",
    id: d.id,
    meta: metaOf(ctx),
    identifier: [idf(ctx, "document", d.id)],
    status: "current",
    type: { coding: [{ system: LOINC, code: d.typeCode, display: d.typeDisplay }] },
    subject: ref("Patient", d.patientId),
    date: d.date,
    author: d.authorId ? [ref("Practitioner", d.authorId)] : undefined,
    description: d.title,
    content: [
      {
        attachment: {
          contentType: "text/plain",
          language: "en",
          data: Buffer.from(d.text, "utf8").toString("base64"),
          title: d.title,
        },
      },
    ],
    context: d.encounterId ? { encounter: [ref("Encounter", d.encounterId)] } : undefined,
  });
}

const TYPE_MAPPERS = {
  encounter: mapEncounter,
  condition: mapCondition,
  observation: mapObservation,
  medication: mapMedicationRequest,
  diagnosticReport: mapDiagnosticReport,
  allergy: mapAllergy,
  document: mapDocument,
};

/**
 * Map every source record for a patient into FHIR resources.
 * `source` is a RecordSource (see adapters/recordSource.js). Order is stable: supporting resources first.
 */
export function mapPatientRecord(source, patientId, ctx) {
  const patient = source.getPatient(patientId);
  if (!patient) return null;
  const org = source.getOrganization(patient.custodianOrgId);
  const link = source.getIdentityLink(patientId);
  const records = source.getClinicalRecords(patientId);

  const resources = [mapPatient(patient, link, org, ctx)];
  if (org) resources.push(mapOrganization(org, ctx));

  const clinical = records.flatMap((rec) => {
    const mapper = TYPE_MAPPERS[rec.type];
    return mapper ? [mapper(rec, ctx)] : [];
  });

  const practitionerIds = new Set();
  const collect = (node) => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (node && typeof node === "object") {
      if (typeof node.reference === "string" && node.reference.startsWith("Practitioner/")) practitionerIds.add(node.reference.split("/")[1]);
      Object.values(node).forEach(collect);
    }
  };
  collect(clinical);
  for (const pid of practitionerIds) {
    const prac = source.getPractitioner(pid);
    if (prac) resources.push(mapPractitioner(prac, ctx));
  }
  resources.push(...clinical);
  return resources;
}
