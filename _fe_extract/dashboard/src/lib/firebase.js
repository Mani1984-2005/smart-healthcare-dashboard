import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

if (!firebaseConfigured) {
  console.warn(
    "Firebase client isn't configured (VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_APP_ID). " +
      "Login will fall back to demo mode — no real authentication, and the backend will treat every request as unauthenticated."
  );
}

export const firebaseApp = firebaseConfigured ? initializeApp(config) : null;
export const firebaseAuth = firebaseConfigured ? getAuth(firebaseApp) : null;
