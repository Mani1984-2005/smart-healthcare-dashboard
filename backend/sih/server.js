import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import patientRoutes from "./routes/patients.js";
import healthRoutes from "./routes/healthRoutes.js";
import { createPart6 } from "./part6/createPart6.js";
import { createPart6Router } from "./part6/routes/index.js";
import intakeRoutes from "./routes/intakeRoutes.js";
import physicianWorkspaceRoutes from "./routes/physicianWorkspaceRoutes.js";
import { createClinicalIntelligenceModule } from "./clinical-intelligence/index.js";
import { IntakeContextProvider } from "./integration/intakeToClinicalIntelligenceProvider.js";
import { createPart3Router } from "./part3/index.js";
import { configureClinicalIntelligenceStore } from "./services/physicianWorkspace/clinicalIntelligenceAdapter.js";
import { configureDocumentsStore } from "./services/physicianWorkspace/part3DocumentsAdapter.js";

dotenv.config();

const app = express();

app.use(cors());
// Part 6 (ABDM/FHIR/Consent/Security prototype). Self-contained and additive: it uses its own storage,
// auth and error handling, and a failure to start it must never take down the rest of the backend.
try {
  const part6 = createPart6();
  app.use(["/part6", "/api/part6"], createPart6Router(part6));
} catch (error) {
  console.error(`Part 6 was not mounted: ${error.message}`);
}

// SIH Part 4 — Clinical Intelligence (self-contained; mounted before the global JSON parser so it applies its own limits).
// contextProvider: Part 1 -> Part 4 bridge (backend/integration/intakeToClinicalIntelligenceProvider.js) — a
// composite that adds real, completed Part 1 intake sessions (id "INTAKE-<sessionId>") on top of Part 4's own six
// synthetic demo patients, which remain reachable exactly as before.
const intakeContextProvider = new IntakeContextProvider();
const clinicalIntelligence = createClinicalIntelligenceModule({ contextProvider: intakeContextProvider });
app.use(["/clinical-intelligence", "/api/clinical-intelligence"], clinicalIntelligence.router);
// Part 4 -> Part 5 bridge: gives the Physician Workspace read-only, in-process access to the SAME AnalysisStore
// instance Part 4's own router writes to (see services/physicianWorkspace/clinicalIntelligenceAdapter.js). This is
// not a second store — it is the store Part 4 already created, one line above.
configureClinicalIntelligenceStore(clinicalIntelligence.store);

// SIH Part 3 — Medical Documents & OCR (self-contained; own auth, own storage; uses its own body parsing for
// multipart/raw uploads, so mounted before the global JSON parser, matching Parts 4 and 6's own pattern).
// This is Part 3's own documented optional mount point (see part3/index.js and PART3_README.md section 1),
// applied verbatim rather than reimplemented.
try {
  const { router: part3Router, context: part3Context } = createPart3Router();
  app.use(["/part3", "/api/part3"], part3Router);
  // Part 3 -> Part 5 bridge: same reasoning as the Part 4 -> Part 5 line above — the SAME Part3Store instance
  // Part 3's own router reads and writes, not a second one.
  configureDocumentsStore(part3Context.store);
  // Part 3 -> Part 4 bridge: lets the Part 1 -> Part 4 context provider append completed-OCR document text as
  // free-text evidence (never a coded investigation — see intakeToClinicalIntelligenceProvider.js) for the same
  // patient. Optional and additive: if Part 3 fails to mount, Part 4 keeps working exactly as before this pass.
  intakeContextProvider.setPart3Store(part3Context.store);
} catch (error) {
  console.error(`Part 3 was not mounted: ${error.message}`);
}

app.use(express.json());

app.get("/", (req, res) => {
  res.send("MediCare Pro Backend Running 🚀");
});

app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);
app.use("/patients", patientRoutes);
// Part 1 — AI Clinical Intake (kiosk session API). Own auth boundary
// (team1StaffAuthorizationAdapter for staff routes, intakeSessionAuth for
// kiosk-session routes) — see routes/intakeRoutes.js.
app.use("/intake", intakeRoutes);
// Part 5 — Physician AI Workspace. Own demo-auth boundary
// (attachDemoUser/requireRole) — see routes/physicianWorkspaceRoutes.js.
app.use("/physician-workspace", physicianWorkspaceRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
