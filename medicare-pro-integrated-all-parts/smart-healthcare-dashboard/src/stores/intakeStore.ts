import { create } from "zustand";
import * as intakeService from "../services/intakeService.js";

export type IntakeQuestion = {
  questionId: string;
  section: string;
  questionText: string;
  answerType: string;
  options?: string[];
  required: boolean;
};

export type IntakeSession = {
  id: string;
  patientId: string;
  status: "CREATED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";
  language: string | null;
  interactionMode: string | null;
  intakeMode: "STANDARD" | "AYUSH";
  consentGiven: boolean;
};

type IntakeStore = {
  session: IntakeSession | null;
  sessionToken: string | null;
  currentQuestion: IntakeQuestion | null;
  history: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  mode: "question" | "review" | "completed";

  startSession: (params: { patientId: string; staffId: string; intakeMode?: "STANDARD" | "AYUSH" }) => Promise<void>;
  hydrateFromToken: (sessionId: string, sessionToken: string) => Promise<void>;
  setConsent: (consentGiven: boolean) => Promise<void>;
  setLanguageMode: (language: string, interactionMode: string) => Promise<void>;
  submitAnswer: (questionId: string, rawValue: unknown, certainty?: string, inputMode?: "TEXT" | "VOICE") => Promise<void>;
  goToReview: () => Promise<void>;
  editAnswer: (questionId: string, rawValue: unknown) => Promise<void>;
  confirmCompletion: () => Promise<void>;
  reset: () => void;
};

export const useIntakeStore = create<IntakeStore>((set, get) => ({
  session: null,
  sessionToken: null,
  currentQuestion: null,
  history: null,
  loading: false,
  error: null,
  mode: "question",

  async startSession({ patientId, staffId, intakeMode }) {
    set({ loading: true, error: null });
    try {
      const { session, sessionToken } = await intakeService.createIntakeSession({ patientId, staffId, intakeMode });
      set({ session, sessionToken, loading: false, mode: "question" });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  async hydrateFromToken(sessionId, sessionToken) {
    set({ loading: true, error: null });
    try {
      const state = await intakeService.getSessionState(sessionId, sessionToken);
      set({
        session: state.session,
        sessionToken,
        currentQuestion: state.nextQuestion,
        loading: false,
        mode: state.session.status === "COMPLETED" ? "completed" : "question",
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  async setConsent(consentGiven) {
    const { session, sessionToken } = get();
    if (!session || !sessionToken) return;
    set({ loading: true, error: null });
    try {
      const { session: updated } = await intakeService.updateSession(session.id, sessionToken, { consentGiven });
      set({ session: updated, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  async setLanguageMode(language, interactionMode) {
    const { session, sessionToken } = get();
    if (!session || !sessionToken) return;
    set({ loading: true, error: null });
    try {
      const { session: updated } = await intakeService.updateSession(session.id, sessionToken, {
        language,
        interactionMode,
      });
      set({ session: updated, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  async submitAnswer(questionId, rawValue, certainty, inputMode) {
    const { session, sessionToken } = get();
    if (!session || !sessionToken) return;
    set({ loading: true, error: null });
    try {
      // inputMode: "VOICE" maps server-side to provenance source
      // PATIENT_VOICE (see backend/services/intakeService.js) — the exact
      // convention Part 1 already defined for Part 2 voice-originated
      // answers. Uncertainty from a voice transcript is preserved via
      // `certainty`, never silently upgraded to CONFIRMED here.
      const result = await intakeService.submitAnswer(session.id, sessionToken, {
        questionId,
        rawValue,
        certainty,
        inputMode,
      });
      set({ currentQuestion: result.nextQuestion, loading: false });
      if (!result.nextQuestion) {
        await get().goToReview();
      }
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  async goToReview() {
    const { session, sessionToken } = get();
    if (!session || !sessionToken) return;
    set({ loading: true, error: null });
    try {
      const history = await intakeService.getHistory(session.id, sessionToken);
      set({ history, loading: false, mode: "review" });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  async editAnswer(questionId, rawValue) {
    const { session, sessionToken } = get();
    if (!session || !sessionToken) return;
    set({ loading: true, error: null });
    try {
      const history = await intakeService.editHistoryAnswer(session.id, sessionToken, { questionId, rawValue });
      set({ history, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  async confirmCompletion() {
    const { session, sessionToken } = get();
    if (!session || !sessionToken) return;
    set({ loading: true, error: null });
    try {
      await intakeService.completeSession(session.id, sessionToken);
      set((state) => ({
        loading: false,
        mode: "completed",
        session: state.session ? { ...state.session, status: "COMPLETED" } : state.session,
      }));
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  reset() {
    set({ session: null, sessionToken: null, currentQuestion: null, history: null, loading: false, error: null, mode: "question" });
  },
}));
