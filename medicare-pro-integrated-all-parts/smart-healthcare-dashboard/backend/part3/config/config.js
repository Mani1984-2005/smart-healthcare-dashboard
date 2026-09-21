// Part 3 — configuration. Reads only PART3_* variables (plus NODE_ENV / PORT); never touches other modules' env.
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PART3_ROOT = path.resolve(here, "..");

const toInt = (value, fallback) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const toBool = (value, fallback) =>
  value === undefined ? fallback : ["1", "true", "yes"].includes(String(value).toLowerCase());

/**
 * @param {Record<string,string|undefined>} env
 * @param {object} overrides shallow per-section overrides (used by tests)
 */
export function loadConfig(env = process.env, overrides = {}) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const authMode = env.PART3_AUTH_MODE || "demo";

  if (authMode !== "demo") {
    throw new Error(`PART3_AUTH_MODE="${authMode}" is not implemented. Only "demo" sessions exist; see docs/part3/README.md (auth boundary).`);
  }
  if (isProduction && !toBool(env.PART3_ALLOW_DEMO_AUTH, false)) {
    throw new Error("Part 3 demo sessions do not provide real authentication. Refusing to start with NODE_ENV=production unless PART3_ALLOW_DEMO_AUTH=true.");
  }

  const dataDirEnv = env.PART3_DATA_DIR;
  const config = {
    nodeEnv,
    port: toInt(env.PART3_PORT ?? env.PORT, 5000),
    dataDir: dataDirEnv === "memory" ? null : path.resolve(dataDirEnv || path.join(PART3_ROOT, ".data")),
    maxUploadBytes: toInt(env.PART3_MAX_UPLOAD_MB, 10) * 1024 * 1024,
    maxOcrTextChars: 500_000,
    auth: {
      mode: authMode,
      // No hard-coded secret: if none is supplied a random per-process secret is used (sessions then reset on restart).
      secret: env.PART3_DEMO_SECRET || crypto.randomBytes(32).toString("hex"),
      sessionTtlSeconds: toInt(env.PART3_SESSION_TTL_SECONDS, 8 * 3600),
    },
    ocr: {
      enabledProviders: (env.PART3_OCR_PROVIDERS || "synthetic-demo").split(",").map((s) => s.trim()).filter(Boolean),
      defaultProviderId: env.PART3_OCR_DEFAULT || null,
      timeoutMs: toInt(env.PART3_OCR_TIMEOUT_MS, 30_000),
    },
    rateLimit: { windowMs: 60_000, sessionMax: 30, uploadMax: 60, processMax: 120 },
    allowedOrigins: (env.PART3_ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((s) => s.trim()).filter(Boolean),
    enableDemoReset: toBool(env.PART3_ENABLE_DEMO_RESET, !isProduction),
  };

  for (const section of ["auth", "ocr", "rateLimit"]) {
    if (overrides[section]) config[section] = { ...config[section], ...overrides[section] };
  }
  for (const key of Object.keys(overrides)) {
    if (!["auth", "ocr", "rateLimit"].includes(key)) config[key] = overrides[key];
  }
  return config;
}
