import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';
import * as biometricRepo from '../repositories/biometric.repository.js';

const CHALLENGE_TTL_MS = 2 * 60 * 1000;

/**
 * Biometric authentication readiness layer.
 *
 * This implements the same challenge/credential/signature shape as
 * WebAuthn (registration ceremony -> stored public key; auth ceremony ->
 * signed challenge verified against that public key) so a real WebAuthn
 * library (e.g. @simplewebauthn/server) or a native biometric SDK bridge
 * (Face/Touch ID, Android BiometricPrompt) can be swapped in behind this
 * service without changing controllers, routes, or the DB schema.
 * `publicKey` is expected as a PEM-encoded key; `signature` as base64.
 */
export async function createChallenge(userId, purpose = 'registration') {
  const challenge = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const row = await biometricRepo.insertChallenge({ userId, purpose, challenge, expiresAt });
  return { challengeId: row.id, challenge, expiresAt };
}

export async function registerCredential(userId, { credentialId, publicKey, deviceLabel, modality }) {
  const existing = await biometricRepo.findCredentialById(credentialId);
  if (existing) throw AppError.conflict('This credential is already registered.');
  return biometricRepo.insertCredential({ userId, credentialId, publicKey, deviceLabel, modality });
}

export async function verifyAssertion({ credentialId, challengeId, signature }) {
  const credential = await biometricRepo.findCredentialById(credentialId);
  if (!credential) throw AppError.notFound('Unknown or revoked biometric credential.');

  const challengeRow = await biometricRepo.consumeChallenge(challengeId);
  if (!challengeRow) throw AppError.badRequest('Challenge is invalid, already used, or expired.');
  if (challengeRow.user_id !== credential.user_id) {
    throw AppError.badRequest('Challenge does not belong to the credential owner.');
  }

  let verified = false;
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(challengeRow.challenge);
    verifier.end();
    verified = verifier.verify(credential.public_key, Buffer.from(signature, 'base64'));
  } catch (err) {
    throw AppError.badRequest('Malformed public key or signature.');
  }

  if (!verified) throw new AppError('Biometric signature verification failed.', 401, 'UNAUTHORIZED');

  await biometricRepo.touchCredential(credentialId, (credential.sign_count || 0) + 1);
  return { userId: credential.user_id, credentialId };
}

export async function listCredentials(userId) {
  return biometricRepo.listCredentialsForUser(userId);
}

export async function revokeCredential(userId, credentialId) {
  const revoked = await biometricRepo.revokeCredential(credentialId, userId);
  if (!revoked) throw AppError.notFound('Credential not found for this user.');
  return revoked;
}
