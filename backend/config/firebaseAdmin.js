import "dotenv/config.js"; // Ensure env vars are loaded before we access them
import { initializeApp, cert, getApps } from "firebase-admin/app";

let {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    // We will just let admin be used for testing with mocked tokens later.
  } else {
    console.error(
      "Firebase Admin: Missing required environment variables. " +
        "Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set."
    );
    throw new Error("Missing Firebase Admin environment variables");
  }
} else {
  if (getApps().length === 0) {
    try {
      const credential = cert({
        projectId: FIREBASE_PROJECT_ID.replace(/^"|"$/g, ''),
        clientEmail: FIREBASE_CLIENT_EMAIL.replace(/^"|"$/g, ''),
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
      });
      initializeApp({ credential });
      console.log("Firebase Admin SDK initialised");
    } catch (error) {
      if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
        console.warn("[WARN] Firebase Admin SDK initialization failed. Ignoring due to local dev/test environment.");
      } else {
        console.error("\n[CRITICAL] Firebase Admin Initialization Failed!");
        console.error("The provided Firebase credentials appear to be invalid or malformed.");
        console.error("Error details:", error.message, "\n");
        // Exit or throw a clean error
        throw new Error("Invalid Firebase Admin credentials. Please check your .env file.");
      }
    }
  }
}

export default {};