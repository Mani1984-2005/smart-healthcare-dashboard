import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../config/roles.js';
import { validateUuidParam, validateLinkPatientRequest, validateDispenseRequest } from '../middleware/validate.js';
import { linkPrescriptionToPatient } from '../controllers/patients.controller.js';
import { dispenseMedicine, listDispensationsForPrescription } from '../controllers/pharmacy.controller.js';
import { listPrescriptionLabReports } from '../controllers/labReports.controller.js';
import { generateInvoice } from '../controllers/billing.controller.js';

// Mounted at /api/prescriptions in server.js, alongside prescriptions.routes.js
// and aiAnalysis.routes.js. Groups every Part 3A endpoint that hangs off a
// specific prescription id.
const router = Router();

router.use(authenticate);

router.post('/:id/link-patient', requirePermission(PERMISSIONS.PRESCRIPTION_WRITE), validateUuidParam('id'), validateLinkPatientRequest, linkPrescriptionToPatient);

router.post('/:id/dispense', requirePermission(PERMISSIONS.PHARMACY_DISPENSE), validateUuidParam('id'), validateDispenseRequest, dispenseMedicine);
router.get('/:id/dispensations', requirePermission(PERMISSIONS.PRESCRIPTION_READ), validateUuidParam('id'), listDispensationsForPrescription);

router.get('/:id/lab-reports', requirePermission(PERMISSIONS.PRESCRIPTION_READ), validateUuidParam('id'), listPrescriptionLabReports);

router.post('/:id/invoice', requirePermission(PERMISSIONS.BILLING_WRITE), validateUuidParam('id'), generateInvoice);

export default router;

