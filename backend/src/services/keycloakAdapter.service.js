import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authEnv, KNOWN_INSECURE_DEV_SECRET } from '../config/authEnv.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

let remoteJwks = null;
function getJwks() {
  if (!authEnv.keycloak.jwksUri) return null;
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(authEnv.keycloak.jwksUri), {
      cacheMaxAge: authEnv.jwksCacheMaxAgeMs,
    });
  }
  return remoteJwks;
}

function readClaimPath(claims, path) {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), claims);
}

/**
 * Verifies a Bearer token against the configured Keycloak realm's JWKS
 * endpoint (RS256). When no JWKS URI is configured, a locally-signed HS256
 * dev token is accepted — but ONLY when an explicit JWT_SECRET / DEV_JWT_SECRET
 * is configured. The published insecure fallback secret is rejected in every
 * environment (production startup additionally fails closed via
 * validateAuthConfig in config/authEnv.js).
 * Returns normalized claims: { subject, email, fullName, roles }.
 */
export async function verifyAccessToken(rawToken) {
  const jwks = getJwks();

  let payload;
  if (jwks) {
    try {
      const { payload: verified } = await jwtVerify(rawToken, jwks, {
        issuer: authEnv.keycloak.issuer || undefined,
        audience: authEnv.keycloak.audience || undefined,
      });
      payload = verified;
    } catch (err) {
      logger.warn('Keycloak token verification failed', { error: err.message });
      throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
    }
  } else {
    // SECURITY (Phase 2B): the published fallback secret is now rejected for
    // LOCAL HS256 verification too, not only in production. The supported
    // development-token workflow requires an explicitly configured
    // JWT_SECRET (or DEV_JWT_SECRET); the insecure default is never accepted.
    if (authEnv.devJwtSecret === KNOWN_INSECURE_DEV_SECRET) {
      throw new AppError(
        'Local token verification is disabled: the published insecure fallback signing secret is not accepted. '
          + 'Configure an explicit JWT_SECRET (or DEV_JWT_SECRET) to use development tokens.',
        401,
        'UNAUTHORIZED',
      );
    }

    try {
      payload = jwt.verify(rawToken, authEnv.devJwtSecret);
    } catch {
      throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
    }
  }

  // SECURITY (Phase 2F / task B): a roles claim must be an ARRAY OF STRINGS.
  // Anything else — a bare string (which would otherwise spread into single
  // characters), an object, or a mixed-type array — resolves to no roles at
  // all. Malformed claims can therefore never grant access, and they are
  // refused as an ordinary under-privileged request instead of crashing the
  // verification path with a 500 (TypeError on a non-iterable claim).
  const roles = [...new Set(
    [readClaimPath(payload, authEnv.keycloak.rolesClaimPath),
      readClaimPath(payload, authEnv.keycloak.clientRolesClaimPath)]
      .flatMap((claim) => (Array.isArray(claim) ? claim : []))
      .filter((role) => typeof role === 'string' && role.length > 0),
  )];

  return {
    subject: payload.sub,
    email: payload.email || null,
    // ACCOUNT-LINKING (Phase 5): rbac.service.getOrProvisionUser only links an
    // existing account by email when the IdP asserts email_verified === true.
    // Tokens without a verified-email claim can never take over an existing
    // account by email — they provision a fresh row keyed by subject instead.
    emailVerified: payload.email_verified === true,
    fullName: payload.name || payload.preferred_username || null,
    roles,
    raw: payload,
  };
}

/**
 * Dev-only helper: mints a short-lived HS256 token carrying the requested
 * roles. Prohibited in production, and refused unless an explicit local
 * signing secret is configured (see SECURITY note below).
 *
 * SECURITY (Phase 5): dev tokens deliberately do NOT carry email_verified
 * (or any verified-email claim), so a dev token can never trigger account
 * linking by email — even against dev-seeded users. Only a real IdP
 * assertion of email_verified=true may link accounts.
 *
 * SECURITY (Phase 2B): a token signed with the published insecure fallback
 * secret could never be verified (verifyAccessToken rejects that secret), so
 * minting one is refused outright instead of returning an unusable credential.
 */
export function mintDevToken({ subject, email, fullName, roles = [] }) {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('Development token minting is forbidden in production', 403, 'FORBIDDEN');
  }

  if (authEnv.devJwtSecret === KNOWN_INSECURE_DEV_SECRET) {
    throw new AppError(
      'Development token signing is disabled because no explicit signing secret is configured. '
        + 'Set JWT_SECRET (or DEV_JWT_SECRET) to a private value to use development tokens.',
      403,
      'FORBIDDEN',
    );
  }

  return jwt.sign(
    { sub: subject, email, name: fullName, realm_access: { roles } },
    authEnv.devJwtSecret,
    { expiresIn: '8h' }
  );
}

