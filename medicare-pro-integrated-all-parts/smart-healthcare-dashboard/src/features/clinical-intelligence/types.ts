// SIH Part 4 — Clinical Intelligence: frontend view of the backend data contract.
// Mirrors backend/clinical-intelligence/contracts/schemas.js and the analysis object returned by POST /analyze.

export type ReviewDecision = "accepted" | "rejected" | "modified";
export type ReviewState =
  | { state: "not_required" }
  | { state: "needs_review" }
  | { state: "reviewed"; decision: ReviewDecision; note: string | null; modifiedText: string | null; reviewer: { id: string; name: string; role: string }; reviewedAt: string };

export type Origin = "rules" | "ai";
export type Severity = "high" | "moderate" | "low" | "info";
export type Urgency = "immediate_review" | "prompt_review" | "routine_review";
export type FindingKind = "red_flag" | "consideration" | "medication" | "investigation" | "data_quality" | "information_gap";

export interface Evidence { ref: string; label: string; date: string | null }

export interface Finding {
  id: string;
  kind: FindingKind;
  category: string;
  origin: Origin;
  ruleId: string;
  title: string;
  statement: string;
  severity: Severity;
  urgency?: Urgency;
  explanation: { what: string; why: string; sources: string[]; missing: string[]; action: string };
  evidenceRefs: string[];
  evidence: Evidence[];
  reviewRequired: boolean;
  reviewNote: string;
  extra?: { evidenceCoverage?: { matched: number; recognised: number }; verification?: string[]; supporting?: string[] };
  review: ReviewState;
}

export interface SummaryLine { text: string; sourceRefs: string[] }
export interface SummarySection { status: "provided" | "not_provided" | "none_known"; display?: string; items: SummaryLine[] }
export interface AiNarrative { origin: "ai"; provider: string; model: string | null; text: string; citedRefs: string[]; evidence: Evidence[]; reviewRequired: boolean; review: ReviewState }

export interface Summary {
  origin: "record";
  asOf: string | null;
  presentingComplaint: SummarySection;
  symptoms: SummarySection;
  documentedAbsent: SummarySection;
  relevantHistory: SummarySection;
  currentMedications: SummarySection;
  allergies: SummarySection;
  vitals: SummarySection;
  examination: SummarySection;
  investigations: SummarySection;
  followUp: SummarySection;
  aiNarrative: AiNarrative | null;
  review: ReviewState;
}

export type ResultStatus = "within_range" | "above_range" | "below_range" | "not_interpreted";
export interface InvestigationResult {
  ref: string; name: string; value: number | string; unit: string | null;
  referenceRange: { low?: number; high?: number; criticalLow?: number; criticalHigh?: number; source: "lab_reported" } | null;
  collectedAt: string; resultStatus: string; status: ResultStatus; reasons: string[];
}
export interface Trend {
  key: string; name: string; unit: string; direction: "increased" | "decreased" | "unchanged";
  deltaAbs: number; deltaPct: number | null; rangeShift: string;
  points: { ref: string; date: string; value: number; status: ResultStatus }[];
}

export interface TimelineEvent { id: string; date: string; kind: string; title: string; detail: string | null; sourceRef: string; encounterId: string | null }

export interface AiMeta { requested: boolean; provider: string; kind: string; model: string | null; status: "not_requested" | "not_configured" | "used" | "rejected" | "failed" | "timeout"; reason: string | null }

export interface Analysis {
  analysisId: string;
  generatedAt: string;
  mode: "demo" | "live";
  origin: string;
  disclaimer: string;
  ruleset: { id: string; version: string; status: string };
  inputHash: string;
  inputSummary: Record<string, number>;
  patient: { id: string; displayName: string | null; ageYears: number | null; sex: string | null };
  summary: Summary;
  findings: Finding[];
  investigations: { results: InvestigationResult[]; trends: Trend[] };
  medicationChecks: { performed: Record<string, boolean>; notPerformed: { check: string; reason: string }[] };
  notEvaluated: string[];
  timeline: TimelineEvent[];
  ai: AiMeta;
  reviewItems: string[];
  reviewStatus: "needs_review" | "reviewed";
  reviewProgress: { total: number; completed: number };
}

export interface ContextList<T> { status: "documented" | "none_known" | "not_provided"; items: T[] }
export interface ClinicalContext {
  patient: { id: string; displayName?: string; ageYears?: number; sex?: string };
  encounters: {
    id: string; date: string; type?: string; chiefComplaint?: string; notes?: string;
    symptoms: { name: string; present: boolean | "unknown"; duration?: string; severity?: string }[];
    vitals?: Record<string, { value: number; unit?: string }>;
    examination: { system?: string; finding: string; abnormal?: boolean | "unknown" }[];
    followUp?: { date?: string; instruction: string };
  }[];
  allergies: ContextList<{ substance: string; reaction?: string; severity?: string }>;
  medications: ContextList<{ name: string; dose?: string; frequency?: string; status: string }>;
  history: ContextList<{ kind: string; text: string; since?: string }>;
  investigations: { name: string; value: number | string; unit?: string; referenceRange?: { low?: number; high?: number }; collectedAt: string }[];
}

export interface ServiceStatus { demoMode: boolean; auth: "demo" | "firebase"; ai: { provider: string }; disclaimer: string }
export interface PatientListItem { id: string; label: string; scenario: string; description: string; synthetic: boolean }
export interface Session { token: string; role: string; name: string }
