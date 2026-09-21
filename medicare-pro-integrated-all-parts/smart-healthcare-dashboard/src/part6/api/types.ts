// Types for the Part 6 API. Part 6 has its own types: it does not import from any other MediCare Pro module.
export type Role = "PATIENT" | "DOCTOR" | "HOSPITAL_ADMIN" | "SYSTEM_ADMIN";

export interface P6User {
  id: string;
  displayName: string;
  role: Role;
  orgId: string | null;
  orgName: string | null;
  patientId: string | null;
}
export interface DemoUser extends P6User {
  blurb: string;
}
export interface Session {
  token: string;
  expiresAt: string;
  user: P6User;
}

export type ConsentStatus = "Pending" | "Granted" | "Denied" | "Revoked" | "Expired";
export interface Consent {
  id: string;
  patientId: string;
  patientDisplay: string | null;
  origin: "provider-request" | "patient-initiated";
  requester: { orgId: string; orgName: string; userId: string; userName: string };
  recipientOrgId: string;
  recipientOrgName: string;
  purpose: string;
  purposeLabel: string;
  requestedCategories: string[];
  grantedCategories: string[];
  requestedDurationDays: number;
  durationDays: number | null;
  status: ConsentStatus;
  active: boolean;
  daysRemaining: number | null;
  createdAt: string;
  decidedAt: string | null;
  grantedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  denialReason: string | null;
  note: string | null;
  history: { at: string; status: ConsentStatus; by: string }[];
}

export interface Catalog {
  categories: { key: string; label: string; description: string }[];
  purposes: { key: string; label: string }[];
  statuses: ConsentStatus[];
  notShareable: { key: string; label: string; reason: string }[];
  limits: { maxDurationDays: number; defaultDurationDays: number };
  recipients: { id: string; name: string }[];
}

export interface PatientRow {
  id: string;
  displayName: string;
  relation: "self" | "custodian" | "directory" | "masked";
  custodianOrgId: string;
  custodianOrgName: string | null;
}

export interface Identity {
  demoLabel: string;
  internal: { label: string; patientId: string };
  abha: { status: string; statusLabel: string; identifier: string | null; maskedNumber: string; verification: string; verifiedAt: string | null; note: string };
  separateIdentifiersNote: string;
  displayName: string;
  gender: string | null;
  birthDate: string | null;
  custodian: { id: string; name: string | null };
  view: "self" | "custodian" | "masked";
}

export type FhirJson = Record<string, unknown>;

export interface ValidationCheck {
  id: string;
  label: string;
  status: "passed" | "failed" | "skipped";
  applicable?: boolean;
}
export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
}
export interface ValidationResult {
  validator: string;
  disclaimer: string;
  status: "VALID" | "INVALID";
  resourceType: string | null;
  resourceId: string | null;
  checks: ValidationCheck[];
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  bundle?: {
    type: string | null;
    entryCount: number;
    resourceTypes: Record<string, number>;
    entries: { index: number; resourceType: string | null; id: string | null; status: string; issueCount: number }[];
    referencesChecked: number;
  };
}

export interface ResourceSummary {
  key: string;
  resourceType: string;
  id: string;
  patientId: string;
  category: string | null;
  generatedAt: string;
  generatedBy: { userId: string; name: string };
  validation: { status: string; errorCount: number };
}

export interface BundleSummary {
  id: string;
  patientId: string;
  createdAt: string;
  createdBy: { userId: string; name: string };
  type: string;
  entryCount: number;
  resourceTypes: Record<string, number>;
  validation: { status: string; errorCount: number };
  checksum: string;
}

export interface ShareRecord {
  id: string;
  consentId: string;
  patientId: string;
  sharedAt: string;
  sharedBy: { userId: string; name: string; orgId: string };
  side: "custodian-release" | "recipient-pull";
  recipientOrgId: string;
  recipientOrgName: string;
  purpose: string;
  categories: string[];
  bundleId: string;
  resourceCounts: Record<string, number>;
  resourceIds: string[];
  redactedReferences: number;
}

export interface ShareResult {
  label: string;
  share: ShareRecord;
  bundle: FhirJson;
  validation: { status: string; errorCount: number };
  minimisation: { categoriesShared: string[]; categoriesWithheld: string[]; redactions: { path: string; reference: string }[]; note: string };
}

export interface AuditEntry {
  id: string;
  seq: number;
  ts: string;
  actor: { userId?: string | null; name: string; role: string | null; orgId?: string | null };
  action: string;
  label: string;
  category: string;
  securityEvent: boolean;
  resource: { type: string; id: string | null } | null;
  patientId: string | null;
  consentId: string | null;
  status: "success" | "denied" | "failure";
  reason: string | null;
  metadata: Record<string, unknown>;
}

export interface Overview {
  scope: Role;
  modes: { abdmMode: string; fhirMode: string; fhirVersion: string; storage: string; demoAuth: boolean; tokenSecretSource: string };
  counts: { fhirResources: number; fhirBundles: number; activeConsents: number; pendingRequests: number; sharedRecords: number; sharedResources: number; securityEvents: number };
  validation: { total: number; valid: number; rate: number | null };
  recentActivity: AuditEntry[];
}

export interface PermissionMatrix {
  roles: Role[];
  rows: { permission: string; label: string; access: Record<Role, string | null> }[];
}
