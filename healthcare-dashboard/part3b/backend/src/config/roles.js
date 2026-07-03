// Part 3B — Central RBAC vocabulary. Designed to mirror a Keycloak realm 1:1:
// each ROLE below should exist as a realm role in Keycloak, and each
// PERMISSION is a fine-grained capability mapped to one or more roles via
// role_permissions (see schema_workflow.sql). Keeping the mapping in the DB
// (not hardcoded here) lets ops re-map roles→permissions without a deploy.

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  BILLING_CLERK: 'billing_clerk',
  RECEPTIONIST: 'receptionist',
  AUDITOR: 'auditor',
  PATIENT: 'patient',
  SYSTEM: 'system',
});

export const PERMISSIONS = Object.freeze({
  PRESCRIPTION_READ: 'prescription:read',
  PRESCRIPTION_WRITE: 'prescription:write',
  PRESCRIPTION_APPROVE: 'prescription:approve',
  PATIENT_READ: 'patient:read',
  PATIENT_WRITE: 'patient:write',
  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
  BILLING_APPROVE: 'billing:approve',
  PHARMACY_DISPENSE: 'pharmacy:dispense',
  LAB_WRITE: 'lab:write',
  CLINICAL_ASSISTANT_USE: 'clinical_assistant:use',
  NOTIFICATION_MANAGE: 'notification:manage',
  APPROVAL_DECIDE: 'approval:decide',
  VERSION_HISTORY_READ: 'version_history:read',
  VERSION_HISTORY_RESTORE: 'version_history:restore',
  RBAC_MANAGE: 'rbac:manage',
  BIOMETRIC_MANAGE: 'biometric:manage',
});

// Fallback used only when the DB role_permissions table has no rows yet
// (fresh install before an admin curates the matrix). Mirrors a sane
// least-privilege default per role.
export const DEFAULT_ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.DOCTOR]: [
    PERMISSIONS.PRESCRIPTION_READ, PERMISSIONS.PRESCRIPTION_WRITE, PERMISSIONS.PRESCRIPTION_APPROVE,
    PERMISSIONS.PATIENT_READ, PERMISSIONS.PATIENT_WRITE, PERMISSIONS.LAB_WRITE,
    PERMISSIONS.CLINICAL_ASSISTANT_USE, PERMISSIONS.APPROVAL_DECIDE, PERMISSIONS.VERSION_HISTORY_READ,
  ],
  [ROLES.NURSE]: [
    PERMISSIONS.PRESCRIPTION_READ, PERMISSIONS.PATIENT_READ, PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.CLINICAL_ASSISTANT_USE, PERMISSIONS.VERSION_HISTORY_READ,
  ],
  [ROLES.PHARMACIST]: [
    PERMISSIONS.PRESCRIPTION_READ, PERMISSIONS.PHARMACY_DISPENSE, PERMISSIONS.APPROVAL_DECIDE,
    PERMISSIONS.VERSION_HISTORY_READ,
  ],
  [ROLES.LAB_TECHNICIAN]: [PERMISSIONS.LAB_WRITE, PERMISSIONS.PATIENT_READ, PERMISSIONS.VERSION_HISTORY_READ],
  [ROLES.BILLING_CLERK]: [
    PERMISSIONS.BILLING_READ, PERMISSIONS.BILLING_WRITE, PERMISSIONS.PATIENT_READ,
    PERMISSIONS.VERSION_HISTORY_READ,
  ],
  [ROLES.RECEPTIONIST]: [PERMISSIONS.PATIENT_READ, PERMISSIONS.PATIENT_WRITE, PERMISSIONS.PRESCRIPTION_READ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.PRESCRIPTION_READ, PERMISSIONS.BILLING_READ, PERMISSIONS.PATIENT_READ,
    PERMISSIONS.VERSION_HISTORY_READ,
  ],
  [ROLES.PATIENT]: [PERMISSIONS.PRESCRIPTION_READ, PERMISSIONS.BILLING_READ],
  [ROLES.SYSTEM]: Object.values(PERMISSIONS),
});
