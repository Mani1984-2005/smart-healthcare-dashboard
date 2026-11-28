// tests/browser/lib/apiFixtures.mjs
// Isolated /api/** interception for browser QA. No backend, no database, no
// real patient data: every record below is synthetic QA data created for this
// harness and is served only from this process (the requests never leave the
// machine).
//
// Scenario switch (per test session):
//   "empty"     -> 200 with empty collections (default)
//   "populated" -> 200 with synthetic rows
//   "slow"      -> 1500 ms delayed 200 (loading-state assertions)
//   "error"     -> errorStatus (default 500) error envelope (error-state assertions)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const SYNTHETIC_PATIENTS = [
  {
    id: "qa-pat-001",
    fullName: "QA Synthetic Patient 001",
    gender: "female",
    dateOfBirth: "1990-01-01",
    phone: "+1-555-0100",
    email: "qa-patient-001@example.invalid",
    bloodType: "O+",
    knownAllergies: ["none"],
    chronicConditions: [],
  },
  {
    id: "qa-pat-002",
    fullName: "QA Synthetic Patient 002",
    gender: "male",
    dateOfBirth: "1985-05-05",
    phone: "+1-555-0101",
    email: "qa-patient-002@example.invalid",
    bloodType: "A-",
    knownAllergies: ["penicillin (synthetic)"],
    chronicConditions: ["hypertension (synthetic)"],
  },
  {
    id: "qa-pat-003",
    fullName: "QA Synthetic Patient 003",
    gender: "other",
    dateOfBirth: "2001-12-31",
    phone: "+1-555-0102",
    email: "qa-patient-003@example.invalid",
    bloodType: "B+",
    knownAllergies: [],
    chronicConditions: [],
  },
];

export const SYNTHETIC_UPLOADS = [
  {
    id: "qa-upl-001",
    fileName: "qa-synthetic-prescription-001.png",
    uploadSource: "image",
    status: "ocr_complete",
    createdAt: "2026-01-01T10:00:00.000Z",
    extractedText: "SYNTHETIC QA OUTPUT - not a prescription.",
  },
  {
    id: "qa-upl-002",
    fileName: "qa-synthetic-prescription-002.pdf",
    uploadSource: "pdf",
    status: "ocr_failed",
    errorMessage: "Synthetic failure injected for QA",
    createdAt: "2026-01-02T11:30:00.000Z",
  },
];

export const SYNTHETIC_AUDIT = [
  {
    id: "qa-aud-001",
    action: "UPLOAD_CREATED",
    actor: "qa-fixture@example.invalid",
    createdAt: "2026-01-01T10:00:00.000Z",
    detail: "Synthetic audit entry",
  },
];

function json(status, body) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function ok(data, extra = {}) {
  return json(200, { success: true, data, ...extra });
}

function fail(status, message) {
  return json(status, {
    success: false,
    message,
    error: { code: "QA_FIXTURE_ERROR", message },
  });
}

function listFor(scenario, rows) {
  if (scenario === "empty") return [];
  if (scenario === "error") return null;
  return rows;
}

/**
 * Generic handler for every /api/** request.
 * @param {import('playwright-core').Route} route
 * @param {{scenario?: string, delayMs?: number, errorStatus?: number, overrides?: Record<string, any>, notes: string[]}} ctx
 */
export async function defaultApiHandler(route, ctx) {
  const url = new URL(route.request().url());
  const method = route.request().method().toUpperCase();
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const scenario = ctx.scenario || "empty";
  const overrides = ctx.overrides || {};

  if (ctx.delayMs) await sleep(ctx.delayMs);
  else if (scenario === "slow") await sleep(1500);

  if (scenario === "error") {
    return route.fulfill(fail(ctx.errorStatus || 500, "QA fixture: simulated backend failure"));
  }

  // Per-test exact-path overrides: key = "GET /patients", value = fulfil result
  const key = `${method} ${path}`;
  if (overrides[key]) return route.fulfill(overrides[key]);

  // ---- identity ---------------------------------------------------------
  if (path === "/auth/me") {
    return route.fulfill(ok({ roles: [], permissions: [], authMode: "qa-fixture" }));
  }
  if (path === "/health") {
    return route.fulfill(ok({ status: "qa-fixture-offline" }));
  }

  // ---- patients ---------------------------------------------------------
  if (path === "/patients" && method === "GET") {
    const rows = listFor(scenario, SYNTHETIC_PATIENTS);
    if (rows === null) return route.fulfill(fail(500, "QA fixture: patient service unavailable"));
    const total = rows.length;
    return route.fulfill(
      ok({ data: rows, pagination: { page: 1, limit: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) } })
    );
  }
  if (path.startsWith("/patients/") && method === "GET") {
    return route.fulfill(ok(SYNTHETIC_PATIENTS[0] || {}));
  }
  if (path === "/patients" && (method === "POST" || method === "PATCH")) {
    return route.fulfill(ok({ id: "qa-pat-created-001", fullName: "QA Synthetic Patient Created" }));
  }

  // ---- prescription OCR ---------------------------------------------------
  if (path === "/prescription-uploads" && method === "GET") {
    const rows = listFor(scenario, SYNTHETIC_UPLOADS);
    if (rows === null) return route.fulfill(fail(500, "QA fixture: upload service unavailable"));
    return route.fulfill(ok({ data: rows, pagination: { page: 1, total: rows.length, totalPages: 1 } }));
  }
  if (path === "/prescription-uploads" && method === "POST") {
    return route.fulfill(
      ok({ id: "qa-upl-created-001", status: "ocr_complete", fileName: "qa-created.png", createdAt: new Date().toISOString() })
    );
  }
  if (/^\/prescription-uploads\/[^/]+\/audit$/.test(path)) {
    return route.fulfill(ok(listFor(scenario, SYNTHETIC_AUDIT) || []));
  }
  if (/^\/prescription-uploads\/[^/]+\/document$/.test(path)) {
    return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("89504e470d0a1a0a", "hex") });
  }
  if (/^\/prescription-uploads\/[^/]+$/.test(path)) {
    if (method === "DELETE") return route.fulfill(ok({ id: path.split("/").pop(), deleted: true }));
    return route.fulfill(ok(SYNTHETIC_UPLOADS[0]));
  }

  // ---- everything else ----------------------------------------------------
  if (method === "GET" && (path.startsWith("/prescriptions") || path.startsWith("/billing") || path.startsWith("/pharmacy") || path.startsWith("/appointments"))) {
    return route.fulfill(ok({ data: [], pagination: { page: 1, total: 0, totalPages: 1 } }));
  }

  ctx.notes?.push(`unhandled API fixture: ${key} -> generic empty envelope`);
  return route.fulfill(ok({}));
}

/**
 * Stub every non-localhost request so the harness never touches the internet.
 * Text resources get an empty body, images get a 1x1 transparent PNG,
 * everything else gets 204.
 */
const TRANSPARENT_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100" +
    "05fe02fea7dbd0000000049454e44ae426082",
  "hex"
);

export async function externalBlocker(route, url) {
  const type = route.request().resourceType();
  const accept = route.request().headers()["accept"] || "";
  if (type === "image") {
    return route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG });
  }
  if (type === "stylesheet" || accept.includes("text/css") || url.pathname.endsWith(".css")) {
    return route.fulfill({ status: 200, contentType: "text/css", body: "/* QA harness: external CSS blocked */" });
  }
  if (type === "font") {
    return route.fulfill({ status: 204, body: "" });
  }
  if (type === "fetch" || type === "xhr") {
    return route.fulfill({ status: 204, contentType: "application/json", body: "" });
  }
  if (type === "script" || type === "document") {
    return route.fulfill({ status: 200, contentType: "application/javascript", body: "/* QA harness: external script blocked */" });
  }
  return route.fulfill({ status: 204, body: "" });
}
