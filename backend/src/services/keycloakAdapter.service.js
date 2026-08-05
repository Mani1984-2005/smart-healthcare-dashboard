import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authEnv } from '../config/authEnv.js';
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
 * endpoint (RS256). Falls back to a locally-signed HS256 dev token when
 * no JWKS URI is configured, so the API is testable before a realm exists.
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
    // Dev fallback — HS256 tokens minted by /api/auth/dev-token (see rbac.routes.js)
    try {
      payload = jwt.verify(rawToken, authEnv.devJwtSecret);
    } catch (err) {
      throw new AppError('Invalid or expired dev access token', 401, 'UNAUTHORIZED');
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
 * roles, so the RBAC/approval/notification flows can be exercised end to
 * end without a running Keycloak instance. Disabled automatically once
 * AUTH_ENABLED=true and a real jwksUri is configured.
 */
export function mintDevToken({ subject, email, fullName, roles = [] }) {
  return jwt.sign(
    { sub: subject, email, name: fullName, realm_access: { roles } },
    authEnv.devJwtSecret,
    { expiresIn: '8h' }
  );
}
