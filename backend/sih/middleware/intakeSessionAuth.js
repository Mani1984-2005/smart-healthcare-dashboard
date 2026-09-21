// backend/middleware/intakeSessionAuth.js
//
// Team 1 — kiosk session-token authorization. Isolated, new file.
// Does NOT modify backend/middleware/authMiddleware.js (that middleware
// is reused, unmodified, only on the two staff-authenticated Team 1
// routes: POST /intake/sessions and GET /intake/sessions/:id/export).
//
// This middleware enforces: a session token presented for session A can
// never be used to read or write session B (Phase 2 Final Design,
// section 7 / hard rule from the implementation instructions).

import { authorizeSessionToken, IntakeNotFoundError, IntakeAuthError } from "../services/intakeService.js";

export async function intakeSessionAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Missing session token" });
  }
  const rawToken = authHeader.slice("Bearer ".length);
  const sessionId = req.params.id;

  try {
    const session = await authorizeSessionToken(sessionId, rawToken);
    req.intakeSession = session;
    return next();
  } catch (err) {
    if (err instanceof IntakeNotFoundError) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (err instanceof IntakeAuthError) {
      return res.status(401).json({ success: false, message: "Invalid session token" });
    }
    return res.status(500).json({ success: false, message: "Session authorization failed" });
  }
}
