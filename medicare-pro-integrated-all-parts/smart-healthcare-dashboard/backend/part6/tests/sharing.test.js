import { test } from "node:test";
import assert from "node:assert/strict";
import { startApp, requestConsent, U } from "./helpers.js";
import { validateBundle } from "../fhir/validator.js";

async function grantedConsent(app, categories, days = 30) {
  const c = await requestConsent(app, categories, days);
  const g = await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
  assert.equal(g.status, 200);
  return g.body;
}

test("allowed data sharing: recipient doctor pulls exactly the consented categories as a valid bundle", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["medications", "allergies"]);
    const r = await app.as(U.docClinic).post("/share", { consentId: c.id });
    assert.equal(r.status, 200);
    assert.equal(r.body.share.side, "recipient-pull");
    const types = new Set(r.body.bundle.entry.map((e) => e.resource.resourceType));
    assert.ok(types.has("MedicationRequest") && types.has("AllergyIntolerance") && types.has("Patient"));
    for (const t of ["Condition", "Observation", "Encounter", "DiagnosticReport", "DocumentReference"]) assert.ok(!types.has(t), `${t} must not be shared`);
    assert.equal(validateBundle(r.body.bundle).status, "VALID");
    assert.deepEqual(r.body.minimisation.categoriesWithheld.sort(), ["clinical-history", "diagnostic-reports", "documents", "lab-reports"]);
    // the share record stores metadata and a checksum, not the payload
    const stored = app.part6.repo.get("part6_data_shares", r.body.share.id);
    assert.ok(stored.checksum && !("bundle" in stored));
    assert.ok(app.part6.audit.all().some((e) => e.action === "RECORD_SHARED" && e.consentId === c.id));
  } finally { await app.close(); }
});

test("custodian doctor may release under consent too (custodian-release)", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["medications"]);
    const r = await app.as(U.docHospital).post("/share", { consentId: c.id });
    assert.equal(r.status, 200);
    assert.equal(r.body.share.side, "custodian-release");
  } finally { await app.close(); }
});

test("blocked sharing without consent: missing id, unknown id, pending consent", async () => {
  const app = await startApp();
  try {
    const doc = app.as(U.docClinic);
    const none = await doc.post("/share", {});
    assert.equal(none.status, 403);
    assert.equal(none.body.error.code, "CONSENT_REQUIRED");
    assert.match(none.body.error.message, /Valid consent is required/);
    assert.equal((await doc.post("/share", { consentId: "CONS-DEMO-999" })).body.error.code, "CONSENT_REQUIRED");
    const pending = await requestConsent(app);
    assert.equal((await doc.post("/share", { consentId: pending.id })).body.error.code, "CONSENT_PENDING");
    assert.equal(app.part6.repo.count("part6_data_shares"), 0, "nothing may be recorded as shared");
  } finally { await app.close(); }
});

test("restricted data categories: asking for more than was granted is blocked and flagged", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["medications"]);
    const r = await app.as(U.docClinic).post("/share", { consentId: c.id, categories: ["medications", "lab-reports"] });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, "SCOPE_EXCEEDED");
    assert.deepEqual(r.body.error.details.notConsented, ["lab-reports"]);
    assert.ok(app.part6.audit.all().some((e) => e.action === "CONSENT_VIOLATION_ATTEMPT" && e.consentId === c.id));
    // a narrower request inside scope still works
    assert.equal((await app.as(U.docClinic).post("/share", { consentId: c.id, categories: ["medications"] })).status, 200);
  } finally { await app.close(); }
});

test("revoked consent blocks further sharing with 'Consent is no longer active.'", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["medications"]);
    assert.equal((await app.as(U.docClinic).post("/share", { consentId: c.id })).status, 200);
    await app.as(U.patient).post(`/consent/${c.id}/revoke`, {});
    const r = await app.as(U.docClinic).post("/share", { consentId: c.id });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, "CONSENT_REVOKED");
    assert.equal(r.body.error.message, "Consent is no longer active.");
    assert.equal(app.part6.repo.count("part6_data_shares"), 1);
  } finally { await app.close(); }
});

test("consent expiry blocks sharing once the demo clock passes it", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["medications"], 3);
    assert.equal((await app.as(U.docClinic).post("/share", { consentId: c.id })).status, 200);
    await app.as(U.sysAdmin).post("/demo/clock/advance", { days: 4 });
    const r = await app.as(U.docClinic).post("/share", { consentId: c.id });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, "CONSENT_EXPIRED");
  } finally { await app.close(); }
});

test("unauthorised sharing: patients and system admins have no record.share permission", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["medications"]);
    const p = await app.as(U.patient).post("/share", { consentId: c.id });
    assert.equal(p.status, 403);
    assert.equal(p.body.error.code, "FORBIDDEN");
    assert.equal((await app.as(U.sysAdmin).post("/share", { consentId: c.id })).status, 403);
    assert.equal(app.part6.repo.count("part6_data_shares"), 0);
  } finally { await app.close(); }
});

test("consent violation attempt: a doctor from an organisation that is not a party cannot use someone else's consent", async () => {
  const app = await startApp();
  try {
    // Only two demo orgs exist and both are always parties, so add a third org + doctor for this test.
    app.part6.repo.put("part6_organizations", "ORG-TEST-003", { id: "ORG-TEST-003", name: "Unrelated Test Clinic" });
    app.part6.repo.put("part6_users", "USR-DOC-TEST3", { id: "USR-DOC-TEST3", displayName: "Dr. Outsider", role: "DOCTOR", patientId: null, orgId: "ORG-TEST-003", blurb: "test" });
    const c = await grantedConsent(app, ["medications"]);
    const r = await app.as("USR-DOC-TEST3").post("/share", { consentId: c.id });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, "CONSENT_NOT_FOR_CALLER");
    const flagged = app.part6.audit.all().filter((e) => e.action === "CONSENT_VIOLATION_ATTEMPT" && e.actor.userId === "USR-DOC-TEST3");
    assert.equal(flagged.length, 1);
    assert.equal(flagged[0].status, "denied");
    assert.equal(app.part6.repo.count("part6_data_shares"), 0);
  } finally { await app.close(); }
});

test("a consent never exposes another patient's data even to a legitimate recipient", async () => {
  const app = await startApp();
  try {
    const other = await app.as(U.patient2).post("/consent", { patientId: "MCP-DEMO-002", recipientOrgId: "ORG-DEMO-001", purpose: "REFERRAL", categories: ["allergies", "medications"], durationDays: 5 });
    assert.equal(other.status, 201);
    const r = await app.as(U.docHospital).post("/share", { consentId: other.body.id });
    assert.equal(r.status, 200);
    const text = JSON.stringify(r.body.bundle);
    assert.ok(!text.includes("MCP-DEMO-001"), "patient 1 data must not appear in a patient 2 share");
    assert.ok(r.body.bundle.entry.every((e) => !e.resource.subject || e.resource.subject.reference === "Patient/MCP-DEMO-002"));
  } finally { await app.close(); }
});

test("data minimisation: withheld records are not referenced in the shared bundle", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["diagnostic-reports"]);
    const r = await app.as(U.docClinic).post("/share", { consentId: c.id });
    const report = r.body.bundle.entry.find((e) => e.resource.resourceType === "DiagnosticReport").resource;
    assert.equal(report.result, undefined, "lab observation references must be stripped when lab-reports is not shared");
    assert.equal(report.encounter, undefined);
    assert.ok(r.body.minimisation.redactions.length > 0);
    const text = JSON.stringify(r.body.bundle);
    assert.ok(!text.includes("OBS-DEMO-002") && !text.includes("ENC-DEMO-001"));
  } finally { await app.close(); }
});

test("share history is visible to the patient (what, to whom, when) and hidden from other patients", async () => {
  const app = await startApp();
  try {
    const c = await grantedConsent(app, ["medications"]);
    await app.as(U.docClinic).post("/share", { consentId: c.id });
    const mine = await app.as(U.patient).get("/share");
    assert.equal(mine.body.shares.length, 1);
    assert.equal(mine.body.shares[0].recipientOrgName, "Demo Community Clinic");
    assert.deepEqual(mine.body.shares[0].categories, ["medications"]);
    assert.equal((await app.as(U.patient2).get("/share")).body.shares.length, 0);
  } finally { await app.close(); }
});
