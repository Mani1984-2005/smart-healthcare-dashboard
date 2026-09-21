// backend/routes/intakeRoutes.js
//
// Team 1 API surface. Mounted from server.js as `app.use("/intake", intakeRoutes)`,
// matching the existing flat-mount convention used for `/patients` and `/health`.
//
// Auth: session creation and the staff export endpoint are protected by
// Team 1's own isolated development/demo staff authorization adapter (NOT
// authMiddleware.js — see team1StaffAuthorizationAdapter.js for why).
// All other routes are protected by the new, isolated intakeSessionAuth
// middleware (opaque per-session token), per Phase 2 Final Design section 7/9.

import express from "express";
import { team1StaffAuthorizationAdapter } from "../middleware/team1StaffAuthorizationAdapter.js";
import { intakeSessionAuth } from "../middleware/intakeSessionAuth.js";
import * as intakeController from "../controllers/intakeController.js";

const router = express.Router();

// NOTE: These two routes are protected by Team 1's own isolated
// development/demo staff authorization adapter, NOT by
// middleware/authMiddleware.js. This is a deliberate, documented decision
// (see team1StaffAuthorizationAdapter.js for the full rationale): the
// existing Firebase-based authMiddleware.js is confirmed dead/unwired
// everywhere else in MediCare Pro, has no configured credentials in this
// environment, and — even if credentials existed — the live frontend login
// never issues a Firebase ID token for it to verify. Reusing it as
// originally planned would have made these two routes permanently
// unusable in this repository's current state, not merely in this one
// environment. See Team1StaffAuthorizationAdapter's file header for the
// exact, documented replacement point once real staff authentication
// exists.
router.post("/sessions", team1StaffAuthorizationAdapter, intakeController.createSession);
router.get("/sessions/:id", intakeSessionAuth, intakeController.getSession);
router.patch("/sessions/:id", intakeSessionAuth, intakeController.updateSession);
router.post("/sessions/:id/messages", intakeSessionAuth, intakeController.postMessage);
router.post("/sessions/:id/answers", intakeSessionAuth, intakeController.postAnswer);
router.get("/sessions/:id/history", intakeSessionAuth, intakeController.getHistory);
router.patch("/sessions/:id/history", intakeSessionAuth, intakeController.patchHistory);
router.post("/sessions/:id/complete", intakeSessionAuth, intakeController.completeSession);
router.get("/sessions/:id/export", team1StaffAuthorizationAdapter, intakeController.exportSession);

export default router;
