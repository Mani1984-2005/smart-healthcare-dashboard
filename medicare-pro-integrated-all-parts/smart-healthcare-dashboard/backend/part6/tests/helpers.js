import express from "express";
import { loadConfig } from "../config.js";
import { createPart6 } from "../createPart6.js";
import { createPart6Router } from "../routes/index.js";

export const U = {
  patient: "USR-PAT-001",
  patient2: "USR-PAT-002",
  docHospital: "USR-DOC-001",
  docClinic: "USR-DOC-002",
  hospitalAdmin: "USR-HADM-001",
  sysAdmin: "USR-SADM-001",
};

/** A fresh in-memory Part 6 instance behind a real HTTP server on an ephemeral port. */
export async function startApp(overrides = {}) {
  const config = loadConfig({}, { storage: "memory", demoAuth: true, tokenSecret: "t".repeat(40), ...overrides });
  const part6 = createPart6({ config });
  const app = express();
  app.use("/api/part6", createPart6Router(part6));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/part6`;

  async function call(token, method, path, body, extraHeaders = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON */
    }
    return { status: res.status, body: json, headers: res.headers };
  }

  const tokens = {};
  async function login(userId) {
    if (!tokens[userId]) {
      const r = await call(null, "POST", "/auth/demo-login", { userId });
      if (r.status !== 200) throw new Error(`login failed for ${userId}: ${r.status}`);
      tokens[userId] = r.body.token;
    }
    return tokens[userId];
  }

  /** Call as a persona: as("USR-DOC-001").post("/fhir/bundle", {...}) */
  const as = (userId) => ({
    get: async (p) => call(await login(userId), "GET", p),
    post: async (p, b = {}) => call(await login(userId), "POST", p, b),
    put: async (p, b = {}) => call(await login(userId), "PUT", p, b),
  });

  return { part6, base, call, login, as, close: () => new Promise((r) => server.close(r)) };
}

/** Create a request from the clinic doctor for Demo Patient, returning the consent. */
export async function requestConsent(app, categories = ["clinical-history", "medications"], durationDays = 30) {
  const r = await app.as(U.docClinic).post("/consent", { patientId: "MCP-DEMO-001", purpose: "CARE_CONTINUITY", categories, durationDays });
  if (r.status !== 201) throw new Error(`request failed: ${JSON.stringify(r.body)}`);
  return r.body;
}
