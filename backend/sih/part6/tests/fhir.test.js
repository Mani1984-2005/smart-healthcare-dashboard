import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../config.js";
import { createPart6 } from "../createPart6.js";
import { validateFhir, validateBundle } from "../fhir/validator.js";
import { scopeToCategories, buildBundle } from "../fhir/bundle.js";
import { categoryOfResource } from "../domain/constants.js";

const mk = () => createPart6({ config: loadConfig({}, { storage: "memory", tokenSecret: "t".repeat(40) }) });
const doc = (p) => p.repo.get("part6_users", "USR-DOC-001");

test("Patient resource is generated with the expected FHIR structure and validates", () => {
  const p = mk();
  const { resources } = p.fhir.generate(doc(p), { patientId: "MCP-DEMO-001", resourceTypes: ["Patient"] }, null);
  const patient = resources.find((r) => r.resource.resourceType === "Patient").resource;
  assert.equal(patient.id, "MCP-DEMO-001");
  assert.equal(patient.gender, "female");
  assert.equal(patient.birthDate, "1985-04-12");
  assert.equal(patient.meta.tag[0].code, "DEMO-DATA");
  assert.equal(validateFhir(patient).status, "VALID");
});

test("internal patient id and ABHA identity are separate identifiers in different systems", () => {
  const p = mk();
  const patient = p.fhir.mapForPatient("MCP-DEMO-001").find((r) => r.resourceType === "Patient");
  const internal = patient.identifier.find((i) => i.value === "MCP-DEMO-001");
  const abha = patient.identifier.find((i) => i.value === "DEMO-ABHA-001");
  assert.ok(internal && abha);
  assert.notEqual(internal.system, abha.system);
  assert.match(abha.assigner.display, /not issued or verified by ABDM/);
});

test("Observation generation: blood pressure panel carries LOINC components with UCUM units", () => {
  const p = mk();
  const bp = p.fhir.mapForPatient("MCP-DEMO-001").find((r) => r.id === "OBS-DEMO-001");
  assert.equal(bp.resourceType, "Observation");
  assert.equal(bp.status, "final");
  assert.deepEqual(bp.component.map((c) => c.code.coding[0].code), ["8480-6", "8462-4"]);
  assert.equal(bp.component[0].valueQuantity.system, "http://unitsofmeasure.org");
  assert.equal(validateFhir(bp).status, "VALID");
});

test("every generated resource type for both demo patients validates", () => {
  const p = mk();
  for (const pid of ["MCP-DEMO-001", "MCP-DEMO-002"]) {
    for (const r of p.fhir.mapForPatient(pid)) {
      const v = validateFhir(r);
      assert.equal(v.status, "VALID", `${r.resourceType}/${r.id}: ${JSON.stringify(v.issues)}`);
    }
  }
});

test("Bundle generation: collection bundle, entries, resolvable references, VALID", () => {
  const p = mk();
  const out = p.fhir.generateBundle(doc(p), { patientId: "MCP-DEMO-001" }, null);
  assert.equal(out.bundle.type, "collection");
  assert.equal(out.bundle.total, out.bundle.entry.length);
  assert.match(out.summary.id, /^BND-DEMO-\d{3}$/);
  assert.equal(out.validation.status, "VALID");
  assert.ok(out.validation.bundle.referencesChecked > 10, "references should actually be checked");
  const types = new Set(out.bundle.entry.map((e) => e.resource.resourceType));
  for (const t of ["Patient", "Encounter", "Condition", "Observation", "MedicationRequest", "DiagnosticReport", "AllergyIntolerance", "DocumentReference"]) assert.ok(types.has(t), t);
});

test("invalid FHIR detection: missing identifier and wrong reference are reported", () => {
  const p = mk();
  const patient = structuredClone(p.fhir.mapForPatient("MCP-DEMO-001")[0]);
  delete patient.identifier;
  patient.managingOrganization = { reference: "Practitioner/x" };
  const v = validateFhir(patient);
  assert.equal(v.status, "INVALID");
  assert.ok(v.issues.some((i) => i.code === "missing-identifier"));
  assert.ok(v.issues.some((i) => i.code === "invalid-reference"));
  assert.equal(v.checks.find((c) => c.id === "identifier").status, "failed");
  assert.equal(v.checks.find((c) => c.id === "references").status, "failed");
});

test("missing required field detection: Observation without status/code/subject", () => {
  const v = validateFhir({ resourceType: "Observation", id: "o1", valueString: "x" });
  assert.equal(v.status, "INVALID");
  const missing = v.issues.filter((i) => i.code === "missing-required").map((i) => i.path);
  for (const f of ["Observation.status", "Observation.code", "Observation.subject"]) assert.ok(missing.includes(f), f);
});

test("bad JSON, unsupported type, unknown element, bad enum and bad date are all caught", () => {
  assert.equal(validateFhir("{not json").status, "INVALID");
  assert.equal(validateFhir("{not json").issues[0].code, "invalid-json");
  assert.equal(validateFhir({ resourceType: "Spaceship", id: "x" }).issues[0].code, "unsupported-resource-type");
  const p = mk();
  const pat = structuredClone(p.fhir.mapForPatient("MCP-DEMO-001")[0]);
  pat.favouriteColour = "blue";
  pat.gender = "robot";
  pat.birthDate = "12/04/1985";
  const v = validateFhir(pat);
  const codes = v.issues.map((i) => `${i.code}@${i.path}`);
  assert.ok(codes.includes("unknown-element@Patient.favouriteColour"));
  assert.ok(codes.includes("invalid-value@Patient.gender"));
  assert.ok(codes.includes("invalid-value@Patient.birthDate"));
});

test("bundle rules: dangling reference, duplicate fullUrl, wrong total, request in collection", () => {
  const p = mk();
  const { bundle } = p.fhir.generateBundle(doc(p), { patientId: "MCP-DEMO-001", resourceTypes: ["Condition"] }, null);

  const dangling = structuredClone(bundle);
  dangling.entry = dangling.entry.filter((e) => e.resource.resourceType !== "Patient");
  dangling.total = dangling.entry.length;
  const v1 = validateBundle(dangling);
  assert.equal(v1.status, "INVALID");
  assert.ok(v1.issues.some((i) => i.code === "unresolved-reference"));

  const dup = structuredClone(bundle);
  dup.entry[1].fullUrl = dup.entry[0].fullUrl;
  assert.ok(validateBundle(dup).issues.some((i) => /Duplicate fullUrl/.test(i.message)));

  const badTotal = structuredClone(bundle);
  badTotal.total = 99;
  assert.ok(validateBundle(badTotal).issues.some((i) => i.path === "Bundle.total"));

  const withReq = structuredClone(bundle);
  withReq.entry[0].request = { method: "POST", url: "Patient" };
  assert.ok(validateBundle(withReq).issues.some((i) => /not allowed in a collection/.test(i.message)));

  const noType = structuredClone(bundle);
  noType.type = "nonsense";
  assert.ok(validateBundle(noType).issues.some((i) => i.path === "Bundle.type"));
});

test("validation result for a valid resource lists passing checks and never claims certification", () => {
  const p = mk();
  const v = validateFhir(p.fhir.mapForPatient("MCP-DEMO-001")[0]);
  assert.equal(v.status, "VALID");
  assert.ok(v.checks.every((c) => c.status === "passed"));
  assert.match(v.disclaimer, /Not the official HL7 validator/);
  assert.doesNotMatch(JSON.stringify(v), /FHIR certified|HIPAA/i);
});

test("scopeToCategories keeps only allowed categories and strips references to withheld records", () => {
  const p = mk();
  const all = p.fhir.mapForPatient("MCP-DEMO-001");
  const { resources, redactions } = scopeToCategories(all, ["medications"]);
  const types = resources.map((r) => r.resourceType);
  assert.ok(types.includes("Patient") && types.includes("MedicationRequest"));
  for (const t of ["Condition", "Encounter", "Observation", "DiagnosticReport", "AllergyIntolerance", "DocumentReference"]) assert.ok(!types.includes(t), `${t} leaked`);
  const med = resources.find((r) => r.id === "MED-DEMO-001");
  assert.equal(med.encounter, undefined, "encounter reference should be removed");
  assert.equal(med.reasonReference, undefined, "condition reference should be removed");
  assert.ok(redactions.length >= 2);
  // and the minimised bundle is still self-consistent
  const bundle = buildBundle({ id: "BND-T-1", resources, now: new Date(), baseUrl: "https://medicare-pro.example/fhir" });
  assert.equal(validateBundle(bundle).status, "VALID");
});

test("category mapping: lab vs vital-sign observations", () => {
  const p = mk();
  const all = p.fhir.mapForPatient("MCP-DEMO-001");
  assert.equal(categoryOfResource(all.find((r) => r.id === "OBS-DEMO-002")), "lab-reports");
  assert.equal(categoryOfResource(all.find((r) => r.id === "OBS-DEMO-001")), "clinical-history");
});
