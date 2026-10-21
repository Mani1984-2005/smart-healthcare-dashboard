// backend/src/middleware/rateLimiters.js
// -----------------------------------------------------------------------------
// Phase 2F (finding R4) — dedicated rate limiter for the ANONYMOUS biometric
// verification step (POST /api/biometric/auth/verify).
//
// Why a second limiter: that route is the only pre-authentication endpoint
// that answers "does this assertion match a stored credential", which makes it
// the natural credential-probing target. The global /api limiter
// (server.js:54-60, 300 requests / 15 min per IP) is far too generous for a
// credential check, and weakening IT for every other route is not acceptable.
//
// How the layers compose (verified by tests/securityHardeningPhase2F.test.js):
//   * server.js mounts app.use('/api', apiLimiter) BEFORE every router, so
//     the global limiter still counts every biometric request — this route
//     limiter ADDS a stricter cap, it never replaces or bypasses the global
//     one;
//   * the limiter is attached to this ONE route inside biometric.routes.js, so
//     no other authentication route (dev-token, /auth/options, register,
//     credentials) is affected by it.
//
// Testability: the factory accepts { windowMs, limit, store } so tests can
// drive a deterministic fake clock through a custom express-rate-limit store
// instead of sleeping. Production wiring uses the exported singleton with the
// defaults below and the library's own in-memory store.
// -----------------------------------------------------------------------------
import rateLimit from 'express-rate-limit';

export const BIOMETRIC_VERIFY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const BIOMETRIC_VERIFY_LIMIT = 10; // attempts per window, per client IP

/**
 * Builds a biometric-verification limiter. `store` is injectable so tests can
 * control time; production uses the singleton below (default in-memory store).
 */
export function createBiometricVerifyLimiter({
  windowMs = BIOMETRIC_VERIFY_WINDOW_MS,
  limit = BIOMETRIC_VERIFY_LIMIT,
  store,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    ...(store ? { store } : {}),
    // Same JSON error contract as every other error in the API (utils/AppError.js).
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many verification attempts. Please wait for the limit window to pass and try again.',
        },
      });
    },
  });
}

export const biometricVerifyLimiter = createBiometricVerifyLimiter();
