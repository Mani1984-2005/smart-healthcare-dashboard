// backend/services/aiAdapter.js
//
// Team 1 — Provider-agnostic AI adapter (Phase 2 Final Design, item 1).
//
// NO provider SDK is installed or referenced here. This file defines
// only the interface and a NullProvider default. A real provider can be
// plugged in later purely by implementing AiProvider and changing the
// one export at the bottom — nothing in questionEngine.js,
// clinicalHistoryService.js, intakeService.js, the API contract, the
// frontend, or the database schema needs to change when that happens.
//
// The deterministic question engine (questionEngine.js) NEVER calls
// this adapter and never depends on its result — it is only ever
// consulted, optionally, by intakeService.js for two narrow,
// non-diagnostic assistive tasks.

/**
 * @typedef {Object} AiProvider
 * @property {(text: string) => Promise<{category: string, confidence: number}|null>} classifySymptom
 *   Assistive only — the deterministic keyword classifier in
 *   questionEngine.js remains the source of truth; this is never
 *   required for the kiosk to function.
 * @property {(answers: object) => Promise<string|null>} summarizeForReview
 *   Produces a plain-language summary string for the review screen.
 *   Never produces a diagnosis, treatment, or medication suggestion.
 */

/** Always-available default: the kiosk is fully functional with this alone. */
export class NullAiProvider {
  async classifySymptom(_text) {
    return null;
  }
  async summarizeForReview(_answers) {
    return null;
  }
}

const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Wraps any AiProvider with a timeout and safe-failure behavior so that
 * callers never need their own try/catch/timeout logic. On timeout,
 * error, or malformed response, resolves to null — never throws.
 */
export class AiAdapter {
  /** @param {AiProvider} [provider] */
  constructor(provider = new NullAiProvider()) {
    this.provider = provider;
  }

  async #withTimeout(promise) {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), DEFAULT_TIMEOUT_MS);
    });
    try {
      return await Promise.race([promise, timeout]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** @param {string} text */
  async classifySymptom(text) {
    const result = await this.#withTimeout(this.provider.classifySymptom(text));
    if (!result || typeof result.category !== "string") return null;
    return result;
  }

  /** @param {object} answers */
  async summarizeForReview(answers) {
    const result = await this.#withTimeout(this.provider.summarizeForReview(answers));
    if (typeof result !== "string") return null;
    // Safety allowlist filter: strip anything resembling a diagnosis or
    // treatment recommendation that a provider might smuggle in, even
    // though the prompt boundary should already prevent it.
    const forbidden = /\b(diagnos|prescri|recommend(ed)? (treatment|medication)|you have (a|an)\s)\b/i;
    if (forbidden.test(result)) return null;
    return result;
  }
}

// Default export: NullProvider-backed adapter. No provider SDK selected.
export const defaultAiAdapter = new AiAdapter(new NullAiProvider());
