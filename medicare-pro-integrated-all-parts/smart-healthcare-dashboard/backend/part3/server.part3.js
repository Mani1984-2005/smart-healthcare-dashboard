// Standalone Part 3 API server:  npm run part3:api
// Runs WITHOUT the rest of the MediCare Pro backend, without Postgres, Firebase or any other SIH module.
import cors from "cors";
import { createPart3App, loadConfig } from "./index.js";

const config = loadConfig();
// Strict CORS for the standalone server (the app-level open cors() of the main backend does not apply here).
const { app } = createPart3App({
  config,
  beforeRoutes: cors({ origin: config.allowedOrigins, methods: ["GET", "POST"], allowedHeaders: ["Authorization", "Content-Type"] }),
});

app.listen(config.port, () => {
  console.log(JSON.stringify({ level: "info", service: "part3", message: `Part 3 (Medical Documents & OCR) listening on port ${config.port}`, authMode: config.auth.mode, storage: config.dataDir ? "file" : "memory", ocrProviders: config.ocr.enabledProviders }));
});
