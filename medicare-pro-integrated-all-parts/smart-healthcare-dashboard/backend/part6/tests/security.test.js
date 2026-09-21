import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { startApp, requestConsent, U } from "./helpers.js";
import { loadConfig } from "../config.js";
import { can, PERMISSIONS, permissionMatrix } from "../security/permissions.js";
import { toPublicError } from "../errors.js";
import { sanitizeMetadata } from "../security/redact.js";

const PROTECTED_GETS = ["/auth/me", "/catalog", "/overview", "/patients", "/patients/MCP-DEMO-001/identity", "/fhir/resources", "/fhir/bundles", "/consent", "/share", "/audit", "/audit/verify", "/security/matrix", "/security/posture", "/security/events", "/settings"];

test("authentication boundary: every protected endpoint rejects anonymous callers and the attempt is audited", async () => {
  const app = await startApp();
  try {
    for (const path of PROTECTED_GETS) {
      const r = await app.call(null, "GET", path);
      assert.equal(r.status, 401, `${path} should require authentication`);
      assert.equal(r.body.error.code, "UNAUTHENTICATED");
      assert.ok(!JSON.stringify(r.body).includes("stack"));
    }
    for (const [m, path] of [["POST", "/fhir/generate"], ["POST", "/fhir/bundle"], ["POST", "/fhir/validate"], ["POST", "/consent"], ["POST", "/share"], ["PUT", "/settings"], ["POST", "/demo/reset"]]) {
      assert.equal((await app.call(null, m, path, {})).status, 401, `${m} ${path}`);
    }
    const rejected = app.part6.audit.all().filter((e) => e.action === "AUTH_TOKEN_REJECTED");
    assert.ok(rejected.length >= PROTECTED_GETS.length);
    assert.ok(rejected.every((e) => e.status === "denied" && e.actor.name === "Unknown Request"));
  } finally { await app.close(); }
});

test("authenticated access works and is audited (success + failed login)", async () => {
  const app = await startApp();
  try {
    const me = await app.as(U.patient).get("/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, "PATIENT");
    assert.ok(!("token" in me.body.user));
    const bad = await app.call(null, "POST", "/auth/demo-login", { userId: "USR-NOPE" });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.message, "Sign-in failed.");
    const actions = app.part6.audit.all().map((e) => e.action);
    assert.ok(actions.includes("AUTH_LOGIN_SUCCESS") && actions.includes("AUTH_LOGIN_FAILED"));
  } finally { await app.close(); }
});

test("forged credentials are rejected: tampered signature, alg=none, wrong secret, garbage, oversized", async () => {
  const app = await startApp();
  try {
    const good = await app.login(U.sysAdmin);
    const [h, b, s] = good.split(".");
    const flipped = `${h}.${b}.${s.slice(0, -2)}${s.endsWith("AA") ? "BB" : "AA"}`;
    assert.equal((await app.call(flipped, "GET", "/auth/me")).status, 401);

    const payload = JSON.parse(Buffer.from(b, "base64url").toString());
    const noneHead = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const noneTok = `${noneHead}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.`;
    assert.equal((await app.call(noneTok, "GET", "/auth/me")).status, 401);

    // privilege escalation attempt: re-sign a payload claiming another subject with the WRONG secret
    const forgedBody = Buffer.from(JSON.stringify({ ...payload, sub: U.sysAdmin, role: "SYSTEM_ADMIN" })).toString("base64url");
    const sig = crypto.createHmac("sha256", "wrong-secret-wrong-secret-wrong-secret").update(`${h}.${forgedBody}`).digest("base64url");
    assert.equal((await app.call(`${h}.${forgedBody}.${sig}`, "GET", "/auth/me")).status, 401);

    assert.equal((await app.call("garbage", "GET", "/auth/me")).status, 401);
    assert.equal((await app.call("a".repeat(5000), "GET", "/auth/me")).status, 401);
    assert.equal((await app.call(null, "GET", "/auth/me", undefined, { Authorization: "Basic abc" })).status, 401);
    assert.ok(app.part6.audit.all().filter((e) => e.action === "AUTH_TOKEN_REJECTED").length >= 6);
  } finally { await app.close(); }
});

test("expired tokens are rejected", async () => {
  const app = await startApp({ tokenTtlSeconds: -30 });
  try {
    const t = await app.login(U.patient);
    const r = await app.call(t, "GET", "/auth/me");
    assert.equal(r.status, 401);
    const last = app.part6.audit.all().filter((e) => e.action === "AUTH_TOKEN_REJECTED").pop();
    assert.match(last.reason, /expired/);
  } finally { await app.close(); }
});

test("logout revokes the session token", async () => {
  const app = await startApp();
  try {
    const t = await app.login(U.patient);
    assert.equal((await app.call(t, "GET", "/auth/me")).status, 200);
    assert.equal((await app.call(t, "POST", "/auth/logout", {})).status, 200);
    assert.equal((await app.call(t, "GET", "/auth/me")).status, 401);
  } finally { await app.close(); }
});

test("role-based permissions: the matrix and the server agree", async () => {
  // matrix integrity
  const m = permissionMatrix();
  assert.equal(m.rows.length, Object.keys(PERMISSIONS).length);
  assert.equal(can("PATIENT", "consent.decide"), true);
  assert.equal(can("DOCTOR", "consent.decide"), false);
  assert.equal(can("SYSTEM_ADMIN", "fhir.generate"), false);
  assert.equal(can("NOBODY", "overview.view"), false);
  assert.equal(can("PATIENT", "does.not.exist"), false);

  const app = await startApp();
  try {
    const expect403 = async (who, method, path, body) => {
      const r = await app.as(who)[method](path, body);
      assert.equal(r.status, 403, `${who} ${method.toUpperCase()} ${path} should be forbidden, got ${r.status}`);
      assert.equal(r.body.error.code, "FORBIDDEN");
    };
    await expect403(U.patient, "post", "/fhir/generate", { patientId: "MCP-DEMO-001" });
    await expect403(U.patient, "post", "/fhir/bundle", { patientId: "MCP-DEMO-001" });
    await expect403(U.patient, "get", "/fhir/resources");
    await expect403(U.patient, "get", "/security/posture");
    await expect403(U.patient, "get", "/settings");
    await expect403(U.patient, "post", "/demo/reset");
    await expect403(U.docHospital, "put", "/settings", { maxConsentDurationDays: 30 });
    await expect403(U.docHospital, "get", "/security/posture");
    await expect403(U.docHospital, "get", "/audit/verify");
    await expect403(U.docHospital, "post", "/demo/clock/advance", { days: 1 });
    await expect403(U.hospitalAdmin, "put", "/settings", { maxConsentDurationDays: 30 });
    await expect403(U.hospitalAdmin, "post", "/demo/reset");
    await expect403(U.sysAdmin, "post", "/fhir/generate", { patientId: "MCP-DEMO-001" });
    await expect403(U.sysAdmin, "get", "/fhir/resources");
    await expect403(U.sysAdmin, "post", "/consent", { patientId: "MCP-DEMO-001", purpose: "CLINICAL_CARE", categories: ["medications"], durationDays: 5 });
    const denials = app.part6.audit.all().filter((e) => e.action === "PERMISSION_DENIED");
    assert.ok(denials.length >= 15);
    assert.ok(denials.every((e) => e.securityEvent && e.status === "denied" && e.reason));
    // allowed counterparts
    assert.equal((await app.as(U.sysAdmin).get("/security/posture")).status, 200);
    assert.equal((await app.as(U.docHospital).post("/fhir/generate", { patientId: "MCP-DEMO-001", resourceTypes: ["Patient"] })).status, 200);
  } finally { await app.close(); }
});

test("object-level authorisation: custodian rules, patient isolation, masked identity for system admin", async () => {
  const app = await startApp();
  try {
    const wrongOrg = await app.as(U.docClinic).post("/fhir/generate", { patientId: "MCP-DEMO-001" });
    assert.equal(wrongOrg.status, 403);
    assert.equal(wrongOrg.body.error.code, "NOT_CUSTODIAN");
    assert.equal((await app.as(U.patient2).get("/patients/MCP-DEMO-001/identity")).status, 403);
    assert.equal((await app.as(U.docClinic).get("/patients/MCP-DEMO-001/identity")).status, 403);
    const own = await app.as(U.patient).get("/patients/MCP-DEMO-001/identity");
    assert.equal(own.status, 200);
    assert.equal(own.body.displayName, "Demo Patient");
    const masked = await app.as(U.sysAdmin).get("/patients/MCP-DEMO-001/identity");
    assert.equal(masked.body.displayName, "D. P.");
    assert.equal(masked.body.birthDate, null);
    assert.equal(masked.body.view, "masked");
    // system admin cannot read clinical content via validate-by-reference either
    await app.as(U.docHospital).post("/fhir/bundle", { patientId: "MCP-DEMO-001" });
    assert.equal((await app.as(U.sysAdmin).post("/fhir/validate", { bundleId: "BND-DEMO-001" })).status, 403);
    // stored bundles are invisible to another organisation's doctor
    assert.equal((await app.as(U.docClinic).get("/fhir/bundles/BND-DEMO-001")).status, 403);
    assert.equal((await app.as(U.docClinic).get("/fhir/bundles")).body.bundles.length, 0);
  } finally { await app.close(); }
});

test("identity model: internal patient id and ABHA are distinct; ABHA is never presented as verified", async () => {
  const app = await startApp();
  try {
    const r = await app.as(U.patient).get("/patients/MCP-DEMO-001/identity");
    assert.equal(r.body.internal.patientId, "MCP-DEMO-001");
    assert.equal(r.body.abha.identifier, "DEMO-ABHA-001");
    assert.notEqual(r.body.internal.patientId, r.body.abha.identifier);
    assert.equal(r.body.abha.status, "DEMO_NOT_CONNECTED");
    assert.equal(r.body.abha.verification, "PROTOTYPE");
    assert.equal(r.body.abha.verifiedAt, null);
    assert.equal(r.body.abha.maskedNumber, "XX-XXXX-XXXX-XXXX");
    assert.doesNotMatch(JSON.stringify(r.body), /government[- ]verified|production verification|verified: ?true/i);
    assert.match(r.body.abha.note, /No ABDM\/ABHA verification has been performed/);
  } finally { await app.close(); }
});

test("audit visibility is scoped by role", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app);
    await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    await app.as(U.patient2).get("/consent");
    const patient = (await app.as(U.patient).get("/audit")).body.entries;
    assert.ok(patient.length > 0 && patient.every((e) => e.patientId === "MCP-DEMO-001"));
    assert.ok(patient.every((e) => !("ip" in e) && !("requestId" in e) && !("hash" in e)), "patients get a reduced view");
    const doc = (await app.as(U.docClinic).get("/audit")).body.entries;
    assert.ok(doc.length > 0 && doc.every((e) => e.actor.userId === "USR-DOC-002"));
    const sys = (await app.as(U.sysAdmin).get("/audit")).body;
    assert.ok(sys.total > patient.length && sys.total > doc.length);
    const otherPatient = (await app.as(U.patient2).get("/audit")).body.entries;
    assert.ok(otherPatient.every((e) => e.patientId === "MCP-DEMO-002"));
  } finally { await app.close(); }
});

test("audit log is tamper-evident: edits and deletions are detected", async () => {
  const app = await startApp();
  try {
    await app.as(U.patient).get("/auth/me");
    await app.as(U.docClinic).post("/consent", { patientId: "MCP-DEMO-001", purpose: "CLINICAL_CARE", categories: ["medications"], durationDays: 5 });
    const ok = await app.as(U.sysAdmin).get("/audit/verify");
    assert.equal(ok.body.ok, true);
    assert.ok(ok.body.total >= 4);

    const entries = app.part6.audit.all();
    const victim = entries.find((e) => e.action === "PERMISSION_DENIED") ?? entries[2];
    // edit
    app.part6.repo.put("part6_audit_logs", victim.id, { ...victim, status: "success", reason: "nothing to see" });
    const edited = (await app.as(U.sysAdmin).get("/audit/verify")).body;
    assert.equal(edited.ok, false);
    assert.equal(edited.brokenAt, victim.id);
    // restore then delete the tail
    app.part6.repo.put("part6_audit_logs", victim.id, victim);
    assert.equal((await app.as(U.sysAdmin).get("/audit/verify")).body.ok, true);
    const last = app.part6.audit.all().pop();
    app.part6.repo.remove("part6_audit_logs", last.id);
    assert.equal(app.part6.audit.verifyChain().ok, false);
  } finally { await app.close(); }
});

test("audit and responses never contain tokens, secrets or clinical values", async () => {
  const app = await startApp();
  try {
    const token = await app.login(U.docHospital);
    const c = await requestConsent(app, ["medications", "lab-reports"]);
    await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    await app.as(U.docClinic).post("/share", { consentId: c.id });
    await app.call(token, "POST", "/fhir/bundle", { patientId: "MCP-DEMO-001" });
    // Scan the content fields only: hashes / request ids / timestamps are random hex or digits and could
    // contain short numeric substrings by chance.
    const content = app.part6.audit.all().map(({ hash: _h, prevHash: _p, requestId: _r, ts: _t, id: _i, ...rest }) => rest);
    const dump = JSON.stringify(content);
    assert.ok(!JSON.stringify(app.part6.audit.all()).includes(token), "session token leaked into audit log");
    assert.ok(!dump.includes("t".repeat(40)), "signing secret leaked into audit log");
    for (const phi of ["Metformin", "penicillin", "Amlodipine", "Hemoglobin", "HbA1c", "1985-04-12", "Glucose", "Allergy to"]) {
      assert.ok(!dump.includes(phi), `clinical value "${phi}" must not be in the audit log`);
    }
    const posture = JSON.stringify((await app.as(U.sysAdmin).get("/security/posture")).body);
    assert.ok(!posture.includes("t".repeat(40)));
    const settings = JSON.stringify((await app.as(U.sysAdmin).get("/settings")).body);
    assert.ok(!settings.includes("t".repeat(40)));
  } finally { await app.close(); }
});

test("metadata sanitiser drops secret-looking keys and truncates long values", () => {
  const out = sanitizeMetadata({ ok: 1, authToken: "abc", password: "x", nested: { apiKey: "k", fine: "yes" }, long: "x".repeat(500) });
  assert.equal(out.ok, 1);
  assert.ok(!("authToken" in out) && !("password" in out) && !("apiKey" in out.nested));
  assert.equal(out.nested.fine, "yes");
  assert.ok(out.long.length <= 200);
});

test("safe error handling: malformed JSON, oversized bodies, bad params and internal errors never leak internals", async () => {
  const app = await startApp();
  try {
    const t = await app.login(U.docHospital);
    const bad = await app.call(t, "POST", "/fhir/generate", "{ not json");
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, "INVALID_JSON");
    assert.ok(!JSON.stringify(bad.body).match(/at .*\.js|node_modules|SyntaxError/));
    const huge = await app.call(t, "POST", "/fhir/validate", { raw: "x".repeat(300_000) });
    assert.equal(huge.status, 413);
    assert.equal((await app.call(t, "POST", "/fhir/generate", [1, 2])).status, 400);
    assert.equal((await app.call(t, "POST", "/fhir/generate", { patientId: "../../etc/passwd" })).status, 400);
    assert.equal((await app.call(t, "GET", "/fhir/resources/Pat!ent/x")).status, 400);
    assert.equal((await app.call(t, "GET", "/nope")).status, 404);
    assert.equal((await app.call(t, "POST", "/fhir/generate", { patientId: "MCP-DEMO-001", resourceTypes: ["Spaceship"] })).status, 400);
    const pub = toPublicError(new Error("secret db password=hunter2 at /srv/app/db.js:12"), "req-1");
    assert.equal(pub.status, 500);
    assert.equal(pub.body.error.code, "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(pub.body).includes("hunter2"));
  } finally { await app.close(); }
});

test("secure response headers are set and responses are not cacheable", async () => {
  const app = await startApp();
  try {
    const r = await app.as(U.patient).get("/consent");
    const h = r.headers;
    assert.equal(h.get("x-content-type-options"), "nosniff");
    assert.equal(h.get("x-frame-options"), "DENY");
    assert.equal(h.get("cache-control"), "no-store");
    assert.equal(h.get("referrer-policy"), "no-referrer");
    assert.match(h.get("content-security-policy"), /default-src 'none'/);
    assert.equal(h.get("x-powered-by"), null);
    assert.ok(h.get("x-request-id"));
  } finally { await app.close(); }
});

test("rate limiting: excess requests get 429 and the event is audited once", async () => {
  const app = await startApp({ rateMax: 6 });
  try {
    const t = await app.login(U.patient);
    const statuses = [];
    for (let i = 0; i < 10; i++) statuses.push((await app.call(t, "GET", "/auth/me")).status);
    assert.ok(statuses.includes(429), `expected a 429 in ${statuses}`);
    assert.equal(statuses.filter((s) => s === 200).length, 6);
    assert.equal(app.part6.audit.all().filter((e) => e.action === "RATE_LIMITED").length, 1);
  } finally { await app.close(); }
});

test("login endpoint has its own stricter limiter", async () => {
  const app = await startApp({ rateLoginMax: 3 });
  try {
    const out = [];
    for (let i = 0; i < 6; i++) out.push((await app.call(null, "POST", "/auth/demo-login", { userId: "USR-NOPE" })).status);
    assert.deepEqual(out.slice(0, 3), [401, 401, 401]);
    assert.ok(out.slice(3).every((s) => s === 429));
  } finally { await app.close(); }
});

test("configuration guards: no live-ABDM claims, no demo auth or missing secret in production", () => {
  assert.throws(() => loadConfig({ ABDM_MODE: "live" }), /not supported/);
  assert.throws(() => loadConfig({ FHIR_MODE: "live" }), /not supported/);
  assert.throws(() => loadConfig({ NODE_ENV: "production", PART6_DEMO_AUTH: "true", PART6_TOKEN_SECRET: "s".repeat(40) }), /must not be enabled/);
  assert.throws(() => loadConfig({ NODE_ENV: "production", PART6_DEMO_AUTH: "false" }), /PART6_TOKEN_SECRET is required/);
  assert.throws(() => loadConfig({ PART6_TOKEN_SECRET: "short" }), /at least 32/);
  const ok = loadConfig({}, { storage: "memory" });
  assert.equal(ok.abdmMode, "demo");
  assert.equal(ok.tokenSecretSource, "ephemeral");
  assert.equal(ok.tokenSecret.length, 64);
});

test("demo sign-in is unavailable when PART6_DEMO_AUTH is off", async () => {
  const app = await startApp({ demoAuth: false });
  try {
    assert.equal((await app.call(null, "GET", "/auth/demo-users")).status, 404);
    assert.equal((await app.call(null, "POST", "/auth/demo-login", { userId: U.patient })).status, 404);
    assert.equal((await app.call(null, "GET", "/meta")).status, 200);
  } finally { await app.close(); }
});

test("/meta states plainly that this is a prototype and not a live ABDM integration", async () => {
  const app = await startApp();
  try {
    const r = await app.call(null, "GET", "/meta");
    assert.equal(r.body.mode.abdmMode, "demo");
    assert.match(r.body.integration.abdm, /NOT connected to live ABDM/);
    assert.match(r.body.integration.fhir, /Not FHIR-certified/);
    assert.equal(r.body.mode.tokenSecret, undefined);
  } finally { await app.close(); }
});

test("settings are enforced, not decorative: lowering the max duration rejects longer consents", async () => {
  const app = await startApp();
  try {
    const set = await app.as(U.sysAdmin).put("/settings", { maxConsentDurationDays: 10, defaultConsentDurationDays: 5 });
    assert.equal(set.status, 200);
    const long = await app.as(U.docClinic).post("/consent", { patientId: "MCP-DEMO-001", purpose: "CLINICAL_CARE", categories: ["medications"], durationDays: 30 });
    assert.equal(long.status, 400);
    assert.equal((await app.as(U.docClinic).post("/consent", { patientId: "MCP-DEMO-001", purpose: "CLINICAL_CARE", categories: ["medications"], durationDays: 10 })).status, 201);
    assert.equal((await app.as(U.sysAdmin).put("/settings", { maxConsentDurationDays: 400 })).status, 400);
    assert.equal((await app.as(U.sysAdmin).put("/settings", { maxConsentDurationDays: 3, defaultConsentDurationDays: 9 })).status, 400);
    assert.ok(app.part6.audit.all().some((e) => e.action === "SETTINGS_CHANGED"));
  } finally { await app.close(); }
});

test("demo reset restores seed data but PRESERVES the audit trail", async () => {
  const app = await startApp();
  try {
    const c = await requestConsent(app);
    await app.as(U.patient).post(`/consent/${c.id}/grant`, {});
    const before = app.part6.audit.all().length;
    assert.equal((await app.as(U.sysAdmin).post("/demo/reset", {})).status, 200);
    // the consent created before the reset no longer exists (seed has 7 consents; this was the 8th)
    assert.equal((await app.as(U.sysAdmin).get(`/consent/${c.id}`)).status, 404);
    assert.equal((await app.as(U.sysAdmin).get("/consent")).body.consents.length, 7);
    const after = app.part6.audit.all();
    assert.ok(after.length > before, "audit entries must survive a reset");
    assert.ok(after.some((e) => e.action === "DEMO_RESET"));
    assert.ok(after.some((e) => e.action === "CONSENT_GRANTED" && e.consentId === c.id), "old evidence still present");
    assert.equal(app.part6.audit.verifyChain().ok, true);
  } finally { await app.close(); }
});
