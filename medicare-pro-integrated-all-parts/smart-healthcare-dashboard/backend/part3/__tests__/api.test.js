import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FIXTURE_DIR } from "../seed/fixtureCatalog.js";
import { PNG_SIG, notAFixturePng, startTestServer } from "./helpers.js";
import { signSession } from "../services/sessionTokens.js";

const png = (id) => fs.readFileSync(`${FIXTURE_DIR}/${id}.png`);
let t;
beforeAll(async () => { t = await startTestServer(); });
afterAll(async () => { await t.close(); });

const upload = (token, buffer, { patientId = "DEMO-P001", docType = "lab_report", filename = "a.png", type = "image/png" } = {}) =>
  t.call("POST", `/documents?patientId=${patientId}&docType=${docType}&filename=${encodeURIComponent(filename)}`, { token, raw: buffer, headers: { "Content-Type": type } });

describe("authentication", () => {
  it("requires a session for every protected route", async () => {
    for (const [method, path] of [["GET", "/patients"], ["GET", "/documents"], ["GET", "/documents/doc_x"], ["POST", "/documents/doc_x/ocr"], ["GET", "/patients/DEMO-P001/timeline"], ["GET", "/audit"], ["POST", "/demo/reset"], ["GET", "/me"]]) {
      const res = await t.call(method, path);
      expect(res.status, `${method} ${path}`).toBe(401);
      expect(res.json.error.code).toBe("UNAUTHENTICATED");
    }
  });
  it("rejects malformed, tampered, wrongly-signed and expired tokens", async () => {
    const good = await t.session("DOCTOR");
    const [body, sig] = good.split(".");
    const forged = signSession({ sub: "x", role: "ADMIN", iat: 1, exp: 9999999999 }, "wrong-secret");
    const expired = signSession({ sub: "x", role: "DOCTOR", iat: 1, exp: 100 }, "test-secret");
    const badRole = signSession({ sub: "x", role: "SUPERUSER", iat: 1, exp: 9999999999 }, "test-secret");
    for (const token of ["garbage", `${body}.${sig}x`, `${body}A.${sig}`, forged, expired, badRole, "a.b.c"]) {
      const res = await t.call("GET", "/me", { token });
      expect(res.status, token.slice(0, 20)).toBe(401);
    }
  });
  it("validates the session request", async () => {
    expect((await t.call("POST", "/auth/demo-session", { body: { role: "KING", name: "x" } })).json.error.details.fields[0].field).toBe("role");
    expect((await t.call("POST", "/auth/demo-session", { body: { role: "DOCTOR", name: "" } })).status).toBe(400);
    expect((await t.call("POST", "/auth/demo-session", { raw: "{not json", headers: { "Content-Type": "application/json" } })).json.error.code).toBe("INVALID_JSON");
  });
  it("issues a session that identifies the role from the server-signed token", async () => {
    const res = await t.call("POST", "/auth/demo-session", { body: { role: "NURSE", name: "Nina" } });
    expect(res.status).toBe(201);
    expect(res.json).toMatchObject({ mode: "demo", user: { role: "NURSE" } });
    expect((await t.call("GET", "/me", { token: res.json.token })).json.user.role).toBe("NURSE");
  });
});

describe("authorization (server-side, role based)", () => {
  it("clinical roles can use the module", async () => {
    for (const role of ["ADMIN", "DOCTOR", "NURSE"]) expect((await t.call("GET", "/patients", { token: await t.session(role) })).status, role).toBe(200);
  });
  it("other roles are forbidden everywhere in the module", async () => {
    for (const role of ["RECEPTIONIST", "LAB_TECHNICIAN", "PHARMACIST", "BILLING", "PATIENT"]) {
      const token = await t.session(role);
      for (const [method, path] of [["GET", "/patients"], ["GET", "/documents"], ["POST", "/demo/fixtures/rx-p001-2025-03/ingest"], ["GET", "/patients/DEMO-P001/timeline"]]) {
        const res = await t.call(method, path, { token });
        expect(res.status, `${role} ${method} ${path}`).toBe(403);
        expect(res.json.error.code).toBe("FORBIDDEN");
      }
    }
  });
  it("audit history and demo reset are ADMIN only", async () => {
    for (const role of ["DOCTOR", "NURSE"]) {
      const token = await t.session(role);
      expect((await t.call("GET", "/audit", { token })).status).toBe(403);
      expect((await t.call("POST", "/demo/reset", { token })).status).toBe(403);
    }
    expect((await t.call("GET", "/audit", { token: await t.session("ADMIN") })).status).toBe(200);
  });
  it("records denied attempts in the audit trail", async () => {
    await t.call("GET", "/patients", { token: await t.session("BILLING") });
    const { json } = await t.call("GET", "/audit?limit=500", { token: await t.session("ADMIN") });
    expect(json.items.some((e) => e.action === "ACCESS_DENIED" && e.actor.role === "BILLING" && e.outcome === "denied")).toBe(true);
  });
});

describe("upload validation and secure file handling", () => {
  it("rejects a missing/invalid patient, docType or filename", async () => {
    const token = await t.session("DOCTOR");
    const res = await t.call("POST", "/documents?patientId=&docType=poem", { token, raw: png("rx-p001-2025-03"), headers: { "Content-Type": "image/png" } });
    expect(res.status).toBe(400);
    expect(res.json.error.details.fields.map((f) => f.field).sort()).toEqual(["docType", "filename", "patientId"]);
  });
  it("rejects unsupported media types", async () => {
    const token = await t.session("DOCTOR");
    const res = await upload(token, Buffer.from("hello"), { type: "text/plain" });
    expect(res.status).toBe(415);
    expect(res.json.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });
  it("rejects a file whose bytes do not match its declared type", async () => {
    const token = await t.session("DOCTOR");
    expect((await upload(token, Buffer.from("<script>alert(1)</script>"), { type: "image/png" })).json.error.code).toBe("FILE_CONTENT_MISMATCH");
    expect((await upload(token, png("rx-p001-2025-03"), { type: "application/pdf" })).json.error.code).toBe("FILE_CONTENT_MISMATCH");
  });
  it("rejects an empty upload", async () => {
    expect((await upload(await t.session("DOCTOR"), Buffer.alloc(0))).json.error.code).toBe("EMPTY_FILE");
  });
  it("rejects an unknown patient", async () => {
    expect((await upload(await t.session("DOCTOR"), png("rx-p001-2025-03"), { patientId: "DEMO-P999" })).json.error.code).toBe("PATIENT_NOT_FOUND");
  });
  it("enforces the size limit", async () => {
    const small = await startTestServer({ overrides: { maxUploadBytes: 1024 } });
    const token = await small.session("DOCTOR");
    const res = await small.call("POST", "/documents?patientId=DEMO-P001&docType=other&filename=big.png", { token, raw: Buffer.concat([PNG_SIG, Buffer.alloc(4096)]), headers: { "Content-Type": "image/png" } });
    expect(res.status).toBe(413);
    expect(res.json.error.code).toBe("FILE_TOO_LARGE");
    await small.close();
  });
  it("sanitises file names and never uses them as storage paths", async () => {
    const token = await t.session("DOCTOR");
    const res = await upload(token, notAFixturePng("path"), { filename: "../../etc/passwd<script>.png" });
    expect(res.status).toBe(201);
    expect(res.json.document.originalFilename).toBe("passwd_script_.png");
    expect(res.json.document.id).toMatch(/^doc_[0-9a-f]{10}$/);
  });
  it("serves stored files with hardening headers", async () => {
    const token = await t.session("DOCTOR");
    const { json } = await t.call("POST", "/demo/fixtures/rx-p001-2025-03/ingest", { token });
    const res = await t.call("GET", `/documents/${json.document.id}/file`, { token });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("the complete workflow through the API", () => {
  it("upload → OCR → extraction → timeline, with provenance and audit", async () => {
    const token = await t.session("DOCTOR");
    const up = await upload(token, png("lab-p001-2025-03"), { filename: "my-scan.png" });
    expect(up.status === 201 || up.status === 200).toBe(true);
    const id = up.json.document.id;
    expect(up.json.document).toMatchObject({ synthetic: true, docType: "lab_report" }); // recognised as the bundled synthetic document

    const ocr = await t.call("POST", `/documents/${id}/ocr`, { token, body: {} });
    expect(ocr.status).toBe(200);
    expect(ocr.json.ocr.provider).toMatchObject({ id: "synthetic-demo", kind: "demo" });
    expect(ocr.json.safety.verificationStatus).toBe("EXTRACTED_UNVERIFIED");

    const ex = await t.call("POST", `/documents/${id}/extract`, { token });
    expect(ex.json.extraction.stats.investigations).toBe(8);
    expect(ex.json.extraction.entities.find((e) => e.fields.testName === "Hemoglobin").fields.interpretation.status).toBe("OUTSIDE_RANGE");

    const tl = await t.call("POST", `/documents/${id}/timeline`, { token });
    expect(tl.json.events.length).toBe(9);

    const view = await t.call("GET", `/patients/DEMO-P001/timeline`, { token });
    expect(view.json.events.length).toBeGreaterThanOrEqual(9);
    expect(view.json.safety.notice).toMatch(/not clinician-confirmed/i);

    const detail = await t.call("GET", `/documents/${id}`, { token });
    expect(detail.json.document.status).toBe("ON_TIMELINE");
    expect(detail.json.ocr.text).toContain("Hemoglobin");
  });

  it("returns conflicts for out-of-order steps and no-ops for repeated ones", async () => {
    const token = await t.session("DOCTOR");
    const id = (await t.call("POST", "/demo/fixtures/dis-p001-2025-09/ingest", { token })).json.document.id;
    expect((await t.call("POST", `/documents/${id}/extract`, { token })).json.error.code).toBe("OCR_REQUIRED");
    expect((await t.call("POST", `/documents/${id}/timeline`, { token })).json.error.code).toBe("EXTRACTION_REQUIRED");
    await t.call("POST", `/documents/${id}/ocr`, { token, body: {} });
    const again = await t.call("POST", `/documents/${id}/ocr`, { token, body: {} });
    expect(again.status).toBe(200);
    expect(again.json.alreadyDone).toBe(true);
  });

  it("does not create a duplicate when the same document is uploaded again", async () => {
    const token = await t.session("DOCTOR");
    const first = await t.call("POST", "/demo/fixtures/rx-p001-2025-03/ingest", { token });
    const second = await upload(token, png("rx-p001-2025-03"), { docType: "prescription" });
    expect(second.status).toBe(200);
    expect(second.json.duplicate).toBe(true);
    expect(second.json.document.id).toBe(first.json.document.id);
  });

  it("reports an unknown document as 404 and a malformed id as 400", async () => {
    const token = await t.session("DOCTOR");
    expect((await t.call("GET", "/documents/doc_0000000000", { token })).status).toBe(404);
    expect((await t.call("GET", "/documents/..%2F..%2Fetc", { token })).status).toBe(400);
    expect((await t.call("GET", "/documents/x", { token })).status).toBe(400);
    expect((await t.call("POST", "/demo/fixtures/nope-1/ingest", { token })).status).toBe(404);
  });

  it("validates OCR request options", async () => {
    const token = await t.session("DOCTOR");
    const id = (await t.call("POST", "/demo/fixtures/lab-p001-2025-12/ingest", { token })).json.document.id;
    expect((await t.call("POST", `/documents/${id}/ocr`, { token, body: { providerId: "made-up" } })).status).toBe(400);
    expect((await t.call("POST", `/documents/${id}/ocr`, { token, body: { languageHints: ["not a language"] } })).status).toBe(400);
  });

  it("surfaces OCR failure for an unknown scan with a clear error and keeps the document usable", async () => {
    const token = await t.session("DOCTOR");
    const id = (await upload(token, notAFixturePng("api-unknown"), { docType: "prescription" })).json.document.id;
    const res = await t.call("POST", `/documents/${id}/ocr`, { token, body: {} });
    expect(res.status).toBe(422);
    expect(res.json.error.code).toBe("UNSUPPORTED_DOCUMENT");
    expect((await t.call("GET", `/documents/${id}`, { token })).json.ocr.status).toBe("failed");
  });

  it("validates list and timeline queries and paginates", async () => {
    const token = await t.session("DOCTOR");
    expect((await t.call("GET", "/documents?limit=500", { token })).status).toBe(400);
    expect((await t.call("GET", "/documents?status=WEIRD", { token })).status).toBe(400);
    expect((await t.call("GET", "/patients/DEMO-P001/timeline?order=sideways", { token })).status).toBe(400);
    expect((await t.call("GET", "/patients/DEMO-P001/timeline?from=2025-13-40", { token })).status).toBe(400);
    expect((await t.call("GET", "/patients/DEMO-P001/timeline?types=DIAGNOSIS,ALIEN", { token })).status).toBe(400);
    expect((await t.call("GET", "/patients/DEMO-P001/timeline?from=2025-05-01&to=2025-01-01", { token })).status).toBe(400);
    expect((await t.call("GET", "/patients/DEMO-P404/timeline", { token })).status).toBe(404);
    const page = await t.call("GET", "/documents?patientId=DEMO-P001&page=1&limit=1", { token });
    expect(page.json.items).toHaveLength(1);
    expect(page.json.total).toBeGreaterThan(1);
  });
});

describe("error handling and privacy", () => {
  it("returns a consistent error shape with a request id and never leaks stack traces", async () => {
    const res = await t.call("GET", "/does-not-exist", { token: await t.session("DOCTOR") });
    expect(res.status).toBe(404);
    expect(res.json.error).toMatchObject({ code: "NOT_FOUND" });
    expect(res.json.error.requestId).toBe(res.headers.get("x-request-id"));
    expect(res.text).not.toMatch(/at .*\.js/);
  });
  it("does not store document text, values or file names in the audit trail", async () => {
    const admin = await t.session("ADMIN");
    const { json } = await t.call("GET", "/audit?limit=500", { token: admin });
    const dump = JSON.stringify(json.items);
    expect(json.items.length).toBeGreaterThan(5);
    for (const secret of ["Hemoglobin", "Metformin", "my-scan.png", "Type 2 diabetes"]) expect(dump).not.toContain(secret);
    expect(json.items.map((e) => e.action)).toEqual(expect.arrayContaining(["DOCUMENT_UPLOADED", "OCR_RUN", "EXTRACTION_RUN", "TIMELINE_ADDED", "DOCUMENT_VIEWED", "TIMELINE_VIEWED", "SESSION_ISSUED"]));
    for (const e of json.items) expect(e).toHaveProperty("timestamp");
  });
  it("exposes a public health endpoint that says it is standalone and synthetic-only", async () => {
    const res = await t.call("GET", "/health");
    expect(res.json).toMatchObject({ status: "ok", standalone: true, syntheticDataOnly: true });
    expect(res.json.ocrProviders[0]).toMatchObject({ id: "synthetic-demo", kind: "demo" });
  });
  it("labels the demo library as synthetic", async () => {
    const { json } = await t.call("GET", "/demo/fixtures", { token: await t.session("DOCTOR") });
    expect(json.items).toHaveLength(6);
    expect(json.items.every((f) => f.synthetic === true)).toBe(true);
    expect(json.notice).toMatch(/SYNTHETIC/);
    const dump = JSON.stringify(json);
    for (const leak of ["transcript", "sha256", "Metformin", "Hemoglobin"]) expect(dump).not.toContain(leak); // no recorded OCR text or internals in the catalog
  });
});

describe("rate limiting", () => {
  it("throttles repeated session requests", async () => {
    const limited = await startTestServer({ overrides: { rateLimit: { sessionMax: 3 } } });
    const codes = [];
    for (let i = 0; i < 5; i += 1) codes.push((await limited.call("POST", "/auth/demo-session", { body: { role: "DOCTOR", name: "x" } })).status);
    expect(codes).toEqual([201, 201, 201, 429, 429]);
    await limited.close();
  });
});

describe("demo reset", () => {
  it("clears all runtime data and leaves the synthetic library available", async () => {
    const admin = await t.session("ADMIN");
    expect((await t.call("POST", "/demo/reset", { token: admin })).status).toBe(200);
    expect((await t.call("GET", "/documents", { token: admin })).json.total).toBe(0);
    expect((await t.call("GET", "/patients/DEMO-P001/timeline", { token: admin })).json.events).toEqual([]);
    expect((await t.call("GET", "/demo/fixtures", { token: admin })).json.items).toHaveLength(6);
    const audit = (await t.call("GET", "/audit", { token: admin })).json.items;
    expect(audit.some((e) => e.action === "DEMO_RESET")).toBe(true);
  });
  it("can be disabled by configuration", async () => {
    const locked = await startTestServer({ overrides: { enableDemoReset: false } });
    expect((await locked.call("POST", "/demo/reset", { token: await locked.session("ADMIN") })).json.error.code).toBe("DEMO_RESET_DISABLED");
    await locked.close();
  });
});

describe("configuration safety", () => {
  it("refuses to start demo authentication in production unless explicitly allowed", async () => {
    const { loadConfig } = await import("../config/config.js");
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/real authentication/);
    expect(() => loadConfig({ NODE_ENV: "production", PART3_ALLOW_DEMO_AUTH: "true" })).not.toThrow();
    expect(() => loadConfig({ PART3_AUTH_MODE: "firebase" })).toThrow(/not implemented/);
  });
  it("never hard-codes a session secret", async () => {
    const { loadConfig } = await import("../config/config.js");
    const a = loadConfig({});
    const b = loadConfig({});
    expect(a.auth.secret).not.toBe(b.auth.secret);
    expect(a.auth.secret.length).toBeGreaterThanOrEqual(32);
  });
});
