import { test } from "node:test";
import assert from "node:assert/strict";
import { startApp, requestConsent, U } from "./helpers.js";

test("create consent: provider request is Pending with id, requester, purpose, categories, expiry unset", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app, ["clinical-history", "lab-reports"], 14);
    assert.match(c.id, /^CONS-DEMO-\d{3}$/);
    assert.equal(c.status, "Pending");
    assert.equal(c.patientId, "MCP-DEMO-001");
    assert.equal(c.requester.orgName, "Demo Community Clinic");
    assert.equal(c.purpose, "CARE_CONTINUITY");
    assert.deepEqual(c.requestedCategories, ["clinical-history", "lab-reports"]);
    assert.equal(c.expiresAt, null);
    assert.ok(c.createdAt);
    const audit = app.part6.audit.all().filter((e) => e.action === "CONSENT_REQUESTED" && e.consentId === c.id);
    assert.equal(audit.length, 1);
  } finally { await app.close(); }
});

test("grant consent: patient grants, expiry is set from duration, audit written", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app, ["medications"], 7);
    const g = await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    assert.equal(g.status, 200);
    assert.equal(g.body.status, "Granted");
    assert.equal(g.body.active, true);
    const days = (Date.parse(g.body.expiresAt) - Date.parse(g.body.grantedAt)) / 86_400_000;
    assert.equal(Math.round(days), 7);
    assert.deepEqual(g.body.grantedCategories, ["medications"]);
    assert.ok(app.part6.audit.all().some((e) => e.action === "CONSENT_GRANTED" && e.consentId === c.id));
  } finally { await app.close(); }
});

test("grant can narrow scope and shorten duration but never widen it", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app, ["clinical-history", "medications", "allergies"], 30);
    const widen = await app.as(U.patient).post(`/consent/${c.id}/grant`, { categories: ["documents"] });
    assert.equal(widen.status, 400);
    const longer = await app.as(U.patient).post(`/consent/${c.id}/grant`, { durationDays: 90 });
    assert.equal(longer.status, 400);
    const ok = await app.as(U.patient).post(`/consent/${c.id}/grant`, { categories: ["allergies"], durationDays: 5 });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.grantedCategories, ["allergies"]);
    assert.equal(ok.body.durationDays, 5);
  } finally { await app.close(); }
});

test("deny consent: Pending -> Denied, cannot then be granted", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app);
    const d = await app.as(U.patient).post(`/consent/${c.id}/deny`, { reason: "Not needed" });
    assert.equal(d.body.status, "Denied");
    const again = await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "INVALID_STATE");
  } finally { await app.close(); }
});

test("revoke consent: Granted -> Revoked with timestamp; revoking twice is rejected", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app);
    await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    const r = await app.as(U.patient).post(`/consent/${c.id}/revoke`, {});
    assert.equal(r.status, 200);
    assert.equal(r.body.status, "Revoked");
    assert.ok(r.body.revokedAt);
    assert.equal(r.body.active, false);
    assert.equal((await app.as(U.patient).post(`/consent/${c.id}/revoke`, {})).status, 409);
  } finally { await app.close(); }
});

test("expired consent: status becomes Expired once the (demo) clock passes expiry, and an audit entry is written once", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app, ["medications"], 7);
    await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    assert.equal((await app.as(U.patient).get(`/consent/${c.id}`)).body.status, "Granted");
    const adv = await app.as(U.sysAdmin).post("/demo/clock/advance", { days: 8 });
    assert.equal(adv.status, 200);
    const after = await app.as(U.patient).get(`/consent/${c.id}`);
    assert.equal(after.body.status, "Expired");
    assert.equal(after.body.active, false);
    await app.as(U.patient).get(`/consent/${c.id}`);
    const expiredAudits = app.part6.audit.all().filter((e) => e.action === "CONSENT_EXPIRED" && e.consentId === c.id);
    assert.equal(expiredAudits.length, 1);
    // an expired consent cannot be revoked or granted
    assert.equal((await app.as(U.patient).post(`/consent/${c.id}/revoke`, {})).status, 409);
  } finally { await app.close(); }
});

test("unauthorised consent actions: doctors cannot grant, other patients cannot see or decide, admins cannot grant", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app);
    const docGrant = await app.as(U.docClinic).post(`/consent/${c.id}/grant`, {});
    assert.equal(docGrant.status, 403);
    const adminGrant = await app.as(U.hospitalAdmin).post(`/consent/${c.id}/grant`, {});
    assert.equal(adminGrant.status, 403);
    const otherPatient = await app.as(U.patient2).post(`/consent/${c.id}/grant`, {});
    assert.equal(otherPatient.status, 403);
    assert.equal((await app.as(U.patient2).get(`/consent/${c.id}`)).status, 403);
    // still Pending afterwards
    assert.equal((await app.as(U.patient).get(`/consent/${c.id}`)).body.status, "Pending");
    assert.ok(app.part6.audit.all().filter((e) => e.action === "PERMISSION_DENIED").length >= 4);
  } finally { await app.close(); }
});

test("patients only ever list their own consents", async () => {
  const app = await startApp();
  try {
    const mine = await app.as(U.patient).get("/consent");
    assert.ok(mine.body.consents.length > 0);
    assert.ok(mine.body.consents.every((c) => c.patientId === "MCP-DEMO-001"));
    const theirs = await app.as(U.patient2).get("/consent");
    assert.ok(theirs.body.consents.every((c) => c.patientId === "MCP-DEMO-002"));
  } finally { await app.close(); }
});

test("administrative revocation needs a reason; hospital admin org-scope is enforced", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app);
    await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    // hospital admin (org 001) is the custodian of Demo Patient, so may revoke, but only with a reason
    assert.equal((await app.as(U.hospitalAdmin).post(`/consent/${c.id}/revoke`, {})).status, 400);
    const ok = await app.as(U.hospitalAdmin).post(`/consent/${c.id}/revoke`, { reason: "Security incident review" });
    assert.equal(ok.body.status, "Revoked");
    assert.equal(ok.body.revocationReason, "Security incident review");
    // a doctor may not revoke
    const c2 = await requestConsent(app);
    await app.as(U.patient).post(`/consent/${c2.id}/grant`, {});
    assert.equal((await app.as(U.docClinic).post(`/consent/${c2.id}/revoke`, {})).status, 403);
  } finally { await app.close(); }
});

test("request validation: unknown category, billing, bad duration, custodian requesting own patient", async () => {
  const app = await startApp();
  try {
    const clinic = app.as(U.docClinic);
    const base = { patientId: "MCP-DEMO-001", purpose: "CLINICAL_CARE", categories: ["medications"], durationDays: 10 };
    assert.equal((await clinic.post("/consent", { ...base, categories: ["billing"] })).status, 400);
    assert.equal((await clinic.post("/consent", { ...base, categories: [] })).status, 400);
    assert.equal((await clinic.post("/consent", { ...base, durationDays: 9999 })).status, 400);
    assert.equal((await clinic.post("/consent", { ...base, purpose: "MARKETING" })).status, 400);
    assert.equal((await clinic.post("/consent", { ...base, patientId: "NOPE" })).status, 400);
    const own = await app.as(U.docHospital).post("/consent", base); // hospital already holds Demo Patient
    assert.equal(own.status, 400);
  } finally { await app.close(); }
});

test("patient-initiated share is granted immediately with the chosen scope and duration", async () => {
  const app = await startApp();
  try {
    const r = await app.as(U.patient).post("/consent", { patientId: "MCP-DEMO-001", recipientOrgId: "ORG-DEMO-002", purpose: "REFERRAL", categories: ["allergies", "medications"], durationDays: 7 });
    assert.equal(r.status, 201);
    assert.equal(r.body.status, "Granted");
    assert.equal(r.body.origin, "patient-initiated");
    assert.deepEqual(r.body.grantedCategories, ["allergies", "medications"]);
    // a patient cannot create a share for someone else's record
    const other = await app.as(U.patient).post("/consent", { patientId: "MCP-DEMO-002", recipientOrgId: "ORG-DEMO-001", purpose: "REFERRAL", categories: ["allergies"], durationDays: 7 });
    assert.equal(other.status, 403);
  } finally { await app.close(); }
});
