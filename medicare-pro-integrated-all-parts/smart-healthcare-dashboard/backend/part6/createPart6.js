// Composition root for Part 6. Builds every service from a config + repository.
// Part 6 imports NOTHING from any other MediCare Pro module.
import path from "node:path";
import { loadConfig } from "./config.js";
import { createRepository } from "./store/repository.js";
import { createClock } from "./clock.js";
import { createAuditService } from "./audit/auditService.js";
import { createDemoRecordSource } from "./adapters/recordSource.js";
import { seedIfEmpty } from "./seed/seed.js";
import { createSettingsService } from "./services/settingsService.js";
import { createSecurityService } from "./services/securityService.js";
import { createIdentityService } from "./services/identityService.js";
import { createFHIRService } from "./services/fhirService.js";
import { createConsentService } from "./consent/consentService.js";
import { createShareService } from "./share/shareService.js";
import { createOverviewService } from "./services/overviewService.js";
import { createInteroperabilityService } from "./services/interoperabilityService.js";
import { createRateLimiter } from "./security/rateLimit.js";

export function createPart6({ config = loadConfig(), repo, source } = {}) {
  const store =
    repo ??
    createRepository({
      mode: config.storage,
      filePath: config.storage === "file" ? path.resolve(config.storageFile) : undefined,
    });
  const clock = createClock(store);
  const audit = createAuditService({ repo: store, clock });
  const records = source ?? createDemoRecordSource(store); // swap for an adapter to integrate another system
  seedIfEmpty({ repo: store, clock, audit });

  const settings = createSettingsService({ repo: store, clock, audit, config });
  const security = createSecurityService({ repo: store, audit, config, clock });
  const identity = createIdentityService({ source: records, audit, security });
  const fhir = createFHIRService({ repo: store, source: records, clock, audit, config, security });
  const consent = createConsentService({ repo: store, source: records, clock, audit, settings, security });
  const share = createShareService({ repo: store, source: records, clock, audit, consent, fhir, config });
  const overview = createOverviewService({ repo: store, source: records, audit, consent, share, fhir, config });
  const interoperability = createInteroperabilityService({ fhir, consent, share, identity, security, audit, overview, settings });

  const limiter = createRateLimiter(config.rateLimit);
  const loginLimiter = createRateLimiter({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.loginMax });

  return { config, repo: store, clock, audit, source: records, settings, security, identity, fhir, consent, share, overview, interoperability, limiter, loginLimiter };
}
