// Test helpers: an in-process Part 3 server on an ephemeral port (memory store, no other module needed).
import { createPart3App, createPart3Context, loadConfig } from "../index.js";

export const silentLogger = { error() {}, log() {}, warn() {}, info() {} };
export const actor = (role = "DOCTOR") => ({ id: `test-${role.toLowerCase()}`, role });
export const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const notAFixturePng = (label = "x") => Buffer.concat([PNG_SIG, Buffer.from(`not-a-fixture-${label}`)]);

export function testConfig(overrides = {}, env = {}) {
  return loadConfig(
    { NODE_ENV: "test", PART3_DATA_DIR: "memory", PART3_DEMO_SECRET: "test-secret", ...env },
    { rateLimit: { sessionMax: 10_000, uploadMax: 10_000, processMax: 10_000 }, ...overrides },
  );
}

export function testContext({ overrides, ocrProviders = [], env } = {}) {
  return createPart3Context({ config: testConfig(overrides, env), ocrProviders, logger: silentLogger });
}

export async function startTestServer({ overrides, ocrProviders = [], env } = {}) {
  const config = testConfig(overrides, env);
  const { app, context } = createPart3App({ config, ocrProviders, logger: silentLogger });
  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}/part3`;

  async function call(method, path, { token, body, headers = {}, raw } = {}) {
    const init = { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers } };
    if (raw !== undefined) init.body = raw;
    else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["Content-Type"] = "application/json"; }
    const res = await fetch(baseUrl + path, init);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* binary or empty body */ }
    return { status: res.status, json, headers: res.headers, text };
  }
  const tokens = {};
  const session = async (role = "DOCTOR", name = "Test User") => {
    tokens[role] ??= (await call("POST", "/auth/demo-session", { body: { role, name } })).json.token;
    return tokens[role];
  };
  return { baseUrl, call, session, context, config, close: () => new Promise((resolve) => server.close(resolve)) };
}

/** Runs the whole pipeline for a bundled fixture through the service layer. */
export async function processFixture(context, fixtureId, who = actor("DOCTOR")) {
  const { documents } = context;
  const { document } = await documents.ingestFixture({ actor: who, requestId: "t", fixtureId });
  await documents.runOcr({ actor: who, requestId: "t", documentId: document.id });
  await documents.runExtraction({ actor: who, requestId: "t", documentId: document.id });
  await documents.addToTimeline({ actor: who, requestId: "t", documentId: document.id });
  return document.id;
}
