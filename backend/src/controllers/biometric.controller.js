import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as biometricService from '../services/biometric.service.js';

function requireUser(req) {
  if (!req.user?.id) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.user.id;
}

export const getRegistrationChallenge = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const challenge = await biometricService.createChallenge(userId, 'registration');
  res.json({ success: true, data: challenge });
});

export const verifyRegistration = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const credential = await biometricService.registerCredential(userId, req.body);
  await recordAudit({
    userId, action: 'BIOMETRIC_CREDENTIAL_REGISTERED',
    details: { credentialId: credential.credential_id, modality: credential.modality },
    ...auditContextFromRequest(req),
  });
  res.status(201).json({ success: true, data: credential });
});

export const getAuthChallenge = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const challenge = await biometricService.createChallenge(userId, 'authentication');
  res.json({ success: true, data: challenge });
});

export const verifyAuth = asyncHandler(async (req, res) => {
  const result = await biometricService.verifyAssertion(req.body);
  await recordAudit({
    userId: result.userId, action: 'BIOMETRIC_AUTH_SUCCEEDED',
    details: { credentialId: result.credentialId },
    ...auditContextFromRequest(req),
  });
  res.json({ success: true, data: { verified: true, ...result } });
});

export const listCredentials = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const rows = await biometricService.listCredentials(userId);
  res.json({ success: true, data: rows });
});

export const revokeCredential = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  await biometricService.revokeCredential(userId, req.params.credentialId);
  await recordAudit({
    userId, action: 'BIOMETRIC_CREDENTIAL_REVOKED',
    details: { credentialId: req.params.credentialId },
    ...auditContextFromRequest(req),
  });
  res.json({ success: true, data: { revoked: true } });
});
