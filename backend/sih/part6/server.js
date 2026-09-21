// Standalone Part 6 server: runs Part 6 ALONE, with no dependency on the rest of the MediCare Pro backend
// (no Postgres, no Firebase). Same routes as when Part 6 is mounted inside backend/server.js.
//   npm run part6:start        (default port 5000 so the existing Vite /api proxy works unchanged)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { loadConfig } from "./config.js";
import { createPart6 } from "./createPart6.js";
import { createPart6Router } from "./routes/index.js";

dotenv.config();

const config = loadConfig();
const part6 = createPart6({ config });
const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
const router = createPart6Router(part6);
app.use(["/part6", "/api/part6"], router);
app.get("/health", (_req, res) => res.json({ success: true, service: "part6-standalone", mode: config.abdmMode }));

const server = app.listen(config.port, () => {
  console.log(`Part 6 (ABDM/FHIR/Consent/Security demo prototype) listening on :${config.port}`);
  console.log(`ABDM_MODE=${config.abdmMode} FHIR_MODE=${config.fhirMode} storage=${config.storage} tokenSecret=${config.tokenSecretSource}`);
  if (config.tokenSecretSource === "ephemeral") console.log("PART6_TOKEN_SECRET not set: using an ephemeral secret (sessions reset on restart).");
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    part6.repo.flush();
    server.close(() => process.exit(0));
  });
}
process.on("exit", () => part6.repo.flush());
