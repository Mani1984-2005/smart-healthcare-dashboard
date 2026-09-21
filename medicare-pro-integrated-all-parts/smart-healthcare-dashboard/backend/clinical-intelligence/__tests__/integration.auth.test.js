import { test, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers.js";
import { loadConfig } from "../config.js";

const apps = [];
const boot = async (...a) => { const x = await startApp(...a); apps.push(x); return x; };
after(async () => { for (const a of apps) await a.close(); });

test("no token, malformed token, and forged token → 401 on every protected route", async () => {
  const app = await boot();
  const good = await app.login("DOCTOR");
  const forged = good.slice(0, -3) + (good.endsWith("AAA") ? "BBB" : "AAA");
  const tamperedBody = Buffer.from(JSON.stringify({ sub: "x", role: "DOCTOR", hid: "hospital-01", exp: 9999999999 })).toString("base64url") + "." + good.split(".")[1];
  for (const token of [undefined, "garbage", "a.b.c", forged, tamperedBody]) {
    for (const [m, p, body] of [["GET", "/demo/patients"], ["POST", "/analyze", { patientId: "CI-DEMO-001" }], ["GET", "/timeline/CI-DEMO-001"], ["GET", "/patients/CI-DEMO-001/context"], ["POST", "/analyses/00000000-0000-0000-0000-000000000000/review", { itemId: "summary", decision: "accepted" }]]) {
      const r = await app.call(m, p, { token, body });
      assert.equal(r.status, 401, `${m} ${p} with ${String(token).slice(0, 8)}`);
      assert.equal(r.json.error.code, "UNAUTHENTICATED");
    }
  }
});

test("a role edited inside the token invalidates its signature (privilege escalation fails)", async () => {
  const app = await boot();
  const nurse = await app.login("NURSE");
  const [body, sig] = nurse.split(".");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()); payload.role = "DOCTOR";
  const escalated = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${sig}`;
  assert.equal((await app.call("GET", "/demo/patients", { token: escalated })).status, 401);
});

test("expired token → 401", async () => {
  const app = await boot();
  const t = await app.login("DOCTOR");
  assert.equal((await app.call("GET", "/demo/patients", { token: t })).status, 200);
  app.clock.now += (3600 + 5) * 1000;
  assert.equal((await app.call("GET", "/demo/patients", { token: t })).status, 401);
});

test("role matrix: DOCTOR & NURSE may analyse; ADMIN, RECEPTIONIST, LAB_TECHNICIAN, PHARMACIST, BILLING, PATIENT may not", async () => {
  const app = await boot();
  for (const role of ["DOCTOR", "NURSE"]) assert.equal((await app.call("POST", "/analyze", { token: await app.login(role), body: { patientId: "CI-DEMO-001" } })).status, 201, role);
  for (const role of ["ADMIN", "RECEPTIONIST", "LAB_TECHNICIAN", "PHARMACIST", "BILLING", "PATIENT"]) {
    const t = await app.login(role);
    for (const [m, p, body] of [["POST", "/analyze", { patientId: "CI-DEMO-001" }], ["GET", "/demo/patients"], ["GET", "/timeline/CI-DEMO-001"], ["GET", "/patients/CI-DEMO-001/context"]]) {
      const r = await app.call(m, p, { token: t, body });
      assert.equal(r.status, 403, `${role} ${m} ${p}`); assert.equal(r.json.error.code, "FORBIDDEN");
    }
  }
});

test("only a DOCTOR can review; a NURSE gets 403 even for a valid request", async () => {
  const app = await boot();
  const a = (await app.call("POST", "/analyze", { token: await app.login("DOCTOR"), body: { patientId: "CI-DEMO-001" } })).json.analysis;
  const r = await app.call("POST", `/analyses/${a.analysisId}/review`, { token: await app.login("NURSE"), body: { itemId: "summary", decision: "accepted" } });
  assert.equal(r.status, 403);
  const still = await app.call("GET", `/analyses/${a.analysisId}`, { token: await app.login("DOCTOR") });
  assert.equal(still.json.analysis.reviewStatus, "needs_review");
});

test("hospital scoping: another hospital's clinician cannot read or review the analysis (404, not 403)", async () => {
  const app = await boot();
  const a = (await app.call("POST", "/analyze", { token: await app.login("DOCTOR", { hospitalId: "hospital-A" }), body: { patientId: "CI-DEMO-001" } })).json.analysis;
  const other = await app.login("DOCTOR", { hospitalId: "hospital-B" });
  assert.equal((await app.call("GET", `/analyses/${a.analysisId}`, { token: other })).status, 404);
  assert.equal((await app.call("POST", `/analyses/${a.analysisId}/review`, { token: other, body: { itemId: "summary", decision: "accepted" } })).status, 404);
  assert.equal((await app.call("GET", `/analyses/${a.analysisId}/audit`, { token: other })).status, 404);
  assert.equal((await app.call("GET", `/analyses/${a.analysisId}`, { token: await app.login("NURSE", { hospitalId: "hospital-A" }) })).status, 200);
});

test("session endpoint: validates role, is rate-limited, and does not exist outside demo auth mode", async () => {
  const app = await boot();
  assert.equal((await app.call("POST", "/session", { body: { role: "SUPERUSER" } })).status, 422);
  assert.equal((await app.call("POST", "/session", { body: { role: "DOCTOR", isAdmin: true } })).status, 422);
  const prod = await boot({ config: loadConfig({ NODE_ENV: "production", CLINICAL_AUTH_MODE: "firebase" }), firebaseLoader: async () => null });
  assert.equal((await prod.call("POST", "/session", { body: { role: "DOCTOR" } })).status, 404);
});

test("firebase mode fails CLOSED (503) when the auth provider cannot load — never open, never a crash", async () => {
  const app = await boot({ config: loadConfig({ CLINICAL_AUTH_MODE: "firebase", CLINICAL_DEMO_MODE: "false" }), firebaseLoader: async () => null });
  const r = await app.call("GET", "/demo/patients", { token: "anything" });
  assert.equal(r.status, 503);
  assert.equal((await app.call("GET", "/status")).status, 200, "public status still works");
});

test("firebase mode with the REAL existing middleware but no Firebase env → fails closed (503)", async () => {
  for (const k of ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) delete process.env[k];
  const app = await boot({ config: loadConfig({ CLINICAL_AUTH_MODE: "firebase", CLINICAL_DEMO_MODE: "false" }) });
  assert.equal((await app.call("GET", "/demo/patients", { token: "x" })).status, 503);
});

test("firebase mode: verified claims map to an actor; missing role/hospital claims are refused; the existing middleware's own 401 is respected", async () => {
  const mk = (claims) => async () => (req, _res, next) => { req.user = claims; next(); };
  const ok = await boot({ config: loadConfig({ CLINICAL_AUTH_MODE: "firebase" }), firebaseLoader: mk({ uid: "u1", role: "doctor", hospitalId: "h1", name: "Dr Claims" }) });
  const a = await ok.call("POST", "/analyze", { token: "t", body: { patientId: "CI-DEMO-001" } });
  assert.equal(a.status, 201); assert.equal(a.json.analysis.generatedBy.role, "DOCTOR");
  const noRole = await boot({ config: loadConfig({ CLINICAL_AUTH_MODE: "firebase" }), firebaseLoader: mk({ uid: "u2", hospitalId: "h1" }) });
  assert.equal((await noRole.call("GET", "/demo/patients", { token: "t" })).status, 403);
  const rejecting = await boot({ config: loadConfig({ CLINICAL_AUTH_MODE: "firebase" }), firebaseLoader: async () => (_req, res) => res.status(401).json({ success: false, message: "Unauthorised" }) });
  assert.equal((await rejecting.call("GET", "/demo/patients", { token: "bad" })).status, 401);
});
