// Settings that are genuinely enforced by other services (consent duration limits) plus demo-only controls.
import { COLLECTIONS } from "../store/repository.js";
import { DEFAULT_SETTINGS, resetDemo } from "../seed/seed.js";
import { Errors } from "../errors.js";
import { actorFromUser } from "../audit/auditService.js";

export function createSettingsService({ repo, clock, audit, config }) {
  const get = () => ({ ...DEFAULT_SETTINGS, ...(repo.get(COLLECTIONS.settings, "global") ?? {}) });

  return {
    get,

    view() {
      return {
        settings: get(),
        environment: {
          abdmMode: config.abdmMode,
          fhirMode: config.fhirMode,
          fhirVersion: config.fhirVersion,
          storage: config.storage,
          demoAuth: config.demoAuth,
          tokenSecretSource: config.tokenSecretSource,
        },
        demoClock: { offsetDays: clock.offsetDays(), now: clock.now().toISOString() },
      };
    },

    update(user, input, req) {
      const errors = [];
      const next = { ...get() };
      if (input.maxConsentDurationDays !== undefined) {
        const v = input.maxConsentDurationDays;
        if (!Number.isInteger(v) || v < 1 || v > 365) errors.push("maxConsentDurationDays must be an integer from 1 to 365.");
        else next.maxConsentDurationDays = v;
      }
      if (input.defaultConsentDurationDays !== undefined) {
        const v = input.defaultConsentDurationDays;
        if (!Number.isInteger(v) || v < 1 || v > 365) errors.push("defaultConsentDurationDays must be an integer from 1 to 365.");
        else next.defaultConsentDurationDays = v;
      }
      if (next.defaultConsentDurationDays > next.maxConsentDurationDays) {
        errors.push("defaultConsentDurationDays cannot exceed maxConsentDurationDays.");
      }
      if (errors.length) throw Errors.validation("Settings are invalid.", errors);
      const before = get();
      repo.put(COLLECTIONS.settings, "global", next);
      audit.append({ actor: actorFromUser(user), action: "SETTINGS_CHANGED", resource: { type: "Settings", id: "global" }, req, metadata: { before, after: next } });
      return next;
    },

    advanceClock(user, days, req) {
      if (!Number.isFinite(days) || days <= 0 || days > 400) {
        throw Errors.validation("days must be a number greater than 0 and at most 400.");
      }
      clock.advanceDays(days);
      audit.append({ actor: actorFromUser(user), action: "DEMO_CLOCK_ADVANCED", resource: { type: "DemoClock", id: "offset" }, req, metadata: { advancedByDays: days, offsetDays: clock.offsetDays() } });
      return { offsetDays: clock.offsetDays(), now: clock.now().toISOString() };
    },

    reset(user, req) {
      resetDemo({ repo, clock, audit, actor: actorFromUser(user) });
      void req;
      return { ok: true };
    },
  };
}
