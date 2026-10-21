import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission, requireRole } from '../middleware/authorize.js';
import { PERMISSIONS, ROLES } from '../config/roles.js';
import { requireStaffCaller } from '../middleware/recordAccess.js';
import { validateUuidParam, validatePatientCreate, validatePagination } from '../middleware/validate.js';
import {
  createPatient,
  updatePatient,
  getPatient,
  listPatients,
} from '../controllers/patients.controller.js';
import { listPatientLabReports } from '../controllers/labReports.controller.js';
import { listPatientInvoices } from '../controllers/billing.controller.js';
import { getPatientTimeline } from '../controllers/timeline.controller.js';

const router = Router();

router.use(authenticate);

// Phase 2F (approval A.1/A.2): lab-report and timeline views under a patient
// are clinical data. Explicit clinical-role policy — the approval's fallback,
// because the proposed lab:write OR patient:write pairing failed its own
// condition: patient:write is the front-desk "create/update patients"
// permission (receptionist holds it) and does not justify clinical reads, and
// no lab:read permission exists (adding one would be a role/schema change
// outside this phase's scope).
const PATIENT_CLINICAL_ROLES = [
  ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECHNICIAN, ROLES.ADMIN, ROLES.SYSTEM,
];

router.post('/', requirePermission(PERMISSIONS.PATIENT_WRITE), validatePatientCreate, createPatient);
router.get('/', requirePermission(PERMISSIONS.PATIENT_READ), validatePagination, listPatients);
router.get('/:id', requirePermission(PERMISSIONS.PATIENT_READ), validateUuidParam('id'), getPatient);
router.patch('/:id', requirePermission(PERMISSIONS.PATIENT_WRITE), validateUuidParam('id'), updatePatient);

// Cross-module lab view scoped to a patient. Phase 2F (approval A.1): gated
// on the clinical-role set above instead of the broad patient:read —
// receptionist, billing_clerk and auditor no longer read a patient's lab list.
router.get('/:patientId/lab-reports', requireRole(...PATIENT_CLINICAL_ROLES), validateUuidParam('patientId'), validatePagination, listPatientLabReports);
// Invoices are billing data: since finding R1 this route requires
// patient:read AND billing:read (requirePermission is AND-semantics), which
// narrows it to billing-facing staff:
//   * the patient portal holds billing:read but NOT patient:read, so it stays
//     out — there is no user<->patient link to scope invoices by patient id
//     (see services/recordAccess.service.js). Patient-portal invoice access
//     goes through GET /api/invoices/:invoiceId, ownership-gated per invoice;
//   * clinical/front-desk roles without billing:read (doctor, nurse,
//     lab_technician, receptionist) no longer read invoice lists.
router.get('/:patientId/invoices', requirePermission(PERMISSIONS.PATIENT_READ, PERMISSIONS.BILLING_READ), validateUuidParam('patientId'), listPatientInvoices);
// Phase 2F (approval A.2): clinical-role gate (set above) PLUS an independent
// patient-record layer (requireStaffCaller) — the patient-portal denial does
// not depend on the role gate alone. Front-desk, billing and audit roles no
// longer read timelines either.
router.get('/:patientId/timeline', requireStaffCaller, requireRole(...PATIENT_CLINICAL_ROLES), validateUuidParam('patientId'), getPatientTimeline);

export default router;

