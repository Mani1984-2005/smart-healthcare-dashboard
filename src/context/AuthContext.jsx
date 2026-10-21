// src/context/AuthContext.jsx
// -----------------------------------------------------------------------------
// Phase 2D — session state sourced exclusively from the backend.
//
// * identity/roles/permissions come from GET /api/auth/me (see
//   services/authToken.js), never from a portal card or from localStorage.
// * the Phase 2C guest/fabricated login has been REMOVED: there is no path
//   left that produces a logged-in state without a backend-issued token.
// * Firebase sign-in was removed from the session path on purpose: the backend
//   verifies Keycloak RS256 or local HS256 JWTs only (see
//   backend/src/services/keycloakAdapter.service.js), so a Firebase ID token
//   can never authenticate an API call here. Claiming otherwise would be a
//   fabricated login. See docs/LOCAL_DEV_AUTHENTICATION.md.
// -----------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  loginWithDevelopmentToken,
  restoreSession,
  logoutSession,
  getIdentity,
  subscribeSessionExpired,
} from "../services/authToken";
import { describeRoles } from "../services/navigationPolicy";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Hydrate immediately for first paint, then validate against the backend.
  const [identity, setIdentity] = useState(() => getIdentity());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // restoreSession() re-validates the stored token against /api/auth/me
      // and deletes it on any failure, so refresh can never resurrect a dead
      // session (and can never loop: with no token it makes no request).
      const restored = await restoreSession();
      if (!cancelled) {
        setIdentity(restored);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // src/api/client.js fires this when a request comes back 401.
  useEffect(() => subscribeSessionExpired(() => setIdentity(null)), []);

  const login = useCallback(async (portalRole) => {
    const next = await loginWithDevelopmentToken(portalRole);
    setIdentity(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    logoutSession();
    setIdentity(null);
  }, []);

  const roles = useMemo(() => identity?.roles ?? [], [identity]);
  const permissions = useMemo(() => identity?.permissions ?? [], [identity]);

  const hasPermission = useCallback(
    (permission) => permissions.includes(permission),
    [permissions],
  );

  const user = useMemo(() => {
    if (!identity) return null;
    return {
      uid: identity.user?.id ?? identity.user?.keycloak_subject_id ?? null,
      name: identity.user?.full_name || identity.user?.email || null,
      email: identity.user?.email || null,
      authMode: identity.authMode ?? null,
    };
  }, [identity]);

  const value = useMemo(() => ({
    user,
    identity,
    roles,
    roleLabel: describeRoles(roles),
    permissions,
    authMode: identity?.authMode ?? null,
    hasPermission,
    loading,
    login,
    logout,
  }), [user, identity, roles, permissions, hasPermission, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
