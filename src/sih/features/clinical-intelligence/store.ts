// SIH Part 4 — in-memory UI state (zustand). Nothing here is persisted to browser storage.
import { create } from "zustand";
import { ClinicalApiError, clinicalApi } from "./api";
import type { Analysis, ClinicalContext, PatientListItem, ReviewDecision, ServiceStatus, Session } from "./types";

type Phase = "idle" | "loading" | "ready" | "error";
export type AppUser = { role?: string; name?: string; hospitalId?: string } | null;

interface State {
  boot: Phase; bootError: string | null;
  status: ServiceStatus | null; patients: PatientListItem[]; session: Session | null;
  selectedId: string | null; context: ClinicalContext | null; contextPhase: Phase; contextError: string | null;
  analysis: Analysis | null; analysisPhase: Phase; analysisError: string | null;
  useAI: boolean; reviewBusy: string | null; reviewError: string | null;
  init: (user: AppUser) => Promise<void>;
  selectPatient: (id: string) => Promise<void>;
  setUseAI: (v: boolean) => void;
  runAnalysis: () => Promise<void>;
  submitReview: (body: { itemId: string; decision: ReviewDecision; note?: string; modifiedText?: string }) => Promise<boolean>;
}

const initial = {
  boot: "idle" as Phase, bootError: null, status: null, patients: [], session: null,
  selectedId: null, context: null, contextPhase: "idle" as Phase, contextError: null,
  analysis: null, analysisPhase: "idle" as Phase, analysisError: null, useAI: false, reviewBusy: null, reviewError: null,
};

let lastUser: AppUser = null;
const message = (e: unknown) => (e instanceof ClinicalApiError ? e.message : "Something went wrong. Please try again.");

// Existing MediCare Pro convention (see src/services/api.js) for a real identity token when the server is not in demo-auth mode.
function externalToken(): string | null {
  try { return window.localStorage.getItem("medicare_auth_token"); } catch { return null; }
}

export const useClinicalStore = create<State>((set, get) => {
  async function newSession(): Promise<Session> {
    const status = get().status;
    if (status && status.auth !== "demo") {
      const token = externalToken();
      if (!token) throw new ClinicalApiError(401, "UNAUTHENTICATED", "Please sign in again to use Clinical Intelligence.");
      return { token, role: lastUser?.role ?? "", name: lastUser?.name ?? "" };
    }
    const res = await clinicalApi.createSession({ role: lastUser?.role ?? "", ...(lastUser?.name ? { displayName: lastUser.name.slice(0, 80) } : {}), ...(lastUser?.hospitalId ? { hospitalId: lastUser.hospitalId } : {}) });
    const session = { token: res.token, role: res.user.role, name: res.user.name };
    set({ session });
    return session;
  }

  // Runs an authenticated call; if the session expired (401) it re-establishes it once and retries.
  async function authed<T>(fn: (token: string) => Promise<T>): Promise<T> {
    let session = get().session ?? (await newSession());
    try { return await fn(session.token); }
    catch (e) {
      if (e instanceof ClinicalApiError && e.status === 401) { session = await newSession(); return fn(session.token); }
      throw e;
    }
  }

  return {
    ...initial,

    async init(user) {
      lastUser = user;
      set({ ...initial, boot: "loading" });
      try {
        const st = await clinicalApi.status();
        set({ status: { demoMode: st.demoMode, auth: st.auth, ai: st.ai, disclaimer: st.disclaimer } });
        const { patients } = await authed((t) => clinicalApi.listPatients(t));
        set({ patients, boot: "ready" });
      } catch (e) { set({ boot: "error", bootError: message(e) }); }
    },

    async selectPatient(id) {
      set({ selectedId: id, analysis: null, analysisPhase: "idle", analysisError: null, reviewError: null, context: null, contextPhase: id ? "loading" : "idle", contextError: null });
      if (!id) return;
      try {
        const { context } = await authed((t) => clinicalApi.getContext(t, id));
        if (get().selectedId === id) set({ context, contextPhase: "ready" });
      } catch (e) { if (get().selectedId === id) set({ contextPhase: "error", contextError: message(e) }); }
    },

    setUseAI: (useAI) => set({ useAI }),

    async runAnalysis() {
      const id = get().selectedId;
      if (!id) return;
      set({ analysisPhase: "loading", analysisError: null, reviewError: null });
      try {
        const { analysis } = await authed((t) => clinicalApi.analyze(t, id, get().useAI));
        if (get().selectedId === id) set({ analysis, analysisPhase: "ready" });
      } catch (e) { set({ analysisPhase: "error", analysisError: message(e) }); }
    },

    async submitReview(body) {
      const a = get().analysis;
      if (!a) return false;
      set({ reviewBusy: body.itemId, reviewError: null });
      try {
        const { analysis } = await authed((t) => clinicalApi.review(t, a.analysisId, body));
        set({ analysis, reviewBusy: null });
        return true;
      } catch (e) { set({ reviewBusy: null, reviewError: message(e) }); return false; }
    },
  };
});

export function resetClinicalStore() { lastUser = null; useClinicalStore.setState({ ...initial }); }
