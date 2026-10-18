// src/constants/permissions.js

import { ROLES } from "./roles";

// ─── Permission Keys ──────────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Patients
  PATIENT_VIEW: "patient:view",
  PATIENT_CREATE: "patient:create",
  PATIENT_EDIT: "patient:edit",
  PATIENT_DELETE: "patient:delete",

  // Appointments
  APPOINTMENT_VIEW: "appointment:view",
  APPOINTMENT_CREATE: "appointment:create",
  APPOINTMENT_EDIT: "appointment:edit",
  APPOINTMENT_CANCEL: "appointment:cancel",

  // Laboratory
  LAB_ORDER_VIEW: "lab_order:view",
  LAB_ORDER_CREATE: "lab_order:create",
  LAB_ORDER_EDIT: "lab_order:edit",
  LAB_ORDER_DELETE: "lab_order:delete",
  LAB_RESULT_VIEW: "lab_result:view",
  LAB_RESULT_ENTER: "lab_result:enter",
  LAB_RESULT_APPROVE: "lab_result:approve",
  LAB_RESULT_PRINT: "lab_result:print",

  // Reports
  REPORT_VIEW: "report:view",
  REPORT_GENERATE: "report:generate",
  REPORT_EXPORT: "report:export",
  REPORT_DELETE: "report:delete",

  // Prescriptions
  PRESCRIPTION_VIEW: "prescription:view",
  PRESCRIPTION_CREATE: "prescription:create",
  PRESCRIPTION_DISPENSE: "prescription:dispense",

  // Billing
  BILLING_VIEW: "billing:view",
  BILLING_CREATE: "billing:create",
  BILLING_EDIT: "billing:edit",
  BILLING_REFUND: "billing:refund",

  // Users & Roles
  USER_VIEW: "user:view",
  USER_CREATE: "user:create",
  USER_EDIT: "user:edit",
  USER_DELETE: "user:delete",
  ROLE_ASSIGN: "role:assign",

  // System
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",
  AUDIT_LOG_VIEW: "audit_log:view",
};

// ─── Role → Permissions Map ───────────────────────────────────────────────────

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // all permissions

  [ROLES.ADMIN]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_CREATE,
    PERMISSIONS.PATIENT_EDIT,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_EDIT,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.LAB_ORDER_VIEW,
    PERMISSIONS.LAB_ORDER_CREATE,
    PERMISSIONS.LAB_ORDER_EDIT,
    PERMISSIONS.LAB_RESULT_VIEW,
    PERMISSIONS.LAB_RESULT_PRINT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.PRESCRIPTION_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.BILLING_EDIT,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.AUDIT_LOG_VIEW,
  ],

  [ROLES.DOCTOR]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_EDIT,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_EDIT,
    PERMISSIONS.LAB_ORDER_VIEW,
    PERMISSIONS.LAB_ORDER_CREATE,
    PERMISSIONS.LAB_ORDER_EDIT,
    PERMISSIONS.LAB_RESULT_VIEW,
    PERMISSIONS.LAB_RESULT_PRINT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.PRESCRIPTION_VIEW,
    PERMISSIONS.PRESCRIPTION_CREATE,
  ],

  [ROLES.NURSE]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_EDIT,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.LAB_ORDER_VIEW,
    PERMISSIONS.LAB_RESULT_VIEW,
    PERMISSIONS.PRESCRIPTION_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],

  [ROLES.LAB_TECHNICIAN]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.LAB_ORDER_VIEW,
    PERMISSIONS.LAB_ORDER_EDIT,
    PERMISSIONS.LAB_RESULT_VIEW,
    PERMISSIONS.LAB_RESULT_ENTER,
    PERMISSIONS.LAB_RESULT_PRINT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_GENERATE,
  ],

  [ROLES.RADIOLOGIST]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.LAB_ORDER_VIEW,
    PERMISSIONS.LAB_RESULT_VIEW,
    PERMISSIONS.LAB_RESULT_ENTER,
    PERMISSIONS.LAB_RESULT_APPROVE,
    PERMISSIONS.LAB_RESULT_PRINT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_GENERATE,
  ],

  [ROLES.PHARMACIST]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PRESCRIPTION_VIEW,
    PERMISSIONS.PRESCRIPTION_DISPENSE,
    PERMISSIONS.BILLING_VIEW,
  ],

  [ROLES.RECEPTIONIST]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_CREATE,
    PERMISSIONS.PATIENT_EDIT,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_EDIT,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.BILLING_VIEW,
  ],

  [ROLES.BILLING_STAFF]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.BILLING_EDIT,
    PERMISSIONS.BILLING_REFUND,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],

  [ROLES.PATIENT]: [
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.LAB_RESULT_VIEW,
    PERMISSIONS.PRESCRIPTION_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],

  [ROLES.GUEST]: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the list of permissions for a given role.
 * @param {string} role
 * @returns {string[]}
 */
export const getPermissionsForRole = (role) =>
  ROLE_PERMISSIONS[role] ?? [];

/**
 * Checks if a role has a specific permission.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export const hasPermission = (role, permission) =>
  getPermissionsForRole(role).includes(permission);

/**
 * Checks if a role has ALL of the given permissions.
 * @param {string} role
 * @param {string[]} permissionList
 * @returns {boolean}
 */
export const hasAllPermissions = (role, permissionList) =>
  permissionList.every((p) => hasPermission(role, p));

/**
 * Checks if a role has ANY of the given permissions.
 * @param {string} role
 * @param {string[]} permissionList
 * @returns {boolean}
 */
export const hasAnyPermission = (role, permissionList) =>
  permissionList.some((p) => hasPermission(role, p));