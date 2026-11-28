import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState({
    status: "unauthenticated",
    roles: [],
    permissions: [],
    authMode: null,
    error: "",
  });

  useEffect(() => {
    let unsubscribe = () => {};
    const testIdentity =
      import.meta.env.DEV &&
      typeof window !== "undefined"
        ? window.__MEDICARE_TEST_IDENTITY__
        : null;

    if (testIdentity) {
      setUser(testIdentity.user || null);
      setIdentity({
        status: testIdentity.user ? "resolved" : "unauthenticated",
        roles: testIdentity.roles || [],
        permissions: testIdentity.permissions || [],
        authMode: "test-fixture",
        error: testIdentity.error || "",
      });
      setLoading(false);
      globalThis.__MEDICARE_AUTH_GET_TOKEN__ = testIdentity.token
        ? () => Promise.resolve(testIdentity.token)
        : null;
      if (!testIdentity.token) delete globalThis.__MEDICARE_AUTH_GET_TOKEN__;
      return () => {};
    }

    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          globalThis.__MEDICARE_AUTH_GET_TOKEN__ = () => firebaseUser.getIdToken();
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photo: firebaseUser.photoURL,
          });

          try {
            const token = await firebaseUser.getIdToken();
            const response = await fetch("/api/auth/me", {
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            const body = await response.json().catch(() => null);

            if (!response.ok) {
              throw new Error(body?.error?.message || body?.message || "Could not verify backend identity");
            }

            const data = body?.data || {};
            const roles = Array.isArray(data.roles) ? data.roles : [];
            const permissions = Array.isArray(data.permissions) ? data.permissions : [];

            if (data.authMode === "disabled" || roles.length === 0) {
              setIdentity({
                status: "blocked",
                roles: [],
                permissions: [],
                authMode: data.authMode || null,
                error: "Backend authorization is not enabled for this session.",
              });
            } else {
              setIdentity({
                status: "resolved",
                roles,
                permissions,
                authMode: data.authMode || null,
                error: "",
              });
            }
          } catch (error) {
            setIdentity({
              status: "error",
              roles: [],
              permissions: [],
              authMode: null,
              error: error.message || "Could not verify backend identity",
            });
          }
        } else {
          delete globalThis.__MEDICARE_AUTH_GET_TOKEN__;
          setUser(null);
          setIdentity({
            status: "unauthenticated",
            roles: [],
            permissions: [],
            authMode: null,
            error: "",
          });
        }
        setLoading(false);
      });
    } catch (e) {
      console.warn("[Auth] Firebase onAuthStateChanged error:", e);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    delete globalThis.__MEDICARE_AUTH_GET_TOKEN__;
    setIdentity({
      status: "unauthenticated",
      roles: [],
      permissions: [],
      authMode: null,
      error: "",
    });
    localStorage.removeItem("medicare_auth_user");
    localStorage.removeItem("role");
  };

  const hasPermission = (permission) =>
    identity.status === "resolved" && identity.permissions.includes(permission);

  const hasRole = (role) =>
    identity.status === "resolved" && identity.roles.includes(role);

  const value = useMemo(
    () => ({
      user,
      setUser,
      logout,
      loading,
      identity,
      hasPermission,
      hasRole,
    }),
    [user, loading, identity]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);