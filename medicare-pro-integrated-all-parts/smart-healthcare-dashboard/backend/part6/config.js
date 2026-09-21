// Part 6 configuration. Everything comes from environment variables; nothing secret is hard-coded.
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toBool = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const toInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/**
 * Build the Part 6 configuration.
 * `overrides` exists for tests and for embedding Part 6 in another host.
 */
export function loadConfig(env = process.env, overrides = {}) {
  const isProduction = env.NODE_ENV === "production";

  const abdmMode = (overrides.abdmMode ?? env.ABDM_MODE ?? "demo").toLowerCase();
  const fhirMode = (overrides.fhirMode ?? env.FHIR_MODE ?? "demo").toLowerCase();

  // Honesty guard: this prototype has NO live ABDM/FHIR-server connectivity.
  // Refuse to start in a mode that would imply otherwise instead of silently faking it.
  if (abdmMode !== "demo") {
    throw new Error(
      `ABDM_MODE="${abdmMode}" is not supported. Part 6 is an ABDM-ready prototype; only ABDM_MODE=demo is implemented.`
    );
  }
  if (fhirMode !== "demo") {
    throw new Error(`FHIR_MODE="${fhirMode}" is not supported. Only FHIR_MODE=demo is implemented.`);
  }

  const providedSecret = overrides.tokenSecret ?? env.PART6_TOKEN_SECRET ?? "";
  if (providedSecret && providedSecret.length < 32) {
    throw new Error("PART6_TOKEN_SECRET must be at least 32 characters.");
  }

  const demoAuth = overrides.demoAuth ?? toBool(env.PART6_DEMO_AUTH, !isProduction);
  if (isProduction && demoAuth) {
    throw new Error("PART6_DEMO_AUTH must not be enabled when NODE_ENV=production.");
  }
  if (isProduction && !providedSecret) {
    throw new Error("PART6_TOKEN_SECRET is required when NODE_ENV=production.");
  }

  const storage = (overrides.storage ?? env.PART6_STORAGE ?? "file").toLowerCase();
  if (!["file", "memory"].includes(storage)) {
    throw new Error('PART6_STORAGE must be "file" or "memory".');
  }
  const dataDir = overrides.dataDir ?? env.PART6_DATA_DIR ?? path.join(__dirname, ".data");

  return Object.freeze({
    abdmMode,
    fhirMode,
    fhirVersion: overrides.fhirVersion ?? env.FHIR_VERSION ?? "4.0.1",
    isProduction,
    demoAuth,
    storage,
    storageFile: path.join(dataDir, "part6-store.json"),
    // When no secret is configured an ephemeral one is generated: sessions die on restart.
    tokenSecret: providedSecret || crypto.randomBytes(32).toString("hex"),
    tokenSecretSource: providedSecret ? "environment" : "ephemeral",
    tokenTtlSeconds: overrides.tokenTtlSeconds ?? toInt(env.PART6_TOKEN_TTL_SECONDS, 3600, 60, 86400),
    rateLimit: {
      windowMs: overrides.rateWindowMs ?? 60_000,
      max: overrides.rateMax ?? toInt(env.PART6_RATE_LIMIT_MAX, 600, 5, 100_000),
      loginMax: overrides.rateLoginMax ?? toInt(env.PART6_LOGIN_RATE_LIMIT_MAX, 20, 3, 10_000),
    },
    corsOrigins: (overrides.corsOrigins ?? env.PART6_CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    bodyLimit: "256kb",
    fhirBaseUrl: "https://medicare-pro.example/fhir", // reserved .example domain: not a real endpoint
    port: toInt(overrides.port ?? env.PART6_PORT ?? env.PORT, 5000, 1, 65535),
  });
}

/** The subset of configuration that is safe to show to a client. Never includes secrets. */
export function publicConfig(config) {
  return {
    abdmMode: config.abdmMode,
    fhirMode: config.fhirMode,
    fhirVersion: config.fhirVersion,
    storage: config.storage,
    demoAuth: config.demoAuth,
    tokenSecretSource: config.tokenSecretSource,
    tokenTtlSeconds: config.tokenTtlSeconds,
    rateLimit: { windowMs: config.rateLimit.windowMs, max: config.rateLimit.max },
  };
}
