// Part 4 — Clinical Intelligence module entry point.
// Usage (server.js):  app.use(["/clinical-intelligence", "/api/clinical-intelligence"], createClinicalIntelligenceRouter());
// Every dependency can be injected, which is how tests run with no network, no DB, no Firebase and no AI key.
import { loadConfig } from "./config.js";
import { DemoContextProvider } from "./providers/contextProvider.js";
import { createAIProvider } from "./providers/aiAdapter.js";
import { AnthropicProvider } from "./providers/anthropicProvider.js";
import { AnalysisStore, createAuditSink, createRateLimiter } from "./service/stores.js";
import { createClinicalIntelligenceService } from "./service/clinicalIntelligenceService.js";
import { createReviewService } from "./service/reviewService.js";
import { createSessionManager, createAuthenticator } from "./http/auth.js";
import { buildRouter } from "./http/routes.js";

export function createClinicalIntelligenceModule(overrides = {}) {
  const config = overrides.config ?? loadConfig();
  const store = new AnalysisStore(config.maxStoredAnalyses);

  // Optional reuse of the existing MediCare Pro audit logger (metadata only). Loaded lazily; absence is harmless.
  let forward = null;
  if (overrides.forwardAudit !== false && overrides.audit === undefined) {
    import("../utils/logger.js").then((m) => { forward = m.logAuditEvent; }).catch(() => {});
  }
  const audit = overrides.audit ?? createAuditSink({ external: (e) => forward?.({ module: "clinical-intelligence", ...e }) });

  const aiProvider = overrides.aiProvider ?? createAIProvider(config, { fetchImpl: overrides.fetchImpl, loadAnthropic: (o) => new AnthropicProvider(o) });
  const contextProvider = overrides.contextProvider ?? new DemoContextProvider();
  const clock = overrides.clock ?? (() => Date.now());
  const service = createClinicalIntelligenceService({ config, contextProvider, aiProvider, store, audit, clock });
  const reviews = createReviewService({ store, audit, clock });
  const sessions = createSessionManager({ secret: config.sessionSecret, ttlSeconds: config.sessionTtlSeconds, now: clock });
  const authenticate = createAuthenticator({ config, sessions, firebaseLoader: overrides.firebaseLoader });
  const allowRate = overrides.allowRate ?? createRateLimiter({ max: config.rateLimitPerMinute });
  const router = buildRouter({ config, sessions, authenticate, service, reviews, allowRate });
  return { router, config, service, reviews, sessions, audit, store, aiProvider };
}

export function createClinicalIntelligenceRouter(overrides) {
  return createClinicalIntelligenceModule(overrides).router;
}

export default createClinicalIntelligenceRouter;
