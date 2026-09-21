import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import patientRoutes from "./routes/patients.js";
import healthRoutes from "./routes/healthRoutes.js";
import intakeRoutes from "./sih/routes/intakeRoutes.js";
import physicianWorkspaceRoutes from "./sih/routes/physicianWorkspaceRoutes.js";
import { createPart6 } from "./sih/part6/createPart6.js";
import { createPart6Router } from "./sih/part6/routes/index.js";
import { createClinicalIntelligenceModule } from "./sih/clinical-intelligence/index.js";
import { createPart3Router } from "./sih/part3/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

try {
  const part6 = createPart6();
  app.use(["/part6", "/api/part6"], createPart6Router(part6));
} catch (error) {
  console.error("Part 6 was not mounted:", error);
}

try {
  const clinicalIntelligence = createClinicalIntelligenceModule();
  app.use(["/clinical-intelligence", "/api/clinical-intelligence"], clinicalIntelligence.router);
} catch (error) {
  console.error("Clinical intelligence module was not mounted:", error);
}

try {
  const { router: part3Router } = createPart3Router();
  app.use(["/part3", "/api/part3"], part3Router);
} catch (error) {
  console.error("Part 3 module was not mounted:", error);
}

app.get("/", (req, res) => {
  res.send("MediCare Pro Backend Running 🚀");
});

app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/patients", patientRoutes);
app.use("/intake", intakeRoutes);
app.use("/physician-workspace", physicianWorkspaceRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
