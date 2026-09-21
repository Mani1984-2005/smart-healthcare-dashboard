import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import IntakeFlow from "../pages/kiosk/IntakeFlow.tsx";
import { useIntakeStore } from "../stores/intakeStore.ts";
import * as intakeService from "../services/intakeService.js";

vi.mock("../services/intakeService.js");

const CHIEF_COMPLAINT = {
  questionId: "chiefComplaint.text",
  section: "chiefComplaint",
  questionText: "What brings you to the hospital today?",
  answerType: "LONG_TEXT",
  required: true,
};

const CHEST_PAIN_ONSET = {
  questionId: "hpi.chestpain.onset",
  section: "historyOfPresentIllness",
  questionText: "When did the chest pain start?",
  answerType: "TEXT",
  required: true,
};

function renderKiosk(sessionId = "session-1", sessionToken = "token-1") {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/kiosk/${sessionId}`, state: { sessionToken } }]}>
      <Routes>
        <Route path="/kiosk/:sessionId" element={<IntakeFlow />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Kiosk IntakeFlow", () => {
  beforeEach(() => {
    useIntakeStore.getState().reset();
    vi.resetAllMocks();
  });

  it("starts with consent, then language/mode, then the chief complaint question", async () => {
    intakeService.getSessionState.mockResolvedValue({
      session: { id: "session-1", status: "CREATED", consentGiven: false, language: null, intakeMode: "STANDARD" },
      answers: {},
      nextQuestion: CHIEF_COMPLAINT,
    });

    renderKiosk();

    expect(await screen.findByText(/Before we begin/i)).toBeInTheDocument();
  });

  it("advances from consent -> language -> chief complaint question", async () => {
    intakeService.getSessionState.mockResolvedValue({
      session: { id: "session-1", status: "CREATED", consentGiven: false, language: null, intakeMode: "STANDARD" },
      answers: {},
      nextQuestion: CHIEF_COMPLAINT,
    });
    intakeService.updateSession
      .mockResolvedValueOnce({ session: { id: "session-1", status: "IN_PROGRESS", consentGiven: true, language: null, intakeMode: "STANDARD" } })
      .mockResolvedValueOnce({ session: { id: "session-1", status: "IN_PROGRESS", consentGiven: true, language: "en", interactionMode: "TOUCH", intakeMode: "STANDARD" } });

    renderKiosk();
    fireEvent.click(await screen.findByText("I agree, let's continue"));
    fireEvent.click(await screen.findByText("Continue"));

    expect(await screen.findByText(/What brings you to the hospital today/)).toBeInTheDocument();
  });

  it("branches to chest-pain-specific questions after a chest-pain chief complaint", async () => {
    intakeService.getSessionState.mockResolvedValue({
      session: { id: "session-1", status: "IN_PROGRESS", consentGiven: true, language: "en", interactionMode: "TOUCH", intakeMode: "STANDARD" },
      answers: {},
      nextQuestion: CHIEF_COMPLAINT,
    });
    intakeService.submitAnswer.mockResolvedValueOnce({
      answer: {},
      nextQuestion: CHEST_PAIN_ONSET,
      completion: { status: "INCOMPLETE", missingRequiredFields: [], percentComplete: 0.1 },
    });

    renderKiosk();
    const textarea = await screen.findByPlaceholderText("Type your answer");
    fireEvent.change(textarea, { target: { value: "Chest pain for two days" } });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => expect(screen.getByText(/When did the chest pain start/)).toBeInTheDocument());
  });

  it("renders the review screen once the engine returns no next question, and completion after confirm", async () => {
    intakeService.getSessionState.mockResolvedValue({
      session: { id: "session-1", status: "IN_PROGRESS", consentGiven: true, language: "en", interactionMode: "TOUCH", intakeMode: "STANDARD" },
      answers: {},
      nextQuestion: CHEST_PAIN_ONSET,
    });
    intakeService.submitAnswer.mockResolvedValueOnce({
      answer: {},
      nextQuestion: null,
      completion: { status: "COMPLETE", missingRequiredFields: [], percentComplete: 1 },
    });
    intakeService.getHistory.mockResolvedValueOnce({
      chiefComplaint: { value: "Chest pain for two days", certainty: "CONFIRMED" },
      historyOfPresentIllness: { onset: { value: "two days ago", certainty: "CONFIRMED" } },
      allergies: { status: "UNKNOWN", items: [] },
      pastMedicalHistory: [],
      medications: [],
      ayushHistory: { fields: [] },
      completion: { status: "COMPLETE" },
    });
    intakeService.completeSession.mockResolvedValueOnce({ status: "COMPLETED" });

    renderKiosk();
    const input = await screen.findByPlaceholderText("Type your answer");
    fireEvent.change(input, { target: { value: "yesterday" } });
    fireEvent.click(screen.getByText("Continue"));

    expect(await screen.findByText("Chest pain for two days")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Everything looks correct/));

    await waitFor(() => expect(intakeService.completeSession).toHaveBeenCalled());
  });

  it("shows an empty state when no session token is available", () => {
    render(
      <MemoryRouter initialEntries={["/kiosk/session-1"]}>
        <Routes>
          <Route path="/kiosk/:sessionId" element={<IntakeFlow />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/No active kiosk session/)).toBeInTheDocument();
  });
});
