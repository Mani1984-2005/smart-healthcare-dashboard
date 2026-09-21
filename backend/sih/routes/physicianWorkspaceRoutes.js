// backend/routes/physicianWorkspaceRoutes.js
//
// Part 5 — Physician AI Workspace routes.
// Self-contained boundary: /physician-workspace/*
// Mounted once, additively, in backend/server.js.

import express from "express";
import { attachDemoUser, requireRole } from "../middleware/physicianWorkspaceAuth.js";
import * as controller from "../controllers/physicianWorkspaceController.js";

const router = express.Router();

const PHYSICIAN_ROLES = ["DOCTOR", "ADMIN"];
const READ_ROLES = ["DOCTOR", "ADMIN", "NURSE"];

// Every route in this module requires a demo-authenticated user.
router.use(attachDemoUser);

router.get("/cases", requireRole(...READ_ROLES), controller.listCases);
router.get("/cases/:caseId", requireRole(...READ_ROLES), controller.getCase);
// Part 1 -> Part 5 bridge (see backend/services/physicianWorkspace/intakeRecordAdapter.js).
// Read-only: opens/refreshes a real, completed Part 1 intake session as a
// case in this workspace. Same read-role gate as the rest of the case views.
router.get("/cases/from-intake/:intakeSessionId", requireRole(...READ_ROLES), controller.openFromIntakeSession);
// Part 3 -> Part 5 bridge (see backend/services/physicianWorkspace/part3DocumentsAdapter.js). Read-only; same gate.
router.get("/cases/:caseId/documents", requireRole(...READ_ROLES), controller.getCaseDocuments);
// Part 4 -> Part 5 bridge (see backend/services/physicianWorkspace/clinicalIntelligenceAdapter.js). Read-only; same gate.
router.get("/cases/:caseId/clinical-intelligence", requireRole(...READ_ROLES), controller.getCaseClinicalIntelligence);

router.post("/summaries/generate", requireRole(...PHYSICIAN_ROLES), controller.generateSummary);
router.get("/summaries/:summaryId", requireRole(...READ_ROLES), controller.getSummary);
router.put("/summaries/:summaryId", requireRole(...PHYSICIAN_ROLES), controller.editSummary);
router.post("/summaries/:summaryId/approve", requireRole(...PHYSICIAN_ROLES), controller.approveSummary);
router.post("/summaries/:summaryId/reject", requireRole(...PHYSICIAN_ROLES), controller.rejectSummary);
router.post("/summaries/:summaryId/revise", requireRole(...PHYSICIAN_ROLES), controller.reviseSummary);
router.get("/summaries/:summaryId/versions", requireRole(...READ_ROLES), controller.listVersions);
router.get("/summaries/:summaryId/audit", requireRole(...READ_ROLES), controller.listAudit);

export default router;
