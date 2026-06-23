// src/constants/roles.js

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  DOCTOR: "doctor",
  NURSE: "nurse",
  LAB_TECHNICIAN: "lab_technician",
  RADIOLOGIST: "radiologist",
  PHARMACIST: "pharmacist",
  RECEPTIONIST: "receptionist",
  BILLING_STAFF: "billing_staff",
  PATIENT: "patient",
  GUEST: "guest",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Administrator",
  [ROLES.ADMIN]: "Administrator",
  [ROLES.DOCTOR]: "Doctor",
  [ROLES.NURSE]: "Nurse",
  [ROLES.LAB_TECHNICIAN]: "Lab Technician",
  [ROLES.RADIOLOGIST]: "Radiologist",
  [ROLES.PHARMACIST]: "Pharmacist",
  [ROLES.RECEPTIONIST]: "Receptionist",
  [ROLES.BILLING_STAFF]: "Billing Staff",
  [ROLES.PATIENT]: "Patient",
  [ROLES.GUEST]: "Guest",
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 90,
  [ROLES.DOCTOR]: 80,
  [ROLES.RADIOLOGIST]: 75,
  [ROLES.PHARMACIST]: 70,
  [ROLES.NURSE]: 60,
  [ROLES.LAB_TECHNICIAN]: 60,
  [ROLES.BILLING_STAFF]: 50,
  [ROLES.RECEPTIONIST]: 40,
  [ROLES.PATIENT]: 10,
  [ROLES.GUEST]: 0,
};

export const ROLE_GROUPS = {
  CLINICAL: [ROLES.DOCTOR, ROLES.NURSE, ROLES.RADIOLOGIST],
  LABORATORY: [ROLES.LAB_TECHNICIAN],
  ADMINISTRATIVE: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.BILLING_STAFF],
  PHARMACY: [ROLES.PHARMACIST],
  MANAGEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  PATIENTS: [ROLES.PATIENT],
};

export const DEFAULT_ROUTES_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: "/admin/dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.DOCTOR]: "/doctor/dashboard",
  [ROLES.NURSE]: "/nurse/dashboard",
  [ROLES.LAB_TECHNICIAN]: "/lab/dashboard",
  [ROLES.RADIOLOGIST]: "/radiology/dashboard",
  [ROLES.PHARMACIST]: "/pharmacy/dashboard",
  [ROLES.RECEPTIONIST]: "/reception/dashboard",
  [ROLES.BILLING_STAFF]: "/billing/dashboard",
  [ROLES.PATIENT]: "/patient/dashboard",
  [ROLES.GUEST]: "/login",
};

/**
 * Check if a given role outranks another.
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
export const isHigherRole = (roleA, roleB) => {
  return (ROLE_HIERARCHY[roleA] ?? 0) > (ROLE_HIERARCHY[roleB] ?? 0);
};

/**
 * Returns true if the role belongs to a clinical group.
 * @param {string} role
 * @returns {boolean}
 */
export const isClinicalRole = (role) => ROLE_GROUPS.CLINICAL.includes(role);

/**
 * Returns true if the role has management-level access.
 * @param {string} role
 * @returns {boolean}
 */
export const isManagementRole = (role) =>
  ROLE_GROUPS.MANAGEMENT.includes(role);







