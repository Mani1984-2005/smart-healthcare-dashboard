import { Router } from 'express';
import { validateUuidParam, validateLinkPatientRequest, validateDispenseRequest } from '../middleware/validate.js';
import { linkPrescriptionToPatient } from '../controllers/patients.controller.js';
import { dispenseMedicine, listDispensationsForPrescription } from '../controllers/pharmacy.controller.js';
import { listPrescriptionLabReports } from '../controllers/labReports.controller.js';
import { generateInvoice } from '../controllers/billing.controller.js';

// Mounted at /api/prescriptions in server.js, alongside prescriptions.routes.js
// and aiAnalysis.routes.js. Groups every Part 3A endpoint that hangs off a
// specific prescription id.
const router = Router();

router.post('/:id/link-patient', validateUuidParam('id'), validateLinkPatientRequest, linkPrescriptionToPatient);

router.post('/:id/dispense', validateUuidParam('id'), validateDispenseRequest, dispenseMedicine);
router.get('/:id/dispensations', validateUuidParam('id'), listDispensationsForPrescription);

router.get('/:id/lab-reports', validateUuidParam('id'), listPrescriptionLabReports);

router.post('/:id/invoice', validateUuidParam('id'), generateInvoice);

export default router;
