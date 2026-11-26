// backend/src/middleware/ocrAccess.js
//
// Access gate for prescription OCR (medical document) endpoints.
//
// Verified-state summary of the current architecture (Checkpoint 1):
//  - Backend auth mechanism is Keycloak/OIDC (`AUTH_ENABLED`), NOT
//    provisioned yet. Default is `AUTH_ENABLED=false`.
//  - The frontend uses Firebase auth; its localStorage user object is NOT
//    accepted here as proof of identity.
//  - When `AUTH_ENABLED=false` the legacy `authenticate` middleware would
//    attach a synthetic "system user" — a guest account. Guest accounts are
//    NEVER treated as verified medical-record users, so this middleware
//    does not use that path.
//
// Therefore:
//  - AUTH_ENABLED=true  -> delegate to the real OIDC `authenticate`
//                          (401 without a valid Bearer token: fail closed).
//  - AUTH_ENABLED=false + NODE_ENV=production -> FAIL CLOSED (503) until a
//                          verified identity provider is provisioned.
//  - AUTH_ENABLED=false + non-production -> controlled development-only
//                          mode, clearly labelled on every audit entry.

import { authEnv } from '../config/authEnv.js';
import { authenticate } from './auth.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

function isProduction() {
  // Read per-request (not cached) so deployment mode can't be silently
  // mis-detected at import time.
  return (process.env.NODE_ENV || 'development') === 'production';
}

let devModeWarned = false;

export function ocrAccess(req, res, next) {
  if (authEnv.authEnabled) {
    return authenticate(req, res, (err) => {
      if (err) return next(err);
      req.ocrActorLabel =
        req.user?.email || req.user?.full_name || 'authenticated-user';
      req.ocrAccessMode = 'keycloak';
      next();
    });
  }

  if (isProduction()) {
    return next(
      new AppError(
        'Prescription OCR access is disabled: no verified authentication provider is configured. ' +
          'Provision OIDC/Keycloak and set AUTH_ENABLED=true before enabling patient document access in production.',
        503,
        'AUTH_REQUIRED'
      )
    );
  }

  if (!devModeWarned) {
    devModeWarned = true;
    logger.warn(
      'Prescription OCR endpoints are in DEVELOPMENT-ONLY access mode ' +
        '(AUTH_ENABLED=false). This is NOT a production-safe authorization mechanism.'
    );
  }

  req.ocrActorLabel = 'development-mode (unverified)';
  req.ocrAccessMode = 'development';
  next();
}
