// Role-based access control: ONE table, used both to enforce access (routes call requirePermission)
// and to render the permission matrix in the UI. If a permission is listed here it is enforced;
// "scope" text describes the object-level rule the owning service applies on top of the role check.
import { ROLES } from "../domain/constants.js";

const { PATIENT, DOCTOR, HOSPITAL_ADMIN, SYSTEM_ADMIN } = ROLES;

export const PERMISSIONS = Object.freeze({
  "overview.view": {
    label: "View overview dashboard",
    roles: { [PATIENT]: "Own data", [DOCTOR]: "Org data", [HOSPITAL_ADMIN]: "Org data", [SYSTEM_ADMIN]: "Metadata" },
  },
  "patients.list": {
    label: "List patients visible to me",
    roles: { [PATIENT]: "Self", [DOCTOR]: "Custody + directory", [HOSPITAL_ADMIN]: "Custody + directory", [SYSTEM_ADMIN]: "Masked" },
  },
  "identity.view": {
    label: "View patient identity (ABHA demo)",
    roles: { [PATIENT]: "Own", [DOCTOR]: "Custodian org", [HOSPITAL_ADMIN]: "Custodian org", [SYSTEM_ADMIN]: "Masked" },
  },
  "patients.directory": {
    label: "Search patient directory (minimal fields)",
    roles: { [DOCTOR]: "Minimal", [HOSPITAL_ADMIN]: "Minimal" },
  },
  "fhir.generate": {
    label: "Generate FHIR resources / bundles",
    roles: { [DOCTOR]: "Custodian org", [HOSPITAL_ADMIN]: "Custodian org" },
  },
  "fhir.read": {
    label: "Read generated FHIR resources / bundles",
    roles: { [DOCTOR]: "Custodian org", [HOSPITAL_ADMIN]: "Custodian org" },
  },
  "fhir.validate": {
    label: "Validate FHIR JSON",
    roles: { [DOCTOR]: "Yes", [HOSPITAL_ADMIN]: "Yes", [SYSTEM_ADMIN]: "Yes" },
  },
  "consent.request": {
    label: "Request patient records (consent request)",
    roles: { [DOCTOR]: "Non-custodian org", [HOSPITAL_ADMIN]: "Non-custodian org" },
  },
  "consent.view": {
    label: "View consents",
    roles: { [PATIENT]: "Own", [DOCTOR]: "Org", [HOSPITAL_ADMIN]: "Org", [SYSTEM_ADMIN]: "Metadata" },
  },
  "consent.decide": {
    label: "Grant / deny consent",
    roles: { [PATIENT]: "Own" },
  },
  "consent.patient_share": {
    label: "Share own record with a recipient (patient-initiated)",
    roles: { [PATIENT]: "Own" },
  },
  "consent.revoke": {
    label: "Revoke consent",
    roles: { [PATIENT]: "Own", [HOSPITAL_ADMIN]: "Org + reason", [SYSTEM_ADMIN]: "Reason required" },
  },
  "record.share": {
    label: "Share / export records (consent-gated)",
    roles: { [DOCTOR]: "Under consent", [HOSPITAL_ADMIN]: "Under consent" },
  },
  "share.view": {
    label: "View data-share history",
    roles: { [PATIENT]: "Own", [DOCTOR]: "Org", [HOSPITAL_ADMIN]: "Org", [SYSTEM_ADMIN]: "Metadata" },
  },
  "audit.view": {
    label: "View audit logs",
    roles: { [PATIENT]: "Limited", [DOCTOR]: "Limited", [HOSPITAL_ADMIN]: "Org", [SYSTEM_ADMIN]: "All" },
  },
  "audit.verify": {
    label: "Verify audit-log integrity",
    roles: { [SYSTEM_ADMIN]: "Yes" },
  },
  "security.view": {
    label: "View security posture & events",
    roles: { [HOSPITAL_ADMIN]: "Org events", [SYSTEM_ADMIN]: "All" },
  },
  "security.manage": {
    label: "Security settings, demo clock, demo reset",
    roles: { [SYSTEM_ADMIN]: "Yes" },
  },
});

export const can = (role, permission) => Boolean(PERMISSIONS[permission]?.roles?.[role]);
export const scopeOf = (role, permission) => PERMISSIONS[permission]?.roles?.[role] ?? null;

export function permissionMatrix() {
  const roles = Object.values(ROLES);
  return {
    roles,
    rows: Object.entries(PERMISSIONS).map(([key, def]) => ({
      permission: key,
      label: def.label,
      access: Object.fromEntries(roles.map((r) => [r, def.roles[r] ?? null])),
    })),
  };
}
