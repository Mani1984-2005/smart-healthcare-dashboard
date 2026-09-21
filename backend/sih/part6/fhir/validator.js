// Part 6 structural FHIR R4 validator.
//
// WHAT THIS IS: a prototype validator that checks JSON well-formedness, supported resourceType,
// permitted element names, key data types, required fields, value-set codes for status elements,
// identifier presence, reference well-formedness/target types, and Bundle rules (including that every
// reference inside a Bundle resolves to an entry).
//
// WHAT THIS IS NOT: the official HL7 FHIR Validator. It does not check profiles/StructureDefinitions
// (e.g. ABDM/NRCeS profiles), terminology bindings against a terminology server, or FHIRPath invariants.
// A "VALID" result therefore means "passes Part 6 structural checks", never "FHIR certified".
import { SUPPORTED_RESOURCE_TYPES } from "../domain/constants.js";

export const VALIDATOR_NAME = "part6-structural-validator/1.0";
export const VALIDATOR_DISCLAIMER =
  "Prototype structural validation only. Not the official HL7 validator; no profile or terminology-server checks; not a certification.";

const DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
const DATETIME =
  /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01])(T([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d))?)?)?$/;
const INSTANT =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;
const ID = /^[A-Za-z0-9\-.]{1,64}$/;
const REL_REF = /^([A-Z][A-Za-z]+)\/([A-Za-z0-9\-.]{1,64})(\/_history\/[A-Za-z0-9\-.]{1,64})?$/;

const BASE = ["resourceType", "id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension"];
const el = (...names) => new Set([...BASE, ...names]);

const ELEMENTS = {
  Patient: el("identifier", "active", "name", "telecom", "gender", "birthDate", "deceasedBoolean", "deceasedDateTime", "address", "maritalStatus", "multipleBirthBoolean", "multipleBirthInteger", "photo", "contact", "communication", "generalPractitioner", "managingOrganization", "link"),
  Practitioner: el("identifier", "active", "name", "telecom", "address", "gender", "birthDate", "photo", "qualification", "communication"),
  Organization: el("identifier", "active", "type", "name", "alias", "telecom", "address", "partOf", "contact", "endpoint"),
  Encounter: el("identifier", "status", "statusHistory", "class", "classHistory", "type", "serviceType", "priority", "subject", "episodeOfCare", "basedOn", "participant", "appointment", "period", "length", "reasonCode", "reasonReference", "diagnosis", "account", "hospitalization", "location", "serviceProvider", "partOf"),
  Condition: el("identifier", "clinicalStatus", "verificationStatus", "category", "severity", "code", "bodySite", "subject", "encounter", "onsetDateTime", "onsetAge", "onsetPeriod", "onsetRange", "onsetString", "abatementDateTime", "abatementAge", "abatementPeriod", "abatementRange", "abatementString", "recordedDate", "recorder", "asserter", "stage", "evidence", "note"),
  Observation: el("identifier", "basedOn", "partOf", "status", "category", "code", "subject", "focus", "encounter", "effectiveDateTime", "effectivePeriod", "effectiveTiming", "effectiveInstant", "issued", "performer", "valueQuantity", "valueCodeableConcept", "valueString", "valueBoolean", "valueInteger", "valueRange", "valueRatio", "valueSampledData", "valueTime", "valueDateTime", "valuePeriod", "dataAbsentReason", "interpretation", "note", "bodySite", "method", "specimen", "device", "referenceRange", "hasMember", "derivedFrom", "component"),
  MedicationRequest: el("identifier", "status", "statusReason", "intent", "category", "priority", "doNotPerform", "reportedBoolean", "reportedReference", "medicationCodeableConcept", "medicationReference", "subject", "encounter", "supportingInformation", "authoredOn", "requester", "performer", "performerType", "recorder", "reasonCode", "reasonReference", "instantiatesCanonical", "instantiatesUri", "basedOn", "groupIdentifier", "courseOfTherapyType", "insurance", "note", "dosageInstruction", "dispenseRequest", "substitution", "priorPrescription", "detectedIssue", "eventHistory"),
  DiagnosticReport: el("identifier", "basedOn", "status", "category", "code", "subject", "encounter", "effectiveDateTime", "effectivePeriod", "issued", "performer", "resultsInterpreter", "specimen", "result", "imagingStudy", "media", "conclusion", "conclusionCode", "presentedForm"),
  AllergyIntolerance: el("identifier", "clinicalStatus", "verificationStatus", "type", "category", "criticality", "code", "patient", "encounter", "onsetDateTime", "onsetAge", "onsetPeriod", "onsetRange", "onsetString", "recordedDate", "recorder", "asserter", "lastOccurrence", "note", "reaction"),
  DocumentReference: el("masterIdentifier", "identifier", "status", "docStatus", "type", "category", "subject", "date", "author", "authenticator", "custodian", "relatesTo", "description", "securityLabel", "content", "context"),
  Bundle: new Set(["resourceType", "id", "meta", "implicitRules", "language", "identifier", "type", "timestamp", "total", "link", "entry", "signature"]),
};

const BUNDLE_TYPES = new Set(["document", "message", "transaction", "transaction-response", "batch", "batch-response", "history", "searchset", "collection"]);

const ENUMS = {
  gender: ["male", "female", "other", "unknown"],
  encounterStatus: ["planned", "arrived", "triaged", "in-progress", "onleave", "finished", "cancelled", "entered-in-error", "unknown"],
  observationStatus: ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"],
  medStatus: ["active", "on-hold", "cancelled", "completed", "entered-in-error", "stopped", "draft", "unknown"],
  medIntent: ["proposal", "plan", "order", "original-order", "reflex-order", "filler-order", "instance-order", "option"],
  reportStatus: ["registered", "partial", "preliminary", "final", "amended", "corrected", "appended", "cancelled", "entered-in-error", "unknown"],
  docStatus: ["current", "superseded", "entered-in-error"],
  criticality: ["low", "high", "unable-to-assess"],
  allergyType: ["allergy", "intolerance"],
};

// Which element accepts which reference target types (subset of R4 that Part 6 generates/consumes).
const REF_TARGETS = {
  Patient: { managingOrganization: ["Organization"], generalPractitioner: ["Organization", "Practitioner"] },
  Encounter: { subject: ["Patient", "Group"], serviceProvider: ["Organization"], "participant.individual": ["Practitioner", "Patient", "RelatedPerson", "PractitionerRole"], reasonReference: ["Condition", "Observation"] },
  Condition: { subject: ["Patient", "Group"], encounter: ["Encounter"], recorder: ["Practitioner", "Patient", "RelatedPerson", "PractitionerRole"], asserter: ["Practitioner", "Patient", "RelatedPerson", "PractitionerRole"] },
  Observation: { subject: ["Patient", "Group", "Device", "Location"], encounter: ["Encounter"], performer: ["Practitioner", "PractitionerRole", "Organization", "CareTeam", "Patient", "RelatedPerson"], hasMember: ["Observation"] },
  MedicationRequest: { subject: ["Patient", "Group"], encounter: ["Encounter"], requester: ["Practitioner", "PractitionerRole", "Organization", "Patient", "RelatedPerson", "Device"], reasonReference: ["Condition", "Observation"] },
  DiagnosticReport: { subject: ["Patient", "Group", "Device", "Location"], encounter: ["Encounter"], performer: ["Practitioner", "PractitionerRole", "Organization", "CareTeam"], result: ["Observation"] },
  AllergyIntolerance: { patient: ["Patient"], encounter: ["Encounter"], recorder: ["Practitioner", "PractitionerRole", "Patient", "RelatedPerson"], asserter: ["Patient", "RelatedPerson", "Practitioner", "PractitionerRole"] },
  DocumentReference: { subject: ["Patient", "Practitioner", "Group", "Device"], author: ["Practitioner", "PractitionerRole", "Organization", "Device", "Patient", "RelatedPerson"], custodian: ["Organization"] },
  Organization: { partOf: ["Organization"] },
};

const REQUIRED = {
  Patient: ["identifier", "name", "gender", "birthDate"],
  Practitioner: ["identifier", "name"],
  Organization: ["identifier", "name"],
  Encounter: ["identifier", "status", "class", "subject"],
  Condition: ["clinicalStatus", "code", "subject"],
  Observation: ["status", "code", "subject"],
  MedicationRequest: ["status", "intent", "subject"], // + medication[x] checked separately
  DiagnosticReport: ["status", "code", "subject"],
  AllergyIntolerance: ["clinicalStatus", "code", "patient"],
  DocumentReference: ["status", "content", "subject"],
};

const IDENTIFIER_REQUIRED = new Set(["Patient", "Practitioner", "Organization", "Encounter"]);

// issue code -> which check row it belongs to
const CHECK_OF = {
  "invalid-json": "json",
  "unsupported-resource-type": "resourceType",
  "unknown-element": "structure",
  "invalid-structure": "structure",
  "invalid-value": "structure",
  "invalid-bundle": "structure",
  "missing-required": "required",
  "missing-identifier": "identifier",
  "invalid-reference": "references",
  "unresolved-reference": "references",
};

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const nonEmptyStr = (v) => typeof v === "string" && v.trim().length > 0;

function makeCtx() {
  return { issues: [], references: [] };
}
const add = (ctx, severity, code, path, message) => ctx.issues.push({ severity, code, path, message });

// ---- datatype helpers ------------------------------------------------------------------------
function checkPrimitive(ctx, value, path, kind) {
  const ok =
    (kind === "date" && typeof value === "string" && DATE.test(value)) ||
    (kind === "dateTime" && typeof value === "string" && DATETIME.test(value)) ||
    (kind === "instant" && typeof value === "string" && INSTANT.test(value)) ||
    (kind === "id" && typeof value === "string" && ID.test(value)) ||
    (kind === "string" && nonEmptyStr(value)) ||
    (kind === "boolean" && typeof value === "boolean") ||
    (kind === "decimal" && typeof value === "number" && Number.isFinite(value)) ||
    (kind === "unsignedInt" && Number.isInteger(value) && value >= 0);
  if (!ok) add(ctx, "error", "invalid-value", path, `Expected a valid FHIR ${kind}.`);
  return ok;
}

function checkEnum(ctx, value, path, allowed) {
  if (!allowed.includes(value)) {
    add(ctx, "error", "invalid-value", path, `"${String(value)}" is not an allowed code. Allowed: ${allowed.join(", ")}.`);
  }
}

function checkCoding(ctx, c, path) {
  if (!isObj(c)) return add(ctx, "error", "invalid-structure", path, "Coding must be an object.");
  for (const k of ["system", "code", "display", "version"]) {
    if (c[k] !== undefined && !nonEmptyStr(c[k])) add(ctx, "error", "invalid-value", `${path}.${k}`, `${k} must be a non-empty string.`);
  }
  if (c.code !== undefined && c.system === undefined) {
    add(ctx, "warning", "invalid-value", path, "Coding has a code but no system.");
  }
}

function checkCodeableConcept(ctx, v, path) {
  if (!isObj(v)) return add(ctx, "error", "invalid-structure", path, "CodeableConcept must be an object.");
  if (v.coding === undefined && v.text === undefined) {
    return add(ctx, "error", "invalid-structure", path, "CodeableConcept needs coding and/or text.");
  }
  if (v.coding !== undefined) {
    if (!Array.isArray(v.coding) || v.coding.length === 0) add(ctx, "error", "invalid-structure", `${path}.coding`, "coding must be a non-empty array.");
    else v.coding.forEach((c, i) => checkCoding(ctx, c, `${path}.coding[${i}]`));
  }
  if (v.text !== undefined && !nonEmptyStr(v.text)) add(ctx, "error", "invalid-value", `${path}.text`, "text must be a non-empty string.");
}

function checkQuantity(ctx, v, path) {
  if (!isObj(v)) return add(ctx, "error", "invalid-structure", path, "Quantity must be an object.");
  if (v.value === undefined) add(ctx, "error", "missing-required", `${path}.value`, "Quantity.value is required here.");
  else checkPrimitive(ctx, v.value, `${path}.value`, "decimal");
  if (v.unit !== undefined && !nonEmptyStr(v.unit)) add(ctx, "error", "invalid-value", `${path}.unit`, "unit must be a non-empty string.");
  if (v.code !== undefined && v.system === undefined) add(ctx, "warning", "invalid-value", path, "Quantity has a code but no system.");
}

function checkPeriod(ctx, v, path) {
  if (!isObj(v)) return add(ctx, "error", "invalid-structure", path, "Period must be an object.");
  for (const k of ["start", "end"]) if (v[k] !== undefined) checkPrimitive(ctx, v[k], `${path}.${k}`, "dateTime");
  if (v.start && v.end && DATETIME.test(v.start) && DATETIME.test(v.end) && Date.parse(v.end) < Date.parse(v.start)) {
    add(ctx, "error", "invalid-value", path, "Period end is before start.");
  }
}

function checkIdentifierList(ctx, v, path) {
  if (!Array.isArray(v) || v.length === 0) return add(ctx, "error", "invalid-structure", path, "identifier must be a non-empty array.");
  v.forEach((idf, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(idf)) return add(ctx, "error", "invalid-structure", p, "Identifier must be an object.");
    if (!nonEmptyStr(idf.value)) add(ctx, "error", "missing-identifier", `${p}.value`, "Identifier.value is required.");
    if (idf.system !== undefined && !nonEmptyStr(idf.system)) add(ctx, "error", "invalid-value", `${p}.system`, "Identifier.system must be a non-empty string.");
  });
}

function checkHumanName(ctx, v, path) {
  if (!Array.isArray(v) || v.length === 0) return add(ctx, "error", "invalid-structure", path, "name must be a non-empty array.");
  v.forEach((n, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(n)) return add(ctx, "error", "invalid-structure", p, "HumanName must be an object.");
    if (!nonEmptyStr(n.text) && !nonEmptyStr(n.family)) add(ctx, "error", "missing-required", p, "HumanName needs family or text.");
    if (n.given !== undefined && (!Array.isArray(n.given) || n.given.some((g) => !nonEmptyStr(g)))) {
      add(ctx, "error", "invalid-structure", `${p}.given`, "given must be an array of non-empty strings.");
    }
  });
}

function checkReference(ctx, v, path, allowedTypes) {
  if (!isObj(v)) return add(ctx, "error", "invalid-reference", path, "Reference must be an object.");
  if (v.reference === undefined && v.identifier === undefined && v.display === undefined) {
    return add(ctx, "error", "invalid-reference", path, "Reference needs reference, identifier or display.");
  }
  if (v.reference === undefined) return;
  if (!nonEmptyStr(v.reference)) return add(ctx, "error", "invalid-reference", `${path}.reference`, "reference must be a non-empty string.");
  const ref = v.reference;
  if (ref.startsWith("#") || ref.startsWith("urn:uuid:") || /^https?:\/\//.test(ref)) {
    ctx.references.push({ path: `${path}.reference`, reference: ref });
    return;
  }
  const m = REL_REF.exec(ref);
  if (!m) return add(ctx, "error", "invalid-reference", `${path}.reference`, `"${ref}" is not a valid relative reference (expected Type/id).`);
  if (allowedTypes && !allowedTypes.includes(m[1])) {
    return add(ctx, "error", "invalid-reference", `${path}.reference`, `${m[1]} is not an allowed target here (allowed: ${allowedTypes.join(", ")}).`);
  }
  ctx.references.push({ path: `${path}.reference`, reference: ref, type: m[1], id: m[2] });
}

function checkRefField(ctx, r, key, targets, path = "") {
  const v = r[key];
  if (v === undefined) return;
  const p = `${path}${key}`;
  const allowed = targets?.[key];
  if (Array.isArray(v)) v.forEach((item, i) => checkReference(ctx, item, `${p}[${i}]`, allowed));
  else checkReference(ctx, v, p, allowed);
}

function checkArrayOf(ctx, r, key, fn, path) {
  if (r[key] === undefined) return;
  if (!Array.isArray(r[key]) || r[key].length === 0) return add(ctx, "error", "invalid-structure", `${path}.${key}`, `${key} must be a non-empty array.`);
  r[key].forEach((item, i) => fn(ctx, item, `${path}.${key}[${i}]`));
}

// ---- per-resource checks ---------------------------------------------------------------------
const CHECKERS = {
  Patient(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.name) checkHumanName(ctx, r.name, `${p}.name`);
    if (r.gender !== undefined) checkEnum(ctx, r.gender, `${p}.gender`, ENUMS.gender);
    if (r.birthDate !== undefined) checkPrimitive(ctx, r.birthDate, `${p}.birthDate`, "date");
    if (r.active !== undefined) checkPrimitive(ctx, r.active, `${p}.active`, "boolean");
    checkRefField(ctx, r, "managingOrganization", REF_TARGETS.Patient, `${p}.`);
    checkRefField(ctx, r, "generalPractitioner", REF_TARGETS.Patient, `${p}.`);
  },
  Practitioner(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.name) checkHumanName(ctx, r.name, `${p}.name`);
  },
  Organization(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.name !== undefined) checkPrimitive(ctx, r.name, `${p}.name`, "string");
    checkRefField(ctx, r, "partOf", REF_TARGETS.Organization, `${p}.`);
  },
  Encounter(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.status !== undefined) checkEnum(ctx, r.status, `${p}.status`, ENUMS.encounterStatus);
    if (r.class !== undefined) checkCoding(ctx, r.class, `${p}.class`);
    if (r.period !== undefined) checkPeriod(ctx, r.period, `${p}.period`);
    checkRefField(ctx, r, "subject", REF_TARGETS.Encounter, `${p}.`);
    checkRefField(ctx, r, "serviceProvider", REF_TARGETS.Encounter, `${p}.`);
    checkArrayOf(ctx, r, "participant", (c, item, ip) => {
      if (!isObj(item)) return add(c, "error", "invalid-structure", ip, "participant must be an object.");
      if (item.individual) checkReference(c, item.individual, `${ip}.individual`, REF_TARGETS.Encounter["participant.individual"]);
    }, p);
    checkArrayOf(ctx, r, "reasonCode", checkCodeableConcept, p);
  },
  Condition(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.clinicalStatus !== undefined) checkCodeableConcept(ctx, r.clinicalStatus, `${p}.clinicalStatus`);
    if (r.verificationStatus !== undefined) checkCodeableConcept(ctx, r.verificationStatus, `${p}.verificationStatus`);
    if (r.code !== undefined) checkCodeableConcept(ctx, r.code, `${p}.code`);
    checkArrayOf(ctx, r, "category", checkCodeableConcept, p);
    if (r.onsetDateTime !== undefined) checkPrimitive(ctx, r.onsetDateTime, `${p}.onsetDateTime`, "dateTime");
    if (r.recordedDate !== undefined) checkPrimitive(ctx, r.recordedDate, `${p}.recordedDate`, "dateTime");
    for (const k of ["subject", "encounter", "recorder", "asserter"]) checkRefField(ctx, r, k, REF_TARGETS.Condition, `${p}.`);
  },
  Observation(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.status !== undefined) checkEnum(ctx, r.status, `${p}.status`, ENUMS.observationStatus);
    checkArrayOf(ctx, r, "category", checkCodeableConcept, p);
    if (r.code !== undefined) checkCodeableConcept(ctx, r.code, `${p}.code`);
    if (r.effectiveDateTime !== undefined) checkPrimitive(ctx, r.effectiveDateTime, `${p}.effectiveDateTime`, "dateTime");
    if (r.issued !== undefined) checkPrimitive(ctx, r.issued, `${p}.issued`, "instant");
    if (r.valueQuantity !== undefined) checkQuantity(ctx, r.valueQuantity, `${p}.valueQuantity`);
    if (r.valueCodeableConcept !== undefined) checkCodeableConcept(ctx, r.valueCodeableConcept, `${p}.valueCodeableConcept`);
    if (r.valueString !== undefined) checkPrimitive(ctx, r.valueString, `${p}.valueString`, "string");
    if (r.dataAbsentReason !== undefined) checkCodeableConcept(ctx, r.dataAbsentReason, `${p}.dataAbsentReason`);
    if (r.component !== undefined) {
      if (!Array.isArray(r.component) || r.component.length === 0) add(ctx, "error", "invalid-structure", `${p}.component`, "component must be a non-empty array.");
      else
        r.component.forEach((c, i) => {
          const cp = `${p}.component[${i}]`;
          if (!isObj(c)) return add(ctx, "error", "invalid-structure", cp, "component must be an object.");
          if (c.code === undefined) add(ctx, "error", "missing-required", `${cp}.code`, "component.code is required.");
          else checkCodeableConcept(ctx, c.code, `${cp}.code`);
          if (c.valueQuantity !== undefined) checkQuantity(ctx, c.valueQuantity, `${cp}.valueQuantity`);
        });
    }
    // R4 invariant obs-6: no value[x] and no dataAbsentReason unless there are components / members.
    const hasValue = Object.keys(r).some((k) => k.startsWith("value"));
    if (!hasValue && r.dataAbsentReason === undefined && r.component === undefined && r.hasMember === undefined) {
      add(ctx, "error", "missing-required", `${p}`, "Observation needs a value[x], component, hasMember or dataAbsentReason.");
    }
    for (const k of ["subject", "encounter", "performer", "hasMember"]) checkRefField(ctx, r, k, REF_TARGETS.Observation, `${p}.`);
  },
  MedicationRequest(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.status !== undefined) checkEnum(ctx, r.status, `${p}.status`, ENUMS.medStatus);
    if (r.intent !== undefined) checkEnum(ctx, r.intent, `${p}.intent`, ENUMS.medIntent);
    if (r.medicationCodeableConcept === undefined && r.medicationReference === undefined) {
      add(ctx, "error", "missing-required", `${p}.medication[x]`, "medicationCodeableConcept or medicationReference is required.");
    }
    if (r.medicationCodeableConcept !== undefined) checkCodeableConcept(ctx, r.medicationCodeableConcept, `${p}.medicationCodeableConcept`);
    if (r.authoredOn !== undefined) checkPrimitive(ctx, r.authoredOn, `${p}.authoredOn`, "dateTime");
    for (const k of ["subject", "encounter", "requester", "reasonReference"]) checkRefField(ctx, r, k, REF_TARGETS.MedicationRequest, `${p}.`);
  },
  DiagnosticReport(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.status !== undefined) checkEnum(ctx, r.status, `${p}.status`, ENUMS.reportStatus);
    if (r.code !== undefined) checkCodeableConcept(ctx, r.code, `${p}.code`);
    checkArrayOf(ctx, r, "category", checkCodeableConcept, p);
    if (r.effectiveDateTime !== undefined) checkPrimitive(ctx, r.effectiveDateTime, `${p}.effectiveDateTime`, "dateTime");
    if (r.issued !== undefined) checkPrimitive(ctx, r.issued, `${p}.issued`, "instant");
    for (const k of ["subject", "encounter", "performer", "result"]) checkRefField(ctx, r, k, REF_TARGETS.DiagnosticReport, `${p}.`);
  },
  AllergyIntolerance(ctx, r, p) {
    if (r.identifier) checkIdentifierList(ctx, r.identifier, `${p}.identifier`);
    if (r.clinicalStatus !== undefined) checkCodeableConcept(ctx, r.clinicalStatus, `${p}.clinicalStatus`);
    if (r.verificationStatus !== undefined) checkCodeableConcept(ctx, r.verificationStatus, `${p}.verificationStatus`);
    if (r.type !== undefined) checkEnum(ctx, r.type, `${p}.type`, ENUMS.allergyType);
    if (r.criticality !== undefined) checkEnum(ctx, r.criticality, `${p}.criticality`, ENUMS.criticality);
    if (r.code !== undefined) checkCodeableConcept(ctx, r.code, `${p}.code`);
    if (r.recordedDate !== undefined) checkPrimitive(ctx, r.recordedDate, `${p}.recordedDate`, "dateTime");
    for (const k of ["patient", "encounter", "recorder", "asserter"]) checkRefField(ctx, r, k, REF_TARGETS.AllergyIntolerance, `${p}.`);
  },
  DocumentReference(ctx, r, p) {
    if (r.status !== undefined) checkEnum(ctx, r.status, `${p}.status`, ENUMS.docStatus);
    if (r.type !== undefined) checkCodeableConcept(ctx, r.type, `${p}.type`);
    if (r.date !== undefined) checkPrimitive(ctx, r.date, `${p}.date`, "instant");
    for (const k of ["subject", "author", "custodian"]) checkRefField(ctx, r, k, REF_TARGETS.DocumentReference, `${p}.`);
    if (r.content !== undefined) {
      if (!Array.isArray(r.content) || r.content.length === 0) add(ctx, "error", "invalid-structure", `${p}.content`, "content must be a non-empty array.");
      else
        r.content.forEach((c, i) => {
          const cp = `${p}.content[${i}]`;
          if (!isObj(c) || !isObj(c.attachment)) return add(ctx, "error", "missing-required", `${cp}.attachment`, "content.attachment is required.");
          const a = c.attachment;
          if (a.contentType !== undefined && !nonEmptyStr(a.contentType)) add(ctx, "error", "invalid-value", `${cp}.attachment.contentType`, "contentType must be a non-empty string.");
          if (a.data === undefined && a.url === undefined) add(ctx, "error", "missing-required", `${cp}.attachment`, "attachment needs data or url.");
          if (a.data !== undefined && !(typeof a.data === "string" && /^[A-Za-z0-9+/]*={0,2}$/.test(a.data))) add(ctx, "error", "invalid-value", `${cp}.attachment.data`, "attachment.data must be base64.");
        });
    }
  },
};

function validateMeta(ctx, r, p) {
  if (r.meta === undefined) return;
  if (!isObj(r.meta)) return add(ctx, "error", "invalid-structure", `${p}.meta`, "meta must be an object.");
  if (r.meta.lastUpdated !== undefined) checkPrimitive(ctx, r.meta.lastUpdated, `${p}.meta.lastUpdated`, "instant");
  if (r.meta.tag !== undefined) checkArrayOf(ctx, r.meta, "tag", checkCoding, `${p}.meta`);
}

/** Validate one resource object into `ctx` (does not resolve references). */
function validateResourceInto(ctx, r, path) {
  const type = r.resourceType;
  if (!SUPPORTED_RESOURCE_TYPES.includes(type)) {
    add(
      ctx,
      "error",
      "unsupported-resource-type",
      `${path}.resourceType`,
      type === undefined
        ? 'Missing "resourceType".'
        : `Unsupported resourceType "${String(type)}". Supported: ${SUPPORTED_RESOURCE_TYPES.join(", ")}.`
    );
    return;
  }
  for (const key of Object.keys(r)) {
    if (key.startsWith("_")) continue; // primitive extensions
    if (!ELEMENTS[type].has(key)) add(ctx, "error", "unknown-element", `${path}.${key}`, `"${key}" is not a valid element of ${type} (FHIR R4).`);
  }
  if (r.id === undefined) add(ctx, "error", "missing-required", `${path}.id`, "Resource id is required.");
  else checkPrimitive(ctx, r.id, `${path}.id`, "id");
  validateMeta(ctx, r, path);

  for (const req of REQUIRED[type] ?? []) {
    if (r[req] === undefined || r[req] === null || (Array.isArray(r[req]) && r[req].length === 0)) {
      const code = req === "identifier" ? "missing-identifier" : "missing-required";
      add(ctx, "error", code, `${path}.${req}`, req === "identifier" ? "Missing required identifier." : `Missing required field "${req}".`);
    }
  }
  CHECKERS[type](ctx, r, path);
}

function summarize(ctx, { resourceType, resourceId, jsonOk = true, typeOk = true, extra = {} }) {
  const errors = ctx.issues.filter((i) => i.severity === "error");
  const failing = new Set(errors.map((i) => CHECK_OF[i.code]));
  const row = (id, label, skipped = false) => ({
    id,
    label,
    status: skipped ? "skipped" : failing.has(id) ? "failed" : "passed",
    passed: !skipped && !failing.has(id),
  });
  const skip = !jsonOk || !typeOk;
  const identifierApplies = resourceType === "Bundle" || IDENTIFIER_REQUIRED.has(resourceType);
  const checks = [
    row("json", "JSON structure valid"),
    row("resourceType", "Resource type valid", !jsonOk),
    row("structure", "Expected structure (elements & data types)", skip),
    row("required", "Required fields present", skip),
    { ...row("identifier", identifierApplies ? "Identifier present" : "Identifier (not required for this type)", skip), applicable: identifierApplies },
    row("references", "References valid", skip),
  ];
  return {
    validator: VALIDATOR_NAME,
    disclaimer: VALIDATOR_DISCLAIMER,
    status: errors.length === 0 ? "VALID" : "INVALID",
    resourceType: resourceType ?? null,
    resourceId: resourceId ?? null,
    checks,
    issues: ctx.issues,
    errorCount: errors.length,
    warningCount: ctx.issues.length - errors.length,
    ...extra,
  };
}

/** Validate a single resource. `input` may be a JSON string or an already-parsed object. */
export function validateResource(input) {
  const ctx = makeCtx();
  const parsed = parseInput(ctx, input);
  if (!parsed.ok) return summarize(ctx, { jsonOk: false, typeOk: false });
  const r = parsed.value;
  if (r.resourceType === "Bundle") return validateBundleObject(r);
  const typeOk = SUPPORTED_RESOURCE_TYPES.includes(r.resourceType);
  validateResourceInto(ctx, r, r.resourceType ?? "resource");
  return summarize(ctx, { resourceType: r.resourceType, resourceId: r.id, typeOk });
}

function parseInput(ctx, input) {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      add(ctx, "error", "invalid-json", "$", "Input is not valid JSON.");
      return { ok: false };
    }
  }
  if (!isObj(value)) {
    add(ctx, "error", "invalid-json", "$", "A FHIR resource must be a JSON object.");
    return { ok: false };
  }
  return { ok: true, value };
}

export function validateBundle(input) {
  const ctx = makeCtx();
  const parsed = parseInput(ctx, input);
  if (!parsed.ok) return summarize(ctx, { jsonOk: false, typeOk: false });
  return validateBundleObject(parsed.value);
}

function validateBundleObject(b) {
  const ctx = makeCtx();
  if (b.resourceType !== "Bundle") {
    add(ctx, "error", "unsupported-resource-type", "resourceType", 'A Bundle must have resourceType "Bundle".');
    return summarize(ctx, { resourceType: b.resourceType, resourceId: b.id, typeOk: false });
  }
  for (const key of Object.keys(b)) {
    if (!key.startsWith("_") && !ELEMENTS.Bundle.has(key)) add(ctx, "error", "unknown-element", `Bundle.${key}`, `"${key}" is not a valid element of Bundle (FHIR R4).`);
  }
  if (b.id !== undefined) checkPrimitive(ctx, b.id, "Bundle.id", "id");
  validateMeta(ctx, b, "Bundle");
  if (b.identifier === undefined) add(ctx, "error", "missing-identifier", "Bundle.identifier", "Missing required identifier.");
  else if (!isObj(b.identifier) || !nonEmptyStr(b.identifier.value)) add(ctx, "error", "missing-identifier", "Bundle.identifier.value", "Bundle.identifier needs a value.");
  if (!BUNDLE_TYPES.has(b.type)) add(ctx, "error", "invalid-bundle", "Bundle.type", `Bundle.type must be one of: ${[...BUNDLE_TYPES].join(", ")}.`);
  if (b.timestamp !== undefined) checkPrimitive(ctx, b.timestamp, "Bundle.timestamp", "instant");

  const entries = Array.isArray(b.entry) ? b.entry : [];
  if (b.entry !== undefined && !Array.isArray(b.entry)) add(ctx, "error", "invalid-structure", "Bundle.entry", "entry must be an array.");
  if (b.total !== undefined) {
    if (!Number.isInteger(b.total) || b.total < 0) add(ctx, "error", "invalid-value", "Bundle.total", "total must be an unsigned integer.");
    else if (b.type === "searchset" || b.type === "history") {
      /* total legitimately differs from entry count in these types */
    } else if (b.total !== entries.length) add(ctx, "error", "invalid-bundle", "Bundle.total", `total (${b.total}) does not match the number of entries (${entries.length}).`);
  }
  if (b.type === "collection" && entries.length === 0) add(ctx, "warning", "invalid-bundle", "Bundle.entry", "Bundle has no entries.");

  const index = new Map(); // "Type/id" -> fullUrl
  const fullUrls = new Set();
  const perEntry = [];

  entries.forEach((entry, i) => {
    const ep = `Bundle.entry[${i}]`;
    const entryCtx = makeCtx();
    if (!isObj(entry) || !isObj(entry.resource)) {
      add(ctx, "error", "invalid-bundle", ep, "Each entry must contain a resource object.");
      perEntry.push({ index: i, resourceType: null, id: null, status: "INVALID", issueCount: 1 });
      return;
    }
    if (b.type === "collection" && (entry.request || entry.response)) {
      add(ctx, "error", "invalid-bundle", ep, "entry.request/response are not allowed in a collection Bundle.");
    }
    if (!nonEmptyStr(entry.fullUrl)) add(ctx, "error", "missing-required", `${ep}.fullUrl`, "entry.fullUrl is required.");
    else if (fullUrls.has(entry.fullUrl)) add(ctx, "error", "invalid-bundle", `${ep}.fullUrl`, `Duplicate fullUrl ${entry.fullUrl}.`);
    else fullUrls.add(entry.fullUrl);

    validateResourceInto(entryCtx, entry.resource, `${ep}.resource`);
    const key = `${entry.resource.resourceType}/${entry.resource.id}`;
    if (index.has(key)) add(ctx, "error", "invalid-bundle", ep, `Duplicate resource ${key} in bundle.`);
    index.set(key, entry.fullUrl);
    ctx.issues.push(...entryCtx.issues);
    ctx.references.push(...entryCtx.references);
    const errs = entryCtx.issues.filter((x) => x.severity === "error").length;
    perEntry.push({ index: i, resourceType: entry.resource.resourceType ?? null, id: entry.resource.id ?? null, status: errs ? "INVALID" : "VALID", issueCount: entryCtx.issues.length });
  });

  // Reference resolution inside the bundle.
  const urls = new Set(fullUrls);
  for (const ref of ctx.references) {
    if (ref.reference.startsWith("#")) continue; // contained
    const resolved = ref.type ? index.has(`${ref.type}/${ref.id}`) : urls.has(ref.reference) || [...index.values()].includes(ref.reference);
    if (!resolved) add(ctx, "error", "unresolved-reference", ref.path, `Reference "${ref.reference}" does not resolve to any entry in this Bundle.`);
  }

  const types = {};
  for (const e of perEntry) if (e.resourceType) types[e.resourceType] = (types[e.resourceType] ?? 0) + 1;
  return summarize(ctx, {
    resourceType: "Bundle",
    resourceId: b.id,
    extra: { bundle: { type: b.type ?? null, entryCount: entries.length, resourceTypes: types, entries: perEntry, referencesChecked: ctx.references.length } },
  });
}

/** Single entry point used by the API: routes Bundles and single resources appropriately. */
export function validateFhir(input) {
  return validateResource(input);
}
