// =============================================================================
// Medicare Pro — Record access service (patient-data isolation)
//
// Enforces server-side ownership for patient-portal callers on every endpoint
// that reads prescription-derived data. Design rules:
//
//   * Ownership is NEVER inferred from request bodies, query parameters or
//     JWT role claims. The only relationship used is the schema-backed
//     `prescriptions.user_id -> users.id` link (the uploader of the record;
//     uploads store the authenticated user's id).
//   * Staff callers (any role other than the pure patient-portal role) pass
//     through — they are already gated by fine-grained permissions
//     (patient:read / prescription:read / billing:write / ...).
//   * Patient-portal callers (roles == ["patient"]) are denied unless the
//     record chains to a prescription THEY uploaded. Denials use 404
//     semantics so the API cannot be used as an existence oracle.
//
// KNOWN LIMITATION (documented, not implemented here): there is currently NO
// user-to-patient link in the schema (the `patients` table has no
// user_id/keycloak_subject_id column). Until that model exists (see
// docs/phase5-patient-user-link-design.md), patient-portal users have no
// access to patient records, invoices without a prescription link, or lab
// reports — those endpoints are staff-only. This is deliberate fail-closed
// behavior; do NOT "fix" it by trusting client-supplied patient ids.
// =============================================================================
import { ROLES } from '../config/roles.js';
import * as recordAccessRepo from '../repositories/recordAccess.repository.js';

// Repository indirection for hermetic tests (same pattern as rbac.service).
let activeRepo = recordAccessRepo;

export function __setRepositoryForTests(repo) {
  activeRepo = repo || recordAccessRepo;
}

/**
 * True only for a caller whose EVERY assigned role is the patient portal
 * role. Any staff role (doctor, nurse, receptionist, billing_clerk, ...)
 * routes through the staff permission gates instead.
 */
export function isPatientPortalCaller(req) {
  const roles = Array.isArray(req?.roles) ? req.roles : [];
  return roles.length > 0 && roles.every((r) => r === ROLES.PATIENT);
}

/**
 * Decide whether `req` may access prescription `prescriptionId`.
 * @returns {Promise<{allowed: boolean, staff?: boolean, owner?: boolean, notFound?: boolean}>}
 */
export async function checkPrescriptionAccess(req, prescriptionId) {
  if (!isPatientPortalCaller(req)) {
    return { allowed: true, staff: true };
  }
  const row = await activeRepo.findPrescriptionOwnerRow(prescriptionId);
  if (!row) return { allowed: false, notFound: true };
  const ownerId = row.user_id;
  if (ownerId && req.user?.id && String(ownerId) === String(req.user.id)) {
    return { allowed: true, owner: true };
  }
  return { allowed: false, notFound: true };
}

/**
 * Decide whether `req` may access invoice `invoiceId`.
 * Patient-portal callers may only reach invoices that belong to a
 * prescription THEY uploaded. Invoices without a prescription link are
 * unreachable for the patient portal (no user-to-patient model exists yet).
 */
export async function checkInvoiceAccess(req, invoiceId) {
  if (!isPatientPortalCaller(req)) {
    return { allowed: true, staff: true };
  }
  const invoice = await activeRepo.findInvoicePrescriptionRow(invoiceId);
  if (!invoice || !invoice.prescription_id) return { allowed: false, notFound: true };
  return checkPrescriptionAccess(req, invoice.prescription_id);
}

/** File locations for the authorized download route (staff or owner only). */
export async function getPrescriptionFilePaths(prescriptionId) {
  return activeRepo.findPrescriptionFileRow(prescriptionId);
}
