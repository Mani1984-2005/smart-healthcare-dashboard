import { Router } from 'express';
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

router.post('/', validatePatientCreate, createPatient);
router.get('/', validatePagination, listPatients);
router.get('/:id', validateUuidParam('id'), getPatient);
router.patch('/:id', validateUuidParam('id'), updatePatient);

// Cross-module views scoped to a patient (Lab, Billing, Timeline integrations)
router.get('/:patientId/lab-reports', validateUuidParam('patientId'), validatePagination, listPatientLabReports);
router.get('/:patientId/invoices', validateUuidParam('patientId'), listPatientInvoices);
router.get('/:patientId/timeline', validateUuidParam('patientId'), getPatientTimeline);

export default router;
