// src/types/physicianWorkspace.ts
//
// Part 5 — Physician AI Workspace — shared frontend types.
// Mirrors the shape returned by backend/routes/physicianWorkspaceRoutes.js.
// Kept in its own file, imported only by Part 5's own store/service/page, so
// this module has no type-level coupling to any other SIH part.

export type SummaryStatus =
  | "AI_GENERATED"
  | "PHYSICIAN_EDITED"
  | "APPROVED"
  | "REJECTED"
  | "REVISION_REQUESTED";

export type ClinicalCaseListItem = {
  id: string;
  patientId: string;
  // `null` when the case was bridged from a real Part 1 intake session and
  // no matching identity record was found (see intakeRecordAdapter.js) —
  // never fabricated. Existing demo cases always provide these as before.
  patientName: string | null;
  age: number | null;
  gender: string | null;
  presentingComplaint: string;
  /** "INTAKE_SESSION" for a real, bridged Part 1 session; "DEMO" (default) for Part 5's own seed data. */
  source?: "INTAKE_SESSION" | "DEMO";
};

export type PatientDocument = {
  id: string;
  docType: string;
  originalFilename: string;
  mimeType: string;
  status: string;
  uploadedAt: string;
  origin: "USER_UPLOAD" | "SYNTHETIC_FIXTURE";
  /** OCR text, present only once OCR has completed for this document — never fabricated for a pending/failed one. */
  ocrText: string | null;
  ocrProvider: string | null;
};

export type ClinicalIntelligenceFinding = {
  id: string;
  kind: string;
  category: string;
  title: string;
  statement: string;
  severity: string;
  /** "rules" (deterministic) or "ai" — never relabeled by the bridge; always shown to the physician as-is. */
  origin: "rules" | "ai";
  reviewRequired: boolean;
};

export type ClinicalIntelligenceAnalysis = {
  analysisId: string;
  generatedAt: string;
  mode: "demo" | "live";
  disclaimer: string;
  summary: Record<string, unknown>;
  findings: ClinicalIntelligenceFinding[];
  aiNarrative: string | null;
  reviewItems: string[];
  generatedBy: { id: string; role: string };
};

export type ClinicalCase = ClinicalCaseListItem & {
  intakeSessionId?: string;
  encounterId?: string | null;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  familyHistory?: string;
  socialHistory?: string;
  vitals?: { label: string; value: string }[];
  labResults?: { test: string; value: string; flag: string }[];
  createdAt: string;
};

export type SummarySections = {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  medications: string;
  allergies: string;
  familyHistory: string;
  socialHistory: string;
  vitals: string;
  investigations: string;
  missingInformation: string;
};

export type SummaryActor = { id: string; name: string; role: string } | null;

export type ClinicalSummary = {
  id: string;
  caseId: string;
  status: SummaryStatus;
  sections: SummarySections;
  flags: string[];
  aiMeta: { model: string; disclaimer: string; generatedAt: string };
  editedBy: SummaryActor;
  approvedBy: SummaryActor;
  rejectedBy: SummaryActor;
  revisionNote: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: number;
};

export type SummaryVersion = {
  version: number;
  changeType: "AI_GENERATED" | "PHYSICIAN_EDITED" | "REGENERATED" | "APPROVED" | "REJECTED";
  status: SummaryStatus;
  sections: SummarySections;
  actor: SummaryActor;
  timestamp: string;
  note?: string | null;
};

export type AuditEntry = {
  id: string;
  summaryId: string;
  caseId: string;
  actor: { id: string; name: string; role: string };
  action: string;
  details: unknown;
  timestamp: string;
};
