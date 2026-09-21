// Part 4 — AI provider abstraction.   ClinicalIntelligenceService → AIProvider adapter → provider
// A provider only has to implement generate({ context, sources, allowedRefs }) and return { raw, model }.
// Nothing in the engine depends on a specific vendor, and the module is fully functional with NO provider.

export class AIProviderError extends Error {
  constructor(code) { super(code); this.name = "AIProviderError"; this.code = code; }
}

/** No AI available. The service reports "not_configured" and continues with deterministic output only. */
export class NullProvider {
  constructor(reason = "no_provider_configured") { this.name = "none"; this.kind = "none"; this.model = null; this.available = false; this.reason = reason; }
  async generate() { throw new AIProviderError("not_configured"); }
}

/**
 * Deterministic stand-in used in demo mode. It is NOT a language model: it re-phrases a few recorded facts using a
 * fixed template so the AI-labelled parts of the UI can be demonstrated without any external service.
 */
export class MockProvider {
  constructor({ respond } = {}) { this.name = "mock"; this.kind = "mock"; this.model = "deterministic-template-v1"; this.available = true; this.reason = null; this.respond = respond; }
  async generate(request) {
    if (this.respond) return { raw: await this.respond(request), model: this.model };
    const { context, sources } = request;
    const enc = [...context.encounters].sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
    const cited = [];
    let narrative;
    if (!enc) {
      narrative = "No encounter is recorded for this patient, so no narrative can be drafted.";
      cited.push("medications:status");
    } else {
      const present = enc.symptoms.map((s, i) => ({ s, ref: `enc:${enc.id}.symptom.${i}` })).filter(({ s }) => s.present === true);
      narrative = `Mock draft (template, not a language model). Latest encounter dated ${enc.date}.` +
        (enc.chiefComplaint ? ` The recorded complaint is “${enc.chiefComplaint}”.` : " No chief complaint is recorded.") +
        (present.length ? ` Symptoms documented as present: ${[...new Set(present.map(({ s }) => s.name.toLowerCase()))].join(", ")}.` : " No symptoms are documented as present.") +
        " This draft restates the record only and needs clinician review.";
      if (enc.chiefComplaint) cited.push(`enc:${enc.id}.complaint`);
      present.forEach(({ ref }) => cited.push(ref));
      if (!cited.length) cited.push(`enc:${enc.id}`);
    }
    const known = new Set(sources.map((x) => x.ref));
    return { raw: { narrative, citedRefs: cited.filter((r) => known.has(r)).slice(0, 60), considerations: [] }, model: this.model };
  }
}

export function createAIProvider(config, { fetchImpl, loadAnthropic } = {}) {
  if (config.aiProvider === "mock") return new MockProvider();
  if (config.aiProvider === "anthropic") {
    if (!config.aiApiKey) return new NullProvider("missing_api_key");
    return (loadAnthropic ?? (() => { throw new Error("anthropic provider not loaded"); }))({ apiKey: config.aiApiKey, model: config.aiModel, timeoutMs: config.aiTimeoutMs, fetchImpl });
  }
  return new NullProvider(config.aiProvider === "none" ? "disabled" : "unknown_provider");
}
