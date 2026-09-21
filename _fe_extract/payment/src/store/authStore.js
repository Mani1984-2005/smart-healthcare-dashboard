import { create } from "zustand";
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../services/firebase.js";

const storageKey = "medicare_pro_user";
// FIX (continuation of the compatibility audit's auth-gap finding): api.js
// has always read the bearer token from this exact key, but nothing ever
// wrote to it — dev-mode login only ever set `storageKey` above, never a
// token, since it never had a real one to store. Real Firebase sign-in now
// writes here; dev-mode login explicitly does NOT (there is no real token to
// fake), which is itself documented behavior, not an oversight — see
// loginDevMode() below.
const tokenStorageKey = "medicare_auth_token";

function loadUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(user));
}

function persistToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(tokenStorageKey, token);
  else window.localStorage.removeItem(tokenStorageKey);
}

export const useAuthStore = create((set) => ({
  user: loadUser(),
  isAuthenticated: Boolean(loadUser()),
  authMode: isFirebaseConfigured ? "firebase" : "dev",

  // Dev-mode login (unchanged from the prior implementation, kept as an
  // explicit, clearly-labeled fallback for when Firebase isn't configured —
  // see src/pages/Login.tsx). Deliberately does NOT write a token: there is
  // no real Firebase ID token to write, and writing a fake one would make
  // api.js silently attach a bearer value the backend would correctly
  // reject anyway (no signature a real verifyIdToken() call could accept),
  // which is worse than sending no token at all — a dev-mode session simply
  // cannot call any authenticated backend route, which is the honest state
  // of affairs, not a bug to paper over.
  loginDevMode(user) {
    persistUser(user);
    persistToken(null);
    set({ user, isAuthenticated: true, authMode: "dev" });
  },

  // Real Firebase login: called once a Firebase sign-in method (see
  // Login.tsx) resolves with a real Firebase user. Fetches the ID token and
  // the AUTHORITATIVE application user/role from the backend's /auth/me
  // (fixed in this pass to return the real Prisma role) — the frontend never
  // sets `role` from anything client-side once Firebase is configured.
  async loginWithFirebase(firebaseUser) {
    const token = await firebaseUser.getIdToken();
    persistToken(token);

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "/api"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      persistToken(null);
      const body = await response.json().catch(() => ({}));
      throw new Error(
        body?.error?.message ||
          "Signed in with Firebase, but no MediCare Pro account is linked to this login. Contact an administrator."
      );
    }

    const { data: appUser } = await response.json();
    persistUser(appUser);
    set({ user: appUser, isAuthenticated: true, authMode: "firebase" });
    return appUser;
  },

  async logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(tokenStorageKey);
    }
    if (isFirebaseConfigured && auth?.currentUser) {
      await firebaseSignOut(auth);
    }
    set({ user: null, isAuthenticated: false });
  },
}));

// Keeps the stored bearer token fresh across a session — Firebase ID tokens
// expire hourly, and the SDK automatically re-mints them, but something has
// to actually copy the refreshed token into the localStorage key api.js
// reads. Call once, at app startup (see main.tsx). No-ops entirely when
// Firebase isn't configured, so it's always safe to call.
export function initAuthTokenRefresh() {
  if (!isFirebaseConfigured || !auth) return () => {};

  return onIdTokenChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      persistToken(null);
      return;
    }
    const token = await firebaseUser.getIdToken();
    persistToken(token);
  });
}
