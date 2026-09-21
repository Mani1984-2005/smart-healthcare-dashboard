import { render } from "@testing-library/react";
import { vi } from "vitest";
import ClinicalIntelligence from "../../../pages/ClinicalIntelligence";
import { useAuthStore } from "../../../store/authStore.js";
import { resetClinicalStore } from "../store";
import { clinicalApi } from "../api";
import type { Analysis, ClinicalContext } from "../types";
import fixtures from "../__fixtures__/clinical.json";

// Only the network client is replaced; the store, page, components and ClinicalApiError are the real ones.
vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, clinicalApi: { status: vi.fn(), createSession: vi.fn(), listPatients: vi.fn(), getContext: vi.fn(), analyze: vi.fn(), review: vi.fn() } };
});

export const FX = fixtures as unknown as {
  status: { success: true; demoMode: boolean; auth: "demo" | "firebase"; ai: { provider: string }; disclaimer: string };
  patients: { id: string; label: string; scenario: string; description: string; synthetic: boolean }[];
  contexts: Record<string, ClinicalContext>;
  analyses: Record<string, { plain: Analysis; withAI: Analysis }>;
};
export const analysisFor = (id: string, ai = false): Analysis => structuredClone(ai ? FX.analyses[id].withAI : FX.analyses[id].plain);

// Mimics the server's review behaviour just enough to drive the UI (the real behaviour is covered by the backend suite).
export function applyReview(a: Analysis, body: { itemId: string; decision: "accepted" | "rejected" | "modified"; note?: string; modifiedText?: string }): Analysis {
  const next = structuredClone(a);
  const review = { state: "reviewed" as const, decision: body.decision, note: body.note ?? null, modifiedText: body.modifiedText ?? null, reviewer: { id: "demo-1", name: "Dr. Test", role: "DOCTOR" }, reviewedAt: "2026-09-20T09:00:00.000Z" };
  if (body.itemId === "summary") next.summary.review = review;
  else if (body.itemId === "ai-narrative" && next.summary.aiNarrative) next.summary.aiNarrative.review = review;
  else next.findings = next.findings.map((f) => (f.id === body.itemId ? { ...f, review } : f));
  const reviewed = [next.summary.review, next.summary.aiNarrative?.review, ...next.findings.filter((f) => f.reviewRequired).map((f) => f.review)].filter((r) => r && r.state === "reviewed").length;
  next.reviewProgress = { total: a.reviewProgress.total, completed: reviewed };
  next.reviewStatus = reviewed === a.reviewProgress.total ? "reviewed" : "needs_review";
  return next;
}

export type ApiMock = { [K in keyof typeof clinicalApi]: ReturnType<typeof vi.fn> };

export function installApi(opts: { aiProvider?: string; analysisDelay?: number } = {}) {
  const api = clinicalApi as unknown as ApiMock;
  let current: Analysis | null = null;
  api.status.mockReset().mockResolvedValue({ ...FX.status, ai: { provider: opts.aiProvider ?? "mock" } });
  api.createSession.mockReset().mockResolvedValue({ token: "tok-1", user: { role: "DOCTOR", name: "Dr. Test" } });
  api.listPatients.mockReset().mockResolvedValue({ patients: FX.patients });
  api.getContext.mockReset().mockImplementation(async (_t: string, id: string) => ({ context: structuredClone(FX.contexts[id]) }));
  api.analyze.mockReset().mockImplementation(async (_t: string, id: string, useAI: boolean) => {
    if (opts.analysisDelay) await new Promise((r) => setTimeout(r, opts.analysisDelay));
    current = analysisFor(id, useAI);
    return { analysis: current };
  });
  api.review.mockReset().mockImplementation(async (_t: string, _id: string, body: Parameters<typeof applyReview>[1]) => {
    current = applyReview(current as Analysis, body);
    return { analysis: current };
  });
  return api;
}

export function renderPage(role = "DOCTOR") {
  resetClinicalStore();
  useAuthStore.setState({ user: { id: "u1", name: "Dr. Test", role, hospitalId: "hospital-01" }, isAuthenticated: true });
  return render(<ClinicalIntelligence />);
}

