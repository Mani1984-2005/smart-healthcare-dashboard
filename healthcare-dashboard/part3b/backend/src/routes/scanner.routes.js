import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateUuidParam } from '../middleware/validate.js';
import { validateBarcodeLookup, validateBarcodeRegister, validateQrLookup } from '../middleware/validateWorkflow.js';
import { PERMISSIONS } from '../config/roles.js';
import {
  lookupBarcode, registerBarcode, lookupQr, generatePatientQr, generatePrescriptionQr,
} from '../controllers/scanner.controller.js';

const router = Router();

router.post('/barcode/lookup', authenticate, validateBarcodeLookup, lookupBarcode);
router.post('/barcode/register', authenticate, requirePermission(PERMISSIONS.PHARMACY_DISPENSE), validateBarcodeRegister, registerBarcode);
router.post('/qr/lookup', authenticate, validateQrLookup, lookupQr);
router.post('/qr/patients/:patientId', authenticate, validateUuidParam('patientId'), requirePermission(PERMISSIONS.PATIENT_WRITE), generatePatientQr);
router.post('/qr/prescriptions/:id', authenticate, validateUuidParam('id'), requirePermission(PERMISSIONS.PRESCRIPTION_WRITE), generatePrescriptionQr);

export default router;
