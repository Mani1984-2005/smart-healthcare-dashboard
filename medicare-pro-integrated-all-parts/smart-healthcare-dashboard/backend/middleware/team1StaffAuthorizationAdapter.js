// backend/middleware/team1StaffAuthorizationAdapter.js
//
// ============================================================================
// TEAM 1 — DEVELOPMENT/DEMO STAFF AUTHORIZATION ADAPTER
// ============================================================================
//
// WHY THIS FILE EXISTS:
// MediCare Pro's Firebase Admin authentication chain (config/firebaseAdmin.js
// + middleware/authMiddleware.js + routes/authRoutes.js) is fully coded but
// confirmed NOT LIVE anywhere in the running application — it is unreachable
// dead code, there are no Firebase credentials configured anywhere in this
// repository/environment, and the actual live login (src/pages/Login.tsx +
// src/store/authStore.js) is a local, browser-storage role-selection demo
// with no cryptographic verification and no server round-trip at all.
//
// Per the explicit implementation decision: Team 1 must NOT make Firebase a
// dependency, must NOT modify authMiddleware.js/firebaseAdmin.js, and must
// NOT invent a fake Firebase token. This adapter is the smallest possible
// substitute that lets the two staff-facing Team 1 routes
// (POST /intake/sessions and GET /intake/sessions/:id/export) function for
// a demo, WITHOUT pretending to be real authentication.
//
// ============================================================================
// THIS IS **NOT** PRODUCTION AUTHENTICATION.
// ============================================================================
//
// It performs NO cryptographic identity verification. It only checks that:
//   (a) the server was explicitly started in an allowed demo mode, AND
//   (b) the caller supplied a non-empty staff identifier header.
// Anyone who can reach the server in that explicitly-enabled mode can act as
// "staff" — that is the documented, explicit limitation, not an oversight.
//
// REPLACEMENT POINT (for Team 6 / final security integration):
//   Team1StaffAuthorizationAdapter  →  Production Auth Provider (e.g. a real,
//   wired Firebase ID-token check, or whatever MediCare Pro's eventual real
//   staff authentication becomes).
// Replacing this file's export with a real check requires NO changes to:
//   - the intake session schema
//   - the session-token contract (sessionToken issuance/hash/validation)
//   - the kiosk APIs (submitAnswer, history, complete, etc.)
//   - the ClinicalHistory contract
//   - the question engine
//   - the provenance rules
//   - the Team 4/5/6 integration contracts
// because every downstream function only reads `req.user.uid` — exactly the
// same shape a real Firebase-verified `req.user` provides.
//
// FAIL-CLOSED BEHAVIOR:
//   This adapter refuses every request unless BOTH of the following are true:
//     1. process.env.NODE_ENV is NOT "production", AND
//     2. process.env.TEAM1_DEMO_STAFF_AUTH is exactly the string "enabled"
//        (an explicit opt-in — simply being in a non-production NODE_ENV is
//        NOT sufficient by itself; this must be turned on on purpose).
//   If either condition fails, every request is rejected with 403, with no
//   exceptions and no way to override via request content. This means the
//   adapter is inert (and therefore incapable of exposing patient data) in
//   any environment where TEAM1_DEMO_STAFF_AUTH has not been deliberately set,
//   and is hard-disabled outright whenever NODE_ENV=production.

const STAFF_ID_HEADER = "x-team1-demo-staff-id";

function isDemoModeExplicitlyEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.TEAM1_DEMO_STAFF_AUTH === "enabled";
}

export function team1StaffAuthorizationAdapter(req, res, next) {
  if (!isDemoModeExplicitlyEnabled()) {
    return res.status(403).json({
      success: false,
      message:
        "Team 1 demo staff authorization is not enabled. This endpoint requires a real " +
        "authentication integration in this environment (see Team1StaffAuthorizationAdapter " +
        "for the documented replacement point).",
    });
  }

  const staffId = req.headers[STAFF_ID_HEADER];
  if (!staffId || typeof staffId !== "string" || !staffId.trim()) {
    return res.status(401).json({
      success: false,
      message: `Missing required demo staff identifier header: ${STAFF_ID_HEADER}`,
    });
  }

  // Explicitly NOT a verified identity — see file header. Shaped to match
  // what a real authMiddleware.js-verified req.user would provide (`.uid`)
  // so downstream code (intakeController.js) needs zero changes when this
  // adapter is later replaced by a real one.
  req.user = { uid: staffId.trim(), authMethod: "TEAM1_DEMO_STAFF_ADAPTER" };
  return next();
}

export const _internal = { STAFF_ID_HEADER, isDemoModeExplicitlyEnabled };
