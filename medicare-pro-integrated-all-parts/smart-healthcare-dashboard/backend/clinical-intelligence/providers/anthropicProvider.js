// Part 4 — OPTIONAL external provider (Anthropic Messages API). Only constructed when CLINICAL_AI_PROVIDER=anthropic and
// ANTHROPIC_API_KEY are both set. The API key is used only in a request header and never appears in logs, errors or
// responses. Output is untrusted and always passes through safety/aiValidation.js before any use.
import { AIProviderError } from "./aiAdapter.js";

const SYSTEM = [
  "You assist clinicians by re-stating a patient record. You are not a doctor and you never diagnose or prescribe.",
  "Use ONLY the supplied sources. Never invent patient data, values, medications, allergies or history.",
  "Never state a definite diagnosis; use language such as 'may be consistent with'. Never recommend starting, stopping or changing a medication or dose.",
  "Never say anything is clinician-approved. Do not include any number that is not in the sources.",
  "Respond with a single JSON object and nothing else, matching: {\"narrative\": string (max 2000 chars), \"citedRefs\": string[] (refs taken from the sources list, at least 1),",
  "\"considerations\": [{\"condition\": string, \"supportingRefs\": string[], \"missingInformation\": string[], \"reasoning\": string}] (max 3, optional)}.",
].join(" ");

export class AnthropicProvider {
  constructor({ apiKey, model, timeoutMs, fetchImpl }) {
    this.name = "anthropic"; this.kind = "external"; this.model = model; this.available = true; this.reason = null;
    this.apiKey = apiKey; this.timeoutMs = timeoutMs; this.fetchImpl = fetchImpl ?? globalThis.fetch;
  }

  async generate({ context, sources }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: this.model, max_tokens: 1200, system: SYSTEM,
          messages: [{ role: "user", content: JSON.stringify({ sources, record: context }) }],
        }),
      });
      if (!res.ok) throw new AIProviderError(res.status === 429 ? "rate_limited" : "bad_status");
      const data = await res.json();
      const text = (data?.content ?? []).filter((b) => b?.type === "text").map((b) => b.text).join("");
      return { raw: text, model: data?.model ?? this.model };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(err?.name === "AbortError" ? "timeout" : "unavailable");
    } finally {
      clearTimeout(timer);
    }
  }
}
