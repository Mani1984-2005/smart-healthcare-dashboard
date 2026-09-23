import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.local") });

import patientRoutes from "./routes/patients.js";
import routeIndex from "./routes/index.js";
import healthRoutes from "./routes/healthRoutes.js";
import intakeRoutes from "./sih/routes/intakeRoutes.js";
import physicianWorkspaceRoutes from "./sih/routes/physicianWorkspaceRoutes.js";
import { createPart6 } from "./sih/part6/createPart6.js";
import { createPart6Router } from "./sih/part6/routes/index.js";
import { createClinicalIntelligenceModule } from "./sih/clinical-intelligence/index.js";
import { createPart3Router } from "./sih/part3/index.js";
import { ensureDevDoctorSeed } from "./scripts/seed-dev-doctors.js";
// Phase 1 — existing cross-part integration mechanisms (all three already ship in
// backend/sih/*; nothing new is implemented here, they are only wired into the host
// server the same way backend/sih/server.js wires them).
import { IntakeContextProvider } from "./sih/integration/intakeToClinicalIntelligenceProvider.js";
import { configureClinicalIntelligenceStore } from "./sih/services/physicianWorkspace/clinicalIntelligenceAdapter.js";
import { configureDocumentsStore } from "./sih/services/physicianWorkspace/part3DocumentsAdapter.js";

export const app = express();

app.use(cors());
app.use(express.json());

try {
  const part6 = createPart6();
  app.use(["/part6", "/api/part6"], createPart6Router(part6));
} catch (error) {
  console.error("Part 6 was not mounted:", error);
}

const intakeContextProvider = new IntakeContextProvider();
try {
  const clinicalIntelligence = createClinicalIntelligenceModule({ contextProvider: intakeContextProvider });
  app.use(["/clinical-intelligence", "/api/clinical-intelligence"], clinicalIntelligence.router);
  configureClinicalIntelligenceStore(clinicalIntelligence.store);
} catch (error) {
  console.error("Clinical intelligence module was not mounted:", error);
}

try {
  const { router: part3Router, context: part3Context } = createPart3Router();
  app.use(["/part3", "/api/part3"], part3Router);
  configureDocumentsStore(part3Context.store);
  intakeContextProvider.setPart3Store(part3Context.store);
} catch (error) {
  console.error("Part 3 module was not mounted:", error);
}

app.get("/", (req, res) => {
  res.send("MediCare Pro Backend Running 🚀");
});

app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/v1", routeIndex);
app.use("/patients", patientRoutes);
app.use("/intake", intakeRoutes);
app.use("/physician-workspace", physicianWorkspaceRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  try {
    const doctorSeedResult = await ensureDevDoctorSeed();
    console.log(`[server] doctor seed -> created=${doctorSeedResult.created} total=${doctorSeedResult.total} skipped=${Boolean(doctorSeedResult.skipped)}`);
  } catch (error) {
    console.warn("[server] doctor seed skipped due to startup issue:", error?.message || error);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
