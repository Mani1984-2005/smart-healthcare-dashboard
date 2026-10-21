import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission, requireRole } from '../middleware/authorize.js';
import { PERMISSIONS, ROLES } from '../config/roles.js';
import { validateUuidParam, validateLabReportCreate } from '../middleware/validate.js';
import { createLabReport, getLabReport } from '../controllers/labReports.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', requirePermission(PERMISSIONS.LAB_WRITE), validateLabReportCreate, createLabReport);
// Phase 2F (approval A.3): possession of a UUID plus the broad patient:read
// no longer unlocks a single report — access is the explicit clinical-role
// policy (same set as the patient-scoped lab list in patients.routes.js).
// prescription:read (held by the patient portal) is still deliberately NOT
// accepted here: lab reports are keyed to patients and no user<->patient link
// exists yet. Patients can reach their own prescription-linked reports through
// /api/prescriptions/:id/lab-reports, which is ownership-gated.
const LAB_REPORT_CLINICAL_ROLES = [
  ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECHNICIAN, ROLES.ADMIN, ROLES.SYSTEM,
];
router.get('/:id', requireRole(...LAB_REPORT_CLINICAL_ROLES), validateUuidParam('id'), getLabReport);

export default router;

