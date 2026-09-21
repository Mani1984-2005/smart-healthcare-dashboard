import type { ConsentStatus, Role } from "./api/types";
import { ApiError } from "./api/client";

export const ROLE_LABEL: Record<Role, string> = {
  PATIENT: "Patient",
  DOCTOR: "Doctor",
  HOSPITAL_ADMIN: "Hospital Admin",
  SYSTEM_ADMIN: "System Admin",
};

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export const consentVariant = (s: ConsentStatus): "info" | "success" | "warning" | "danger" | "neutral" =>
  ({ Pending: "warning", Granted: "success", Denied: "danger", Revoked: "danger", Expired: "neutral" }[s] as "warning");

export const CATEGORY_LABEL: Record<string, string> = {
  "clinical-history": "Clinical History",
  "lab-reports": "Lab Reports",
  medications: "Medications",
  allergies: "Allergies",
  "diagnostic-reports": "Diagnostic Reports",
  documents: "Documents",
};

export interface ErrorInfo {
  tone: "danger" | "warning" | "info";
  heading: string;
  message: string;
}

/** Map an API error to the user-facing state names (Unauthorized, Forbidden, Consent Required, Expired ...). */
export function describeError(e: ApiError): ErrorInfo {
  switch (e.code) {
    case "UNAUTHENTICATED":
      return { tone: "danger", heading: "UNAUTHORIZED", message: e.message || "Please sign in to continue." };
    case "FORBIDDEN":
    case "NOT_CUSTODIAN":
      return { tone: "danger", heading: "ACCESS DENIED", message: e.message };
    case "CONSENT_REQUIRED":
      return { tone: "warning", heading: "EXPORT BLOCKED", message: "Valid consent is required before this data can be shared." };
    case "CONSENT_REVOKED":
    case "CONSENT_NOT_ACTIVE":
      return { tone: "warning", heading: "ACCESS BLOCKED", message: "Consent is no longer active." };
    case "CONSENT_EXPIRED":
      return { tone: "warning", heading: "CONSENT EXPIRED", message: "This consent has expired. A new consent is required." };
    case "CONSENT_PENDING":
    case "CONSENT_DENIED":
    case "CONSENT_NOT_FOR_CALLER":
    case "SCOPE_EXCEEDED":
      return { tone: "warning", heading: "ACCESS BLOCKED", message: e.message };
    case "VALIDATION_FAILED":
      return { tone: "warning", heading: "VALIDATION FAILED", message: e.message };
    case "INVALID_STATE":
      return { tone: "warning", heading: "NOT ALLOWED IN THIS STATE", message: e.message };
    case "RATE_LIMITED":
      return { tone: "warning", heading: "TOO MANY REQUESTS", message: e.message };
    case "NOT_FOUND":
      return { tone: "info", heading: "NOT FOUND", message: e.message };
    case "NETWORK":
      return { tone: "danger", heading: "SERVICE UNREACHABLE", message: e.message };
    default:
      return { tone: "danger", heading: "SOMETHING WENT WRONG", message: e.message || "Please try again." };
  }
}

export function detailList(e: ApiError): string[] {
  const d = e.details;
  if (Array.isArray(d)) return d.map(String);
  if (d && typeof d === "object" && Array.isArray((d as { notConsented?: unknown }).notConsented)) {
    return [`Not consented: ${((d as { notConsented: string[] }).notConsented).map((k) => CATEGORY_LABEL[k] ?? k).join(", ")}`];
  }
  return [];
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/fhir+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const selectClass = "block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
