// backend/middleware/physicianWorkspaceAuth.js
//
// Part 5 — Physician AI Workspace
// ---------------------------------------------------------------------------
// Demo authentication/authorization adapter.
//
// Why not backend/middleware/authMiddleware.js? That middleware verifies a
// Firebase ID token and THROWS at import time if FIREBASE_PROJECT_ID /
// FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are not set. The existing
// frontend login (src/store/authStore.js) is a local, role-selection demo
// that never issues a Firebase token in the first place (confirmed in
// MEDICARE_PRO_RUNTIME_AUDIT.md: "not connected to Firebase or the backend
// authentication endpoint"). Importing that middleware here would make Part
// 5 fail to start in exactly the environment it needs to run in, and would
// also be a real dependency on infrastructure that isn't functionally wired
// up yet — the opposite of "independently runnable."
//
// This adapter instead reads the demo identity the frontend already carries
// (id / name / role) from request headers, so Part 5 still enforces
// authentication and role-based authorization at the backend, without
// depending on another part's auth stack. When MediCare Pro's real
// authentication is wired up, only this file needs to be replaced with a
// call into it — controllers and routes are unaffected.
// ---------------------------------------------------------------------------

const KNOWN_ROLES = new Set(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "LAB_TECHNICIAN", "PHARMACIST", "BILLING", "PATIENT"]);

export function attachDemoUser(req, res, next) {
  const id = req.header("x-demo-user-id");
  const name = req.header("x-demo-user-name");
  const role = req.header("x-demo-user-role");

  if (!id || !role || !KNOWN_ROLES.has(role)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorised: missing or invalid demo identity headers (x-demo-user-id, x-demo-user-role).",
    });
  }

  req.user = { id, name: name || "Unknown user", role };
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorised: no user context." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: this action requires one of [${allowedRoles.join(", ")}].`,
      });
    }
    next();
  };
}
