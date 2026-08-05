import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBiometricRegisterVerify, validateBiometricAuthVerify } from '../middleware/validateWorkflow.js';
import {
  getRegistrationChallenge, verifyRegistration, getAuthChallenge, verifyAuth, listCredentials, revokeCredential,
} from '../controllers/biometric.controller.js';

const router = Router();

router.post('/register/options', authenticate, getRegistrationChallenge);
router.post('/register/verify', authenticate, validateBiometricRegisterVerify, verifyRegistration);
router.post('/auth/options', authenticate, getAuthChallenge);
router.post('/auth/verify', validateBiometricAuthVerify, verifyAuth); // pre-auth: this IS the login step
router.get('/credentials', authenticate, listCredentials);
router.delete('/credentials/:credentialId', authenticate, revokeCredential);

export default router;
