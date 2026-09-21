// Part 4 — Clinical Intelligence: runtime configuration.
// Everything is optional. With no environment variables set (and NODE_ENV != production)
// the module boots in demo mode with deterministic rules only — no DB, no Firebase, no AI key.

function bool(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function int(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === "production";
  const demoMode = bool(env.CLINICAL_DEMO_MODE, !isProd);
  const authMode = (env.CLINICAL_AUTH_MODE || (demoMode ? "demo" : "firebase")).toLowerCase();
  const aiProvider = (env.CLINICAL_AI_PROVIDER || (demoMode ? "mock" : "none")).toLowerCase();

  return Object.freeze({
    demoMode,
    authMode, // "demo" | "firebase"
    sessionSecret: env.CLINICAL_SESSION_SECRET || null, // random per-process secret when absent
    sessionTtlSeconds: int(env.CLINICAL_SESSION_TTL_SECONDS, 3600, 60, 86400),
    aiProvider, // "none" | "mock" | "anthropic"
    aiApiKey: env.ANTHROPIC_API_KEY || null, // never returned by any endpoint, never logged
    aiModel: env.CLINICAL_AI_MODEL || "claude-sonnet-5",
    aiTimeoutMs: int(env.CLINICAL_AI_TIMEOUT_MS, 20000, 1000, 120000),
    maxBodyBytes: int(env.CLINICAL_MAX_BODY_BYTES, 256 * 1024, 1024, 2 * 1024 * 1024),
    rateLimitPerMinute: int(env.CLINICAL_RATE_LIMIT_PER_MIN, 30, 1, 1000),
    maxStoredAnalyses: int(env.CLINICAL_MAX_STORED_ANALYSES, 200, 10, 5000),
  });
}
