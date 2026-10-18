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
 * endpoint (RS256). In development, falls back to a locally-signed HS256 dev token
 * when no JWKS URI is configured. In production, fallback to known insecure secret is rejected.
 * Returns normalized claims: { subject, email, fullName, roles }.
 */
export async function verifyAccessToken(rawToken) {
  const isProd = process.env.NODE_ENV === 'production';
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
    // In production, reject if fallback insecure secret is configured
    if (isProd && authEnv.devJwtSecret === KNOWN_INSECURE_DEV_SECRET) {
      throw new AppError('Production security violation: Insecure token verification is rejected in production', 401, 'UNAUTHORIZED');
    }

    try {
      payload = jwt.verify(rawToken, authEnv.devJwtSecret);
    } catch {
      throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
    }
  }

  const realmRoles = readClaimPath(payload, authEnv.keycloak.rolesClaimPath) || [];
  const clientRoles = readClaimPath(payload, authEnv.keycloak.clientRolesClaimPath) || [];
  const roles = [...new Set([...(realmRoles || []), ...(clientRoles || [])])];

  return {
    subject: payload.sub,
    email: payload.email || null,
    fullName: payload.name || payload.preferred_username || null,
    roles,
    raw: payload,
  };
}

/**
 * Dev-only helper: mints a short-lived HS256 token carrying the requested
 * roles. Prohibited in production.
 */
export function mintDevToken({ subject, email, fullName, roles = [] }) {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('Development token minting is forbidden in production', 403, 'FORBIDDEN');
  }

  return jwt.sign(
    { sub: subject, email, name: fullName, realm_access: { roles } },
    authEnv.devJwtSecret,
    { expiresIn: '8h' }
  );
}

