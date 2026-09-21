import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import intakeRoutes from "../routes/intakeRoutes.js";
import * as intakeService from "../services/intakeService.js";
import { createInMemoryStore } from "./fixtures/inMemoryStore.js";
import { CHIEF_COMPLAINT_QUESTION_ID } from "../services/questionEngine.js";
import { _internal as adapterInternal } from "../middleware/team1StaffAuthorizationAdapter.js";

const STAFF_HEADER = adapterInternal.STAFF_ID_HEADER;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/intake", intakeRoutes);
  return app;
}

describe("Intake API", () => {
  let app;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoFlag = process.env.TEAM1_DEMO_STAFF_AUTH;

  beforeEach(() => {
    intakeService.__setDepsForTesting(createInMemoryStore({ existingPatientIds: ["patient-1"] }));
    app = buildApp();
    // Explicit opt-in demo mode, matching how a real demo deployment would enable it.
    process.env.NODE_ENV = "test";
    process.env.TEAM1_DEMO_STAFF_AUTH = "enabled";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.TEAM1_DEMO_STAFF_AUTH = originalDemoFlag;
  });

  function staffCreateSession(patientId = "patient-1") {
    return request(app).post("/intake/sessions").set(STAFF_HEADER, "staff-1").send({ patientId });
  }

  it("POST /intake/sessions requires the demo staff header even in demo mode", async () => {
    const res = await request(app).post("/intake/sessions").send({ patientId: "patient-1" });
    expect(res.status).toBe(401);
  });

  it("POST /intake/sessions is fully blocked when demo mode is not explicitly enabled", async () => {
    process.env.TEAM1_DEMO_STAFF_AUTH = "";
    const res = await staffCreateSession();
    expect(res.status).toBe(403);
  });

  it("POST /intake/sessions is fully blocked in production regardless of the demo flag", async () => {
    process.env.NODE_ENV = "production";
    process.env.TEAM1_DEMO_STAFF_AUTH = "enabled";
    const res = await staffCreateSession();
    expect(res.status).toBe(403);
  });

  it("POST /intake/sessions rejects an unknown patientId", async () => {
    const res = await staffCreateSession("no-such-patient");
    expect(res.status).toBe(404);
  });

  it("POST /intake/sessions creates a session and returns a token for a real patient", async () => {
    const res = await staffCreateSession();
    expect(res.status).toBe(201);
    expect(res.body.session.status).toBe("CREATED");
    expect(res.body.sessionToken).toBeTruthy();
  });

  it("the kiosk cannot create a session using only a session token (no staff header accepted as a substitute)", async () => {
    const created = await staffCreateSession();
    const res = await request(app)
      .post("/intake/sessions")
      .set("Authorization", `Bearer ${created.body.sessionToken}`)
      .send({ patientId: "patient-1" });
    expect(res.status).toBe(401);
  });

  it("kiosk endpoints reject requests with no token", async () => {
    const created = await staffCreateSession();
    const res = await request(app).get(`/intake/sessions/${created.body.session.id}`);
    expect(res.status).toBe(401);
  });

  it("kiosk endpoints reject a token that belongs to a different session (patient isolation)", async () => {
    const a = await staffCreateSession();
    const b = await staffCreateSession();

    const res = await request(app)
      .get(`/intake/sessions/${b.body.session.id}`)
      .set("Authorization", `Bearer ${a.body.sessionToken}`);
    expect(res.status).toBe(401);
  });

  it("accepts the correct token for its own session", async () => {
    const created = await staffCreateSession();
    const res = await request(app)
      .get(`/intake/sessions/${created.body.session.id}`)
      .set("Authorization", `Bearer ${created.body.sessionToken}`);
    expect(res.status).toBe(200);
    expect(res.body.nextQuestion.questionId).toBe(CHIEF_COMPLAINT_QUESTION_ID);
  });

  it("staff export cannot be accessed using a kiosk session token", async () => {
    const created = await staffCreateSession();
    const res = await request(app)
      .get(`/intake/sessions/${created.body.session.id}/export`)
      .set("Authorization", `Bearer ${created.body.sessionToken}`);
    expect(res.status).toBe(401);
  });

  it("staff export works with the demo staff header", async () => {
    const created = await staffCreateSession();
    const token = created.body.sessionToken;
    const sessionId = created.body.session.id;
    await request(app)
      .post(`/intake/sessions/${sessionId}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: CHIEF_COMPLAINT_QUESTION_ID, rawValue: "checkup" });
    await request(app).post(`/intake/sessions/${sessionId}/complete`).set(STAFF_HEADER, "staff-1");

    const res = await request(app).get(`/intake/sessions/${sessionId}/export`).set(STAFF_HEADER, "staff-1");
    expect(res.status).toBe(200);
  });

  it("returns 404 for a non-existent session id even with a well-formed bearer header", async () => {
    const res = await request(app)
      .get(`/intake/sessions/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(404);
  });

  it("rejects an answer to an unknown questionId with 400", async () => {
    const created = await staffCreateSession();
    const token = created.body.sessionToken;
    const sessionId = created.body.session.id;
    const res = await request(app)
      .post(`/intake/sessions/${sessionId}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: "not.a.real.question", rawValue: "x" });
    expect(res.status).toBe(400);
  });

  it("full flow via HTTP: answer chief complaint, get next question, complete, then staff export", async () => {
    const created = await staffCreateSession();
    const token = created.body.sessionToken;
    const sessionId = created.body.session.id;

    let res = await request(app)
      .post(`/intake/sessions/${sessionId}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: CHIEF_COMPLAINT_QUESTION_ID, rawValue: "my knee hurts" });
    expect(res.status).toBe(201);

    let guard = 0;
    while (res.body.nextQuestion && guard++ < 50) {
      res = await request(app)
        .post(`/intake/sessions/${sessionId}/answers`)
        .set("Authorization", `Bearer ${token}`)
        .send({ questionId: res.body.nextQuestion.questionId, rawValue: "sample" });
    }
    expect(res.body.completion.status).toBe("COMPLETE");

    const complete1 = await request(app)
      .post(`/intake/sessions/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);
    expect(complete1.status).toBe(200);
    expect(complete1.body.status).toBe("COMPLETED");

    const complete2 = await request(app)
      .post(`/intake/sessions/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);
    expect(complete2.status).toBe(200);
    expect(complete2.body.status).toBe("COMPLETED");

    const exportRes = await request(app).get(`/intake/sessions/${sessionId}/export`).set(STAFF_HEADER, "staff-1");
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.history.completion.status).toBe("COMPLETE");
  });

  it("cannot modify a completed session (PATCH rejected)", async () => {
    const created = await staffCreateSession();
    const token = created.body.sessionToken;
    const sessionId = created.body.session.id;
    await request(app)
      .post(`/intake/sessions/${sessionId}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: CHIEF_COMPLAINT_QUESTION_ID, rawValue: "checkup" });
    await request(app).post(`/intake/sessions/${sessionId}/complete`).set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/intake/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ language: "hi" });
    expect(res.status).toBe(400);
  });
});
