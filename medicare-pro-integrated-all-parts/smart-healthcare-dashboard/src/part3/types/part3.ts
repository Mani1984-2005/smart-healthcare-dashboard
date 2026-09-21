// Part 3 — API types (mirror backend/part3 payloads). Self-contained: no imports from other modules.
export type DocType = "prescription" | "lab_report" | "discharge_summary" | "other";
export type DocStatus = "UPLOADED" | "OCR_IN_PROGRESS" | "OCR_COMPLETED" | "OCR_EMPTY" | "OCR_FAILED" | "EXTRACTED" | "ON_TIMELINE";

export interface Patient { id: string; displayName: string; ageYears: number; sex: string; synthetic: boolean; documentCount: number }

export interface DocumentRecord {
  id: string; patientId: string; docType: DocType; originalFilename: string; mimeType: string; sizeBytes: number; sha256: string;
  uploadedAt: string; updatedAt: string; uploadedBy: { id: string; role: string };
  origin: "SYNTHETIC_FIXTURE" | "USER_UPLOAD"; synthetic: boolean; fixtureId: string | null; status: DocStatus;
}

export interface OcrProvider { id: string; label: string; kind: "demo" | "real"; version: string }
export interface OcrResult {
  id: string; documentId: string; provider: OcrProvider; status: "completed" | "empty" | "failed"; text: string; textLength: number; pageCount: number;
  languageHints: string[]; detectedLanguages: string[] | null; providerConfidence: number | null; errorCode?: string; errorMessage?: string;
  startedAt: string; completedAt: string; durationMs: number;
}

export interface SourceSpan { start: number; end: number; line: number; text: string }
export type InterpretationStatus = "WITHIN_RANGE" | "OUTSIDE_RANGE" | "UNABLE_TO_DETERMINE";
export interface Interpretation { status: InterpretationStatus; direction: "BELOW" | "ABOVE" | null; reason: string; explanation: string }
export interface ReferenceRange { raw: string; kind: string; low: number | null; high: number | null; lowInclusive: boolean; highInclusive: boolean; unit: string | null; reason?: string }

interface EntityBase { id: string; verificationStatus: "EXTRACTED_UNVERIFIED"; unknownFields: string[]; source: SourceSpan }
export interface MedicationEntity extends EntityBase { kind: "medication"; fields: { name: string; form: string | null; dosage: string | null; frequency: string | null; directions: string | null } }
export interface DiagnosisEntity extends EntityBase { kind: "diagnosis"; fields: { name: string } }
export interface ProcedureEntity extends EntityBase { kind: "procedure"; fields: { name: string; details: string | null; date: { rawText: string; isoDate: string | null; format: string } | null } }
export interface InvestigationEntity extends EntityBase {
  kind: "investigation";
  fields: { testName: string; value: { raw: string; numeric: number | null; comparator: string | null }; unit: string | null; referenceRange: ReferenceRange | null; interpretation: Interpretation };
}
export interface DateEntity extends EntityBase { kind: "date"; fields: { role: string; label: string | null; rawText: string; isoDate: string | null; format: string; reason?: string; context?: string } }
export type ExtractedEntity = MedicationEntity | DiagnosisEntity | ProcedureEntity | InvestigationEntity | DateEntity;

export interface ExtractionWarning { code: string; message: string; line?: number }
export interface Extraction {
  id: string; documentId: string; ocrResultId: string; extractedAt: string; extractor: { id: string; version: string; kind: string };
  verificationStatus: "EXTRACTED_UNVERIFIED"; entities: ExtractedEntity[]; warnings: ExtractionWarning[];
  documentDate: { entityId: string; role: string; isoDate: string; rawText: string; source: SourceSpan } | null;
  stats: { medications: number; diagnoses: number; investigations: number; procedures: number; dates: number };
}

export interface Safety { verificationStatus: "EXTRACTED_UNVERIFIED"; generatedBy: string; notice: string }
export interface DocumentBundle { document: DocumentRecord; ocr: OcrResult | null; extraction: Extraction | null; safety: Safety }

export type EventType = "DOCUMENT" | "CLINICAL_EVENT" | "PROCEDURE" | "DIAGNOSIS" | "MEDICATION" | "INVESTIGATION";
export interface TimelineEvent {
  id: string; patientId: string; documentId: string; docType: DocType; entityId: string | null; eventType: EventType;
  eventDate: string | null; dateBasis: string; dateSource: (SourceSpan & { documentId: string; ocrResultId: string; rawText: string }) | null;
  title: string; details: Record<string, unknown>;
  source: { documentId: string; ocrResultId: string; start: number | null; end: number | null; line: number | null; text: string | null };
  verificationStatus: "EXTRACTED_UNVERIFIED"; synthetic: boolean; createdAt: string;
  interpretationStatus?: InterpretationStatus; interpretationDirection?: "BELOW" | "ABOVE" | null;
}
export interface TimelineResponse {
  patientId: string; order: "asc" | "desc"; events: TimelineEvent[]; undated: TimelineEvent[];
  counts: { dated: number; undated: number; byType: Record<string, number> }; safety: Safety;
}
export interface TimelineQuery { order?: "asc" | "desc"; types?: EventType[]; from?: string; to?: string }

export interface Fixture {
  id: string; title: string; description: string; docType: DocType; patientId: string; mimeType: string; sizeBytes: number; synthetic: true;
  ingestedDocumentId: string | null; ingestedStatus: DocStatus | null;
}
export interface DocumentList { items: DocumentRecord[]; total: number; page: number; limit: number }
export interface AuditEvent {
  id: string; timestamp: string; actor: { id: string; role: string } | null; action: string; resourceType: string; resourceId: string;
  patientId: string | null; outcome: string; requestId: string | null; details: Record<string, unknown>;
}
export interface IngestResult { document: DocumentRecord; duplicate: boolean }
