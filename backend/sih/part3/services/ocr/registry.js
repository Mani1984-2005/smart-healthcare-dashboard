import { createSyntheticFixtureProvider } from "./syntheticFixtureProvider.js";

const describe = (p) => ({ id: p.id, label: p.label, kind: p.kind, version: p.version, description: p.description, capabilities: p.capabilities });

/** Providers are opt-in via PART3_OCR_PROVIDERS. `extraProviders` lets callers/tests plug in a real engine. */
export function createOcrRegistry({ config, fixtures, extraProviders = [] }) {
  const known = [createSyntheticFixtureProvider(fixtures), ...extraProviders];
  const enabled = known.filter((p) => config.ocr.enabledProviders.includes(p.id));
  const defaultProvider = enabled.find((p) => p.id === config.ocr.defaultProviderId) ?? enabled[0] ?? null;
  return {
    get: (id) => (id ? enabled.find((p) => p.id === id) ?? null : defaultProvider),
    defaultId: defaultProvider?.id ?? null,
    async list() {
      return Promise.all(enabled.map(async (p) => ({ ...describe(p), isDefault: p === defaultProvider, availability: p.isAvailable ? await p.isAvailable().catch((e) => ({ available: false, reason: e.message })) : { available: true } })));
    },
  };
}
