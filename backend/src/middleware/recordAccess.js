// =============================================================================
// Medicare Pro — Record-access middleware
//
// Route-level ownership gates that run AFTER authentication and permission
// checks. For patient-portal callers they enforce the schema-backed
// ownership chain (see services/recordAccess.service.js); for staff callers
// they pass through. Denials are 404 ("not found") on purpose so the API
// cannot be used to discover which record ids exist.
// =============================================================================
import { AppError } from '../utils/AppError.js';
import {
  checkPrescriptionAccess,
  checkInvoiceAccess,
  isPatientPortalCaller,
} from '../services/recordAccess.service.js';

export function requirePrescriptionAccess(param = 'id') {
  return async (req, res, next) => {
    try {
      const result = await checkPrescriptionAccess(req, req.params[param]);
      if (!result.allowed) {
        return next(AppError.notFound('Prescription not found'));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireInvoiceAccess(param = 'invoiceId') {
  return async (req, res, next) => {
    try {
      const result = await checkInvoiceAccess(req, req.params[param]);
      if (!result.allowed) {
        return next(AppError.notFound('Invoice not found'));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// Phase 2F (approval A.2): patient-record authorization enforced INDEPENDENTLY
// of the route's role/permission gate. Ownership cannot be scoped by patient
// id (there is no user<->patient link in the schema — see the service), so a
// pure patient-portal caller is denied outright here rather than matched; a
// principal that resolved NO roles is denied too (fail closed). Because this
// layer is separate from requireRole/requirePermission, loosening the sibling
// gate on a route would still leave the portal blocked.
export function requireStaffCaller(req, res, next) {
  const roles = req.roles || [];
  if (roles.length === 0 || isPatientPortalCaller(req)) {
    return next(new AppError('Staff-only resource', 403, 'FORBIDDEN'));
  }
  return next();
}
