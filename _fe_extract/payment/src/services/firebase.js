// Firebase client SDK initialization.
//
// STATUS: IMPLEMENTED against Firebase's documented client SDK contract.
// CONFIGURATION REQUIRED — no VITE_FIREBASE_* values exist in this
// environment (same class of gap as backend/config/firebaseAdmin.js before
// its fix, and the same pattern as razorpayCheckout.js's CONFIGURATION
// REQUIRED / NOT VERIFIED marking). NOT VERIFIED — this sandbox has no
// network path to Firebase's services, so no real sign-in has ever
// succeeded against this code.
//
// `firebase` (^12.14.0) was already an installed frontend dependency before
// this fix but was never imported anywhere — see
// PAYMENT_INTEGRATION_COMPATIBILITY_REPORT.md §3.

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** @type {import("firebase/auth").Auth | null} */
let auth = null;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
} else if (typeof window !== "undefined") {
  // Not an error — the app has a documented dev-mode fallback (see
  // src/pages/Login.tsx) for exactly this case. Logged once, quietly, so a
  // developer running locally without Firebase configured isn't confused by
  // silent auth failures, without being alarming in a real deployment that
  // simply hasn't set env vars yet.
  console.info(
    "[firebase] VITE_FIREBASE_* env vars are not set — real authentication is unavailable. " +
      "Falling back to dev-mode login. See .env.example."
  );
}

export { auth };
