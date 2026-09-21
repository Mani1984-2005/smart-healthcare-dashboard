import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClinicalSummary, SummaryStatus } from "../../types/physicianWorkspace";

const mockService = {
  fetchCases: vi.fn(),
  fetchCase: vi.fn(),
  generateSummary: vi.fn(),
  editSummary: vi.fn(),
  approveSummary: vi.fn(),
  rejectSummary: vi.fn(),
  reviseSummary: vi.fn(),
  fetchVersions: vi.fn(),
  fetchAudit: vi.fn(),
};

vi.mock("../../services/physicianWorkspace/physicianWorkspaceService", () => mockService);

const ACTOR = { id: "doc-1", name: "Dr. Demo", role: "DOCTOR" };

const SECTIONS = {
  chiefComplaint: "Chest pain",
  historyOfPresentIllness: "3 days",
  pastMedicalHistory: "None",
  medications: "None",
  allergies: "None known",
  familyHistory: "Not available",
  socialHistory: "Not available",
  vitals: "Not available",
  investigations: "Not available",
  missingInformation: "None identified.",
};

function makeSummary(overrides: Partial<ClinicalSummary> = {}): ClinicalSummary {
  return {
    id: "SUM-0001",
    caseId: "CASE-2001",
    status: "AI_GENERATED" as SummaryStatus,
    sections: SECTIONS,
    flags: [],
    aiMeta: { model: "demo-deterministic-v1", disclaimer: "AI-GENERATED DRAFT", generatedAt: new Date().toISOString() },
    editedBy: null,
    approvedBy: null,
    rejectedBy: null,
    revisionNote: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentVersion: 1,
    ...overrides,
  };
}

describe("usePhysicianWorkspaceStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { usePhysicianWorkspaceStore } = await import("../physicianWorkspaceStore");
    usePhysicianWorkspaceStore.setState({
      cases: [],
      casesLoading: false,
      casesError: null,
      selectedCase: null,
      caseLoading: false,
      caseError: null,
      summary: null,
      summarySource: null,
      summaryLoading: false,
      summaryError: null,
      draftSections: null,
      isDirty: false,
      versions: [],
      audit: [],
      historyLoading: false,
    });
  });

  it("loadCases populates cases on success", async () => {
    mockService.fetchCases.mockResolvedValueOnce({ data: [{ id: "CASE-2001", patientName: "Amrita Singh" }], source: "api" });
    const { usePhysicianWorkspaceStore } = await import("../physicianWorkspaceStore");

    await usePhysicianWorkspaceStore.getState().loadCases(ACTOR);

    expect(usePhysicianWorkspaceStore.getState().cases).toHaveLength(1);
    expect(usePhysicianWorkspaceStore.getState().casesError).toBeNull();
  });

  it("loadCases surfaces an error message on failure", async () => {
    mockService.fetchCases.mockRejectedValueOnce(new Error("network down"));
    const { usePhysicianWorkspaceStore } = await import("../physicianWorkspaceStore");

    await usePhysicianWorkspaceStore.getState().loadCases(ACTOR);

    expect(usePhysicianWorkspaceStore.getState().casesError).toMatch(/network down/);
  });

  it("generateSummary requires a selected case and stores the result", async () => {
    const { usePhysicianWorkspaceStore } = await import("../physicianWorkspaceStore");
    usePhysicianWorkspaceStore.setState({
      selectedCase: {
        id: "CASE-2001",
        patientId: "P-1001",
        patientName: "Amrita Singh",
        age: 34,
        gender: "Female",
        presentingComplaint: "Chest tightness",
        historyOfPresentIllness: "3 days",
        pastMedicalHistory: [],
        medications: [],
        allergies: [],
        createdAt: new Date().toISOString(),
      },
    });
    mockService.generateSummary.mockResolvedValueOnce({ data: makeSummary(), source: "api" });

    await usePhysicianWorkspaceStore.getState().generateSummary(ACTOR);

    const state = usePhysicianWorkspaceStore.getState();
    expect(state.summary?.status).toBe("AI_GENERATED");
    expect(state.summarySource).toBe("api");
  });

  it("saveDraft only sends changed sections and clears dirty state", async () => {
    const { usePhysicianWorkspaceStore } = await import("../physicianWorkspaceStore");
    usePhysicianWorkspaceStore.setState({ summary: makeSummary(), summarySource: "api" });
    usePhysicianWorkspaceStore.getState().updateDraft({ chiefComplaint: "Updated complaint" });
    expect(usePhysicianWorkspaceStore.getState().isDirty).toBe(true);

    mockService.editSummary.mockResolvedValueOnce(makeSummary({ status: "PHYSICIAN_EDITED", sections: { ...SECTIONS, chiefComplaint: "Updated complaint" } }));

    await usePhysicianWorkspaceStore.getState().saveDraft(ACTOR);

    expect(mockService.editSummary).toHaveBeenCalledWith(ACTOR, "SUM-0001", "api", { chiefComplaint: "Updated complaint" });
    const state = usePhysicianWorkspaceStore.getState();
    expect(state.isDirty).toBe(false);
    expect(state.summary?.status).toBe("PHYSICIAN_EDITED");
  });

  it("approveSummary updates status to APPROVED", async () => {
    const { usePhysicianWorkspaceStore } = await import("../physicianWorkspaceStore");
    usePhysicianWorkspaceStore.setState({ summary: makeSummary(), summarySource: "api" });
    mockService.approveSummary.mockResolvedValueOnce(makeSummary({ status: "APPROVED" }));

    await usePhysicianWorkspaceStore.getState().approveSummary(ACTOR);

    expect(usePhysicianWorkspaceStore.getState().summary?.status).toBe("APPROVED");
  });

  it("rejectSummary requires an existing summary and forwards the reason", async () => {
    const { usePhysicianWorkspaceStore } = await import("../physicianWorkspaceStore");
    usePhysicianWorkspaceStore.setState({ summary: makeSummary(), summarySource: "local" });
    mockService.rejectSummary.mockResolvedValueOnce(makeSummary({ status: "REJECTED", revisionNote: "Needs more detail" }));

    await usePhysicianWorkspaceStore.getState().rejectSummary(ACTOR, "Needs more detail");

    expect(mockService.rejectSummary).toHaveBeenCalledWith(ACTOR, "SUM-0001", "local", "Needs more detail");
    expect(usePhysicianWorkspaceStore.getState().summary?.status).toBe("REJECTED");
  });
});
