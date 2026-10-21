import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { biometricVerifyLimiter } from '../middleware/rateLimiters.js';
import { validateBiometricRegisterVerify, validateBiometricAuthVerify } from '../middleware/validateWorkflow.js';
import {
  getRegistrationChallenge, verifyRegistration, getAuthChallenge, verifyAuth, listCredentials, revokeCredential,
} from '../controllers/biometric.controller.js';

const router = Router();

router.post('/register/options', authenticate, getRegistrationChallenge);
router.post('/register/verify', authenticate, validateBiometricRegisterVerify, verifyRegistration);
router.post('/auth/options', authenticate, getAuthChallenge);
// Pre-auth: this IS the login step. Finding R4: it therefore carries a
// dedicated strict rate limiter (10 attempts / 10 min / IP, see
// middleware/rateLimiters.js) IN ADDITION to the global /api limiter in
// server.js, which still runs first and still counts every request.
router.post('/auth/verify', biometricVerifyLimiter, validateBiometricAuthVerify, verifyAuth);
router.get('/credentials', authenticate, listCredentials);
router.delete('/credentials/:credentialId', authenticate, revokeCredential);

export default router;
