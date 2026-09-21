import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryStore } from "./fixtures/inMemoryStore.js";
import * as intakeService from "../services/intakeService.js";
import { CHIEF_COMPLAINT_QUESTION_ID } from "../services/questionEngine.js";

describe("intakeService — session lifecycle (in-memory store, no live DB)", () => {
  let deps;

  beforeEach(() => {
    deps = createInMemoryStore({ existingPatientIds: ["patient-1"] });
  });

  it("creates a session only for an existing patient, requires a staff identity", async () => {
    await expect(
      intakeService.createSession({ patientId: "patient-1" }, deps)
    ).rejects.toThrow(); // missing staffUid

    await expect(
      intakeService.createSession({ patientId: "unknown-patient", staffUid: "staff-1" }, deps)
    ).rejects.toThrow();

    const { session, sessionToken } = await intakeService.createSession(
      { patientId: "patient-1", staffUid: "staff-1" },
      deps
    );
    expect(session.status).toBe("CREATED");
    expect(session.patientId).toBe("patient-1");
    expect(sessionToken).toBeTruthy();
  });

  it("never returns the raw token again from getSessionState — only authorizeSessionToken validates it", async () => {
    const { session } = await intakeService.createSession({ patientId: "patient-1", staffUid: "staff-1" }, deps);
    const state = await intakeService.getSessionState(session.id, deps);
    expect(JSON.stringify(state)).not.toMatch(/session_token_hash/);
  });

  it("session A's token cannot authorize session B", async () => {
    const a = await intakeService.createSession({ patientId: "patient-1", staffUid: "staff-1" }, deps);
    const b = await intakeService.createSession({ patientId: "patient-1", staffUid: "staff-1" }, deps);

    await expect(intakeService.authorizeSessionToken(b.session.id, a.sessionToken, deps)).rejects.toThrow();
    await expect(intakeService.authorizeSessionToken(a.session.id, a.sessionToken, deps)).resolves.toBeTruthy();
  });

  it("runs the full golden path: chief complaint -> chest pain branch -> review -> edit -> complete -> export", async () => {
    const { session } = await intakeService.createSession({ patientId: "patient-1", staffUid: "staff-1" }, deps);
    const sessionId = session.id;

    await intakeService.updateSessionFields(sessionId, { language: "en", interactionMode: "TOUCH", consentGiven: true }, deps);

    let result = await intakeService.submitAnswer(
      sessionId,
      { questionId: CHIEF_COMPLAINT_QUESTION_ID, rawValue: "Chest pain for two days" },
      deps
    );
    expect(result.nextQuestion.questionId).toBe("hpi.chestpain.onset");

    // Answer the full chest-pain set + all remaining required base questions.
    let guard = 0;
    while (result.nextQuestion && guard++ < 50) {
      result = await intakeService.submitAnswer(
        sessionId,
        { questionId: result.nextQuestion.questionId, rawValue: "sample answer" },
        deps
      );
    }
    expect(result.nextQuestion).toBeNull();
    expect(result.completion.status).toBe("COMPLETE");

    const history = await intakeService.getHistory(sessionId, deps);
    expect(history.chiefComplaint.value).toBe("Chest pain for two days");
    expect(history.historyOfPresentIllness.onset).toBeTruthy();

    // Correct one answer during review.
    const edited = await intakeService.editAnswer(sessionId, { questionId: "hpi.chestpain.severity", rawValue: 9 }, deps);
    expect(edited.historyOfPresentIllness.severity.value).toBe(9);

    const completed = await intakeService.completeSession(sessionId, deps);
    expect(completed.status).toBe("COMPLETED");

    // Idempotent completion: calling again does not error and returns the same status.
    const completedAgain = await intakeService.completeSession(sessionId, deps);
    expect(completedAgain.status).toBe("COMPLETED");

    const exported = await intakeService.exportSession(sessionId, deps);
    expect(exported.history.completion.status).toBe("COMPLETE");
    expect(exported.history.historyOfPresentIllness.severity.value).toBe(9);
  });

  it("rejects answers/edits on a completed session", async () => {
    const { session } = await intakeService.createSession({ patientId: "patient-1", staffUid: "staff-1" }, deps);
    await intakeService.submitAnswer(session.id, { questionId: CHIEF_COMPLAINT_QUESTION_ID, rawValue: "my knee hurts" }, deps);
    await intakeService.completeSession(session.id, deps);

    await expect(
      intakeService.submitAnswer(session.id, { questionId: "hpi.generic.onset", rawValue: "x" }, deps)
    ).rejects.toThrow();
    await expect(
      intakeService.updateSessionFields(session.id, { language: "hi" }, deps)
    ).rejects.toThrow();
  });

  it("preserves UNCERTAIN patient-reported facts distinct from CONFIRMED (diabetes example)", async () => {
    const { session } = await intakeService.createSession({ patientId: "patient-1", staffUid: "staff-1" }, deps);
    await intakeService.submitAnswer(session.id, { questionId: CHIEF_COMPLAINT_QUESTION_ID, rawValue: "checkup" }, deps);
    await intakeService.submitAnswer(
      session.id,
      { questionId: "pmh.conditions", rawValue: "I think I had diabetes maybe 5 years ago" },
      deps
    );
    const history = await intakeService.getHistory(session.id, deps);
    const fact = history.pastMedicalHistory.find((f) => f.value.includes("diabetes"));
    expect(fact.certainty).toBe("UNCERTAIN");
  });
});
