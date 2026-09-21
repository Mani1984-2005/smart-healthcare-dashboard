// src/stores/physicianWorkspaceStore.ts
//
// Part 5 — Physician AI Workspace — client state.
// Self-contained: imports only from this module's own service layer and
// shared type definitions, plus the existing generic auth store to know
// who the current demo user is (id/name/role already exists in MediCare
// Pro — see src/store/authStore.js — no new cross-part dependency).

import { create } from "zustand";
import type {
  ClinicalCase,
  ClinicalCaseListItem,
  ClinicalSummary,
  SummaryVersion,
  AuditEntry,
  SummarySections,
  PatientDocument,
  ClinicalIntelligenceAnalysis,
} from "../types/physicianWorkspace";
import * as service from "../services/physicianWorkspace/physicianWorkspaceService";
import type { DemoIdentity } from "../services/physicianWorkspace/physicianWorkspaceService";

type DataSource = "api" | "local";

type PhysicianWorkspaceState = {
  cases: ClinicalCaseListItem[];
  casesLoading: boolean;
  casesError: string | null;

  selectedCase: ClinicalCase | null;
  caseLoading: boolean;
  caseError: string | null;

  summary: ClinicalSummary | null;
  summarySource: DataSource | null;
  summaryLoading: boolean;
  summaryError: string | null;

  draftSections: Partial<SummarySections> | null;
  isDirty: boolean;

  versions: SummaryVersion[];
  audit: AuditEntry[];
  historyLoading: boolean;

  documents: PatientDocument[];
  documentsLoading: boolean;
  documentsError: string | null;

  clinicalIntelligence: ClinicalIntelligenceAnalysis[];
  ciLoading: boolean;
  ciError: string | null;

  loadCases: (actor: DemoIdentity) => Promise<void>;
  selectCase: (actor: DemoIdentity, caseId: string) => Promise<void>;
  openIntakeSession: (actor: DemoIdentity, intakeSessionId: string) => Promise<void>;
  clearSelection: () => void;
  generateSummary: (actor: DemoIdentity) => Promise<void>;
  updateDraft: (patch: Partial<SummarySections>) => void;
  saveDraft: (actor: DemoIdentity) => Promise<void>;
  discardDraft: () => void;
  approveSummary: (actor: DemoIdentity) => Promise<void>;
  rejectSummary: (actor: DemoIdentity, reason: string) => Promise<void>;
  reviseSummary: (actor: DemoIdentity, note?: string) => Promise<void>;
  loadHistory: (actor: DemoIdentity) => Promise<void>;
  loadDocuments: (actor: DemoIdentity) => Promise<void>;
  loadClinicalIntelligence: (actor: DemoIdentity) => Promise<void>;
  clearError: () => void;
};

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "An unexpected error occurred.";
}

export const usePhysicianWorkspaceStore = create<PhysicianWorkspaceState>((set, get) => ({
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

  documents: [],
  documentsLoading: false,
  documentsError: null,

  clinicalIntelligence: [],
  ciLoading: false,
  ciError: null,

  async loadCases(actor) {
    set({ casesLoading: true, casesError: null });
    try {
      const { data } = await service.fetchCases(actor);
      set({ cases: data, casesLoading: false });
    } catch (err) {
      set({ casesLoading: false, casesError: messageOf(err) });
    }
  },

  async selectCase(actor, caseId) {
    set({
      caseLoading: true,
      caseError: null,
      selectedCase: null,
      summary: null,
      summarySource: null,
      draftSections: null,
      isDirty: false,
      versions: [],
      audit: [],
      documents: [],
      clinicalIntelligence: [],
    });
    try {
      const { data } = await service.fetchCase(actor, caseId);
      set({ selectedCase: data, caseLoading: false });
      get().loadDocuments(actor);
      get().loadClinicalIntelligence(actor);
    } catch (err) {
      set({ caseLoading: false, caseError: messageOf(err) });
    }
  },

  /** Part 1 -> Part 5 bridge: opens a real, completed intake session as a case. */
  async openIntakeSession(actor, intakeSessionId) {
    set({
      caseLoading: true,
      caseError: null,
      selectedCase: null,
      summary: null,
      summarySource: null,
      draftSections: null,
      isDirty: false,
      versions: [],
      audit: [],
      documents: [],
      clinicalIntelligence: [],
    });
    try {
      const { data } = await service.openFromIntakeSession(actor, intakeSessionId);
      set({ selectedCase: data, caseLoading: false });
      get().loadDocuments(actor);
      get().loadClinicalIntelligence(actor);
    } catch (err) {
      set({ caseLoading: false, caseError: messageOf(err) });
    }
  },

  /** Part 3 -> Part 5 bridge: documents for the currently selected case's patient. */
  async loadDocuments(actor) {
    const { selectedCase } = get();
    if (!selectedCase) return;
    set({ documentsLoading: true, documentsError: null });
    try {
      const data = await service.fetchCaseDocuments(actor, selectedCase.id);
      set({ documents: data, documentsLoading: false });
    } catch (err) {
      set({ documentsLoading: false, documentsError: messageOf(err) });
    }
  },

  /** Part 4 -> Part 5 bridge: clinical-intelligence analyses for the currently selected case's patient. */
  async loadClinicalIntelligence(actor) {
    const { selectedCase } = get();
    if (!selectedCase) return;
    set({ ciLoading: true, ciError: null });
    try {
      const data = await service.fetchCaseClinicalIntelligence(actor, selectedCase.id);
      set({ clinicalIntelligence: data, ciLoading: false });
    } catch (err) {
      set({ ciLoading: false, ciError: messageOf(err) });
    }
  },

  clearSelection() {
    set({
      selectedCase: null,
      summary: null,
      summarySource: null,
      draftSections: null,
      isDirty: false,
      versions: [],
      audit: [],
      documents: [],
      clinicalIntelligence: [],
      caseError: null,
      summaryError: null,
    });
  },

  async generateSummary(actor) {
    const { selectedCase } = get();
    if (!selectedCase) return;
    set({ summaryLoading: true, summaryError: null });
    try {
      const { data, source } = await service.generateSummary(actor, selectedCase.id);
      set({ summary: data, summarySource: source, summaryLoading: false, draftSections: null, isDirty: false, versions: [], audit: [] });
    } catch (err) {
      set({ summaryLoading: false, summaryError: messageOf(err) });
    }
  },

  updateDraft(patch) {
    const { draftSections, summary } = get();
    if (!summary) return;
    set({ draftSections: { ...(draftSections || {}), ...patch }, isDirty: true });
  },

  discardDraft() {
    set({ draftSections: null, isDirty: false });
  },

  async saveDraft(actor) {
    const { summary, summarySource, draftSections } = get();
    if (!summary || !summarySource || !draftSections || Object.keys(draftSections).length === 0) return;
    set({ summaryLoading: true, summaryError: null });
    try {
      const updated = await service.editSummary(actor, summary.id, summarySource, draftSections);
      set({ summary: updated, summaryLoading: false, draftSections: null, isDirty: false });
    } catch (err) {
      set({ summaryLoading: false, summaryError: messageOf(err) });
    }
  },

  async approveSummary(actor) {
    const { summary, summarySource } = get();
    if (!summary || !summarySource) return;
    set({ summaryLoading: true, summaryError: null });
    try {
      const updated = await service.approveSummary(actor, summary.id, summarySource);
      set({ summary: updated, summaryLoading: false });
    } catch (err) {
      set({ summaryLoading: false, summaryError: messageOf(err) });
    }
  },

  async rejectSummary(actor, reason) {
    const { summary, summarySource } = get();
    if (!summary || !summarySource) return;
    set({ summaryLoading: true, summaryError: null });
    try {
      const updated = await service.rejectSummary(actor, summary.id, summarySource, reason);
      set({ summary: updated, summaryLoading: false });
    } catch (err) {
      set({ summaryLoading: false, summaryError: messageOf(err) });
    }
  },

  async reviseSummary(actor, note) {
    const { summary, summarySource } = get();
    if (!summary || !summarySource) return;
    set({ summaryLoading: true, summaryError: null });
    try {
      const updated = await service.reviseSummary(actor, summary.id, summarySource, note);
      set({ summary: updated, summaryLoading: false, draftSections: null, isDirty: false });
    } catch (err) {
      set({ summaryLoading: false, summaryError: messageOf(err) });
    }
  },

  async loadHistory(actor) {
    const { summary, summarySource } = get();
    if (!summary || !summarySource) return;
    set({ historyLoading: true });
    try {
      const [versions, audit] = await Promise.all([
        service.fetchVersions(actor, summary.id, summarySource),
        service.fetchAudit(actor, summary.id, summarySource),
      ]);
      set({ versions, audit, historyLoading: false });
    } catch {
      set({ historyLoading: false });
    }
  },

  clearError() {
    set({ casesError: null, caseError: null, summaryError: null });
  },
}));
