// The complete SIH demonstration (14 steps) driven purely through the public HTTP API, Part 6 alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { startApp, U } from "./helpers.js";

test("full demo scenario: FHIR -> validation -> consent -> share -> audit -> revoke -> blocked -> audit trail", async () => {
  const app = await startApp();
  try {
    const hospitalDoc = app.as(U.docHospital);   // Dr. Demo User, custodian of Demo Patient
    const clinicDoc = app.as(U.docClinic);       // Dr. Demo Two, requester
    const patient = app.as(U.patient);
    const sys = app.as(U.sysAdmin);

    // 1-3. open Part 6, select the demo patient, view identity
    const list = await hospitalDoc.get("/patients");
    assert.ok(list.body.patients.some((p) => p.id === "MCP-DEMO-001" && p.relation === "custodian"));
    const identity = await hospitalDoc.get("/patients/MCP-DEMO-001/identity");
    assert.equal(identity.body.internal.patientId, "MCP-DEMO-001");
    assert.equal(identity.body.abha.status, "DEMO_NOT_CONNECTED");

    // 4. generate FHIR Patient
    const patientRes = await hospitalDoc.post("/fhir/generate", { patientId: "MCP-DEMO-001", resourceTypes: ["Patient"] });
    assert.equal(patientRes.body.resources[0].resource.resourceType, "Patient");
    assert.equal(patientRes.body.label, "FHIR DEMO RESOURCE");

    // 5. add Encounter, Observation, Condition, DiagnosticReport
    const more = await hospitalDoc.post("/fhir/generate", { patientId: "MCP-DEMO-001", resourceTypes: ["Encounter", "Observation", "Condition", "DiagnosticReport"] });
    const generatedTypes = new Set(more.body.resources.map((r) => r.resource.resourceType));
    for (const t of ["Encounter", "Observation", "Condition", "DiagnosticReport"]) assert.ok(generatedTypes.has(t), t);

    // 6-7. generate + validate the Bundle
    const bundle = await hospitalDoc.post("/fhir/bundle", { patientId: "MCP-DEMO-001" });
    assert.equal(bundle.body.bundle.type, "collection");
    const validated = await hospitalDoc.post("/fhir/validate", { bundleId: bundle.body.summary.id });
    assert.equal(validated.body.status, "VALID");
    assert.ok(validated.body.checks.every((c) => c.status === "passed" || c.applicable === false));

    // 8. consent request (from the other organisation)
    const req = await clinicDoc.post("/consent", { patientId: "MCP-DEMO-001", purpose: "CARE_CONTINUITY", categories: ["clinical-history", "lab-reports", "medications"], durationDays: 30 });
    assert.equal(req.status, 201);
    assert.equal(req.body.status, "Pending");
    const id = req.body.id;

    // Before consent: sharing is refused.
    const early = await clinicDoc.post("/share", { consentId: id });
    assert.equal(early.status, 403);
    assert.equal(early.body.error.code, "CONSENT_PENDING");

    // 9. patient grants, narrowing scope (drops lab reports)
    const grant = await patient.post(`/consent/${id}/grant`, { categories: ["clinical-history", "medications"] });
    assert.equal(grant.body.status, "Granted");

    // 10-11. controlled share (and audit entry)
    const shared = await clinicDoc.post("/share", { consentId: id });
    assert.equal(shared.status, 200);
    const sharedTypes = new Set(shared.body.bundle.entry.map((e) => e.resource.resourceType));
    assert.ok(sharedTypes.has("Condition") && sharedTypes.has("MedicationRequest"));
    assert.ok(!sharedTypes.has("DiagnosticReport"), "lab-related data withheld");
    assert.ok(!JSON.stringify(shared.body.bundle).includes("HbA1c"), "lab observations withheld");

    // patient can inspect what was shared, with whom, until when
    const mine = await patient.get("/share");
    assert.equal(mine.body.shares[0].consentId, id);
    assert.deepEqual(mine.body.shares[0].categories, ["clinical-history", "medications"]);

    // 12. revoke
    const revoked = await patient.post(`/consent/${id}/revoke`, {});
    assert.equal(revoked.body.status, "Revoked");

    // 13. another restricted share attempt is blocked
    const blocked = await clinicDoc.post("/share", { consentId: id });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, "CONSENT_REVOKED");
    assert.equal(blocked.body.error.message, "Consent is no longer active.");

    // unauthorised action: patient tries to generate FHIR -> blocked and logged
    const unauthorised = await patient.post("/fhir/generate", { patientId: "MCP-DEMO-001" });
    assert.equal(unauthorised.status, 403);

    // 14. the audit log tells the whole story, in order, and its hash chain verifies
    const log = (await sys.get("/audit?limit=500")).body.entries.slice().reverse();
    const mineActions = log.filter((e) => e.consentId === id || ["FHIR_BUNDLE_GENERATED", "PERMISSION_DENIED"].includes(e.action)).map((e) => e.action);
    const order = ["FHIR_BUNDLE_GENERATED", "CONSENT_REQUESTED", "SHARE_BLOCKED", "CONSENT_GRANTED", "RECORD_SHARED", "CONSENT_REVOKED", "SHARE_BLOCKED", "PERMISSION_DENIED"];
    let cursor = 0;
    for (const a of mineActions) if (a === order[cursor]) cursor++;
    assert.equal(cursor, order.length, `audit sequence out of order: ${mineActions.join(" > ")}`);
    assert.equal((await sys.get("/audit/verify")).body.ok, true);

    // dashboard numbers are derived from that real state
    const ov = (await patient.get("/overview")).body;
    assert.equal(ov.counts.sharedRecords, 1);
    assert.ok(ov.counts.securityEvents >= 2);
    assert.equal(ov.modes.abdmMode, "demo");
  } finally { await app.close(); }
});

test("seeded dashboard state is real data: the counts match the seeded consents", async () => {
  const app = await startApp();
  try {
    const sys = (await app.as(U.sysAdmin).get("/overview")).body;
    const consents = (await app.as(U.sysAdmin).get("/consent")).body.consents;
    assert.equal(consents.length, 7);
    assert.equal(sys.counts.activeConsents, consents.filter((c) => c.active).length);
    assert.equal(sys.counts.pendingRequests, consents.filter((c) => c.status === "Pending").length);
    for (const st of ["Pending", "Granted", "Denied", "Revoked", "Expired"]) assert.ok(consents.some((c) => c.status === st), `seed should include a ${st} consent`);
    assert.ok(sys.recentActivity.length >= 1);
  } finally { await app.close(); }
});
