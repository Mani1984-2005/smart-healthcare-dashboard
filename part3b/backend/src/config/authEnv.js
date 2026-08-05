// Part 3B — Auth/RBAC environment config. Isolated from config/env.js so
// Part 1-3A modules remain untouched; imported only by auth-aware modules.
import dotenv from 'dotenv';
dotenv.config();

export const authEnv = {
  // Master switch. When false, `authenticate` attaches a system/dev user
  // and lets every request through - lets Parts 1-3A keep working with
  // zero config while Keycloak is being provisioned.
  authEnabled: (process.env.AUTH_ENABLED || 'false').toLowerCase() === 'true',

  // Keycloak / OIDC - standard realm export values.
  keycloak: {
    issuer: process.env.KEYCLOAK_ISSUER || '',
    audience: process.env.KEYCLOAK_AUDIENCE || 'medicare-pro-api',
    jwksUri: process.env.KEYCLOAK_JWKS_URI || '',
    rolesClaimPath: process.env.KEYCLOAK_ROLES_CLAIM || 'realm_access.roles',
    clientRolesClaimPath: process.env.KEYCLOAK_CLIENT_ROLES_CLAIM || 'resource_access.medicare-pro-api.roles',
  },

  // Local dev fallback so the API is testable before Keycloak is wired up.
  // Never used when authEnabled=true and a jwksUri is configured.
  devJwtSecret: process.env.DEV_JWT_SECRET || 'dev-only-insecure-secret-change-me',

  jwksCacheMaxAgeMs: Number(process.env.JWKS_CACHE_MAX_AGE_MS || 10 * 60 * 1000),
};
