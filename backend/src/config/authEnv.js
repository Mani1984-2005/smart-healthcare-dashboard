// Part 3B — Auth/RBAC environment config. Isolated from config/env.js so
// Part 1-3A modules remain untouched; imported only by auth-aware modules.
import dotenv from 'dotenv';
dotenv.config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
export const KNOWN_INSECURE_DEV_SECRET = 'dev-only-insecure-secret-change-me';

const resolvedAuthEnabled = isProduction
  ? true
  : (process.env.AUTH_ENABLED || 'false').toLowerCase() === 'true';

export const authEnv = {
  // Master switch. In production, authentication is strictly enforced.
  authEnabled: resolvedAuthEnabled,

  // Keycloak / OIDC - standard realm export values.
  keycloak: {
    issuer: process.env.KEYCLOAK_ISSUER || '',
    audience: process.env.KEYCLOAK_AUDIENCE || 'medicare-pro-api',
    jwksUri: process.env.KEYCLOAK_JWKS_URI || '',
    rolesClaimPath: process.env.KEYCLOAK_ROLES_CLAIM || 'realm_access.roles',
    clientRolesClaimPath: process.env.KEYCLOAK_CLIENT_ROLES_CLAIM || 'resource_access.medicare-pro-api.roles',
  },

  // Local dev fallback so the API is testable before Keycloak is wired up.
  // Prohibited in production.
  devJwtSecret: process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || KNOWN_INSECURE_DEV_SECRET,

  jwksCacheMaxAgeMs: Number(process.env.JWKS_CACHE_MAX_AGE_MS || 10 * 60 * 1000),
};

/**
 * Validates security configuration and fails closed if production security requirements are violated.
 */
export function validateAuthConfig() {
  const currentEnv = process.env.NODE_ENV || 'development';
  if (currentEnv === 'production') {
    if (process.env.AUTH_ENABLED && process.env.AUTH_ENABLED.toLowerCase() === 'false') {
      throw new Error('Production security violation: AUTH_ENABLED cannot be set to false in production.');
    }

    const hasJwks = Boolean(authEnv.keycloak.jwksUri && authEnv.keycloak.jwksUri.trim());
    const explicitSecret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
    const hasSecureSecret = Boolean(explicitSecret && explicitSecret.trim() && explicitSecret !== KNOWN_INSECURE_DEV_SECRET);

    if (!hasJwks && !hasSecureSecret) {
      throw new Error(
        'Production security violation: Production requires a valid KEYCLOAK_JWKS_URI or an explicit, non-default JWT_SECRET. Known insecure fallback secret is prohibited.'
      );
    }
  }
}

