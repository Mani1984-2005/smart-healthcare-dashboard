import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
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

router.post('/', requirePermission(PERMISSIONS.PATIENT_WRITE), validatePatientCreate, createPatient);
router.get('/', requirePermission(PERMISSIONS.PATIENT_READ), validatePagination, listPatients);
router.get('/:id', requirePermission(PERMISSIONS.PATIENT_READ), validateUuidParam('id'), getPatient);
router.patch('/:id', requirePermission(PERMISSIONS.PATIENT_WRITE), validateUuidParam('id'), updatePatient);

// Cross-module views scoped to a patient (Lab, Billing, Timeline integrations)
router.get('/:patientId/lab-reports', requirePermission(PERMISSIONS.PATIENT_READ), validateUuidParam('patientId'), validatePagination, listPatientLabReports);
router.get('/:patientId/invoices', requireAnyPermission(PERMISSIONS.PATIENT_READ, PERMISSIONS.BILLING_READ), validateUuidParam('patientId'), listPatientInvoices);
router.get('/:patientId/timeline', requirePermission(PERMISSIONS.PATIENT_READ), validateUuidParam('patientId'), getPatientTimeline);

export default router;

