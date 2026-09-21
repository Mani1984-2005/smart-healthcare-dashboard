import "dotenv/config.js";
import { initializeApp, cert, getApps } from "firebase-admin/app";

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  NODE_ENV,
} = process.env;

const isLocalDev = NODE_ENV === "development" || NODE_ENV === "test" || !NODE_ENV;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  if (isLocalDev) {
    console.warn("[WARN] Firebase Admin SDK is not configured. Continuing in local demo mode.");
  } else {
    console.error(
      "Firebase Admin: Missing required environment variables. " +
        "Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set."
    );
    throw new Error("Missing Firebase Admin environment variables");
  }
} else if (getApps().length === 0) {
  try {
    const credential = cert({
      projectId: FIREBASE_PROJECT_ID.replace(/^"|"$/g, ""),
      clientEmail: FIREBASE_CLIENT_EMAIL.replace(/^"|"$/g, ""),
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
    });
    initializeApp({ credential });
    console.log("Firebase Admin SDK initialised");
  } catch (error) {
    if (isLocalDev) {
      console.warn("[WARN] Firebase Admin SDK initialization failed. Ignoring due to local dev/test environment.");
    } else {
      console.error("\n[CRITICAL] Firebase Admin Initialization Failed!");
      console.error("The provided Firebase credentials appear to be invalid or malformed.");
      console.error("Error details:", error.message, "\n");
      throw new Error("Invalid Firebase Admin credentials. Please check your .env file.");
    }
  }
}

export default {};