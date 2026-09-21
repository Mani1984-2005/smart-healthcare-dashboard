import { VoiceError } from "../../errors/VoiceError";
import type { TranslationResult } from "../../types/voice";
import type { TranslateOptions, TranslationService } from "./TranslationService";

export interface HttpTranslationConfig {
  /**
   * URL of a backend proxy that performs the translation. The proxy owns any
   * provider credentials; this frontend adapter never holds an API key.
   * Request:  POST { text, sourceLanguage, targetLanguage }
   * Response: 200 { translatedText: string, provider?: string }
   */
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
}

/**
 * Generic adapter for a translation proxy. Without an endpoint it reports
 * TRANSLATION_UNAVAILABLE, which the UI turns into a usable message and
 * leaves the original text untouched.
 */
export class HttpTranslationService implements TranslationService {
  readonly id = "http-translation";
  readonly isDemo = false;

  private readonly config: HttpTranslationConfig;

  constructor(config: HttpTranslationConfig = {}) {
    this.config = config;
  }

  supports(sourceLanguage: string, targetLanguage: string): boolean {
    return Boolean(this.config.endpoint) && sourceLanguage !== targetLanguage;
  }

  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslateOptions = {},
  ): Promise<TranslationResult> {
    const { endpoint } = this.config;
    if (!endpoint) throw new VoiceError("TRANSLATION_UNAVAILABLE", "No translation endpoint configured");
    const online = this.config.isOnline ?? (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
    if (!online()) throw new VoiceError("NETWORK_OFFLINE", "Browser is offline");

    const fetchImpl = this.config.fetchImpl ?? fetch;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.config.timeoutMs ?? 10_000);
    const onExternalAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onExternalAbort, { once: true });

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
        signal: controller.signal,
        credentials: "same-origin",
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          throw new VoiceError("TRANSLATION_LANGUAGE_UNSUPPORTED", `Translation rejected (${response.status})`);
        }
        if (response.status >= 500) throw new VoiceError("SERVER_FAILURE", `Translation server error (${response.status})`);
        throw new VoiceError("TRANSLATION_UNAVAILABLE", `Translation request failed (${response.status})`);
      }

      const payload = (await response.json()) as { translatedText?: unknown; provider?: unknown };
      if (typeof payload.translatedText !== "string" || !payload.translatedText.trim()) {
        throw new VoiceError("SERVER_FAILURE", "Translation response was malformed");
      }
      return {
        translatedText: payload.translatedText,
        sourceLanguage,
        targetLanguage,
        provider: typeof payload.provider === "string" ? payload.provider : this.id,
        isDemo: false,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      if (timedOut || (error as { name?: string })?.name === "AbortError") {
        throw new VoiceError("TRANSLATION_TIMEOUT", "Translation request timed out", { cause: error });
      }
      throw new VoiceError("TRANSLATION_UNAVAILABLE", "Translation request failed", { cause: error });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onExternalAbort);
    }
  }
}
