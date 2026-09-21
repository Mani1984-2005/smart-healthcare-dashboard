import { VoiceError } from "../../errors/VoiceError";
import { primarySubtag } from "../../config/languages";
import type { TranslationResult, VoiceErrorCode } from "../../types/voice";
import { DEMO_PHRASES, type DemoPhrase } from "../speech/demoSamples";
import type { TranslateOptions, TranslationService } from "./TranslationService";

export interface MockTranslationOptions {
  latencyMs?: number;
  failWith?: VoiceErrorCode;
  phrases?: DemoPhrase[];
}

const DEMO_LANGUAGES = ["en", "hi", "kn"] as const;
type DemoLanguage = (typeof DEMO_LANGUAGES)[number];

function isDemoLanguage(primary: string): primary is DemoLanguage {
  return (DEMO_LANGUAGES as readonly string[]).includes(primary);
}

/** Case-, spacing- and end-punctuation-insensitive key for phrase lookup. */
export function normalizePhrase(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s.,!?।]+$/u, "")
    .trim();
}

/**
 * Demo translator backed by a tiny phrase table. It only translates the
 * sample sentences and refuses everything else with TRANSLATION_DEMO_ONLY
 * instead of inventing a translation.
 */
export class MockTranslationService implements TranslationService {
  readonly id = "mock-translation";
  readonly isDemo = true;

  private readonly options: MockTranslationOptions;
  private readonly index = new Map<string, DemoPhrase>();

  constructor(options: MockTranslationOptions = {}) {
    this.options = options;
    for (const phrase of options.phrases ?? DEMO_PHRASES) {
      for (const language of DEMO_LANGUAGES) this.index.set(normalizePhrase(phrase[language]), phrase);
    }
  }

  supports(sourceLanguage: string, targetLanguage: string): boolean {
    const source = primarySubtag(sourceLanguage);
    const target = primarySubtag(targetLanguage);
    return source !== target && isDemoLanguage(source) && isDemoLanguage(target);
  }

  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslateOptions = {},
  ): Promise<TranslationResult> {
    if (!this.supports(sourceLanguage, targetLanguage)) {
      throw new VoiceError("TRANSLATION_LANGUAGE_UNSUPPORTED", "Mock translator cannot handle this language pair");
    }
    await this.wait(this.options.latencyMs ?? 400, options.signal);
    if (this.options.failWith) throw new VoiceError(this.options.failWith, "Mock translation failure");

    const phrase = this.index.get(normalizePhrase(text));
    if (!phrase) throw new VoiceError("TRANSLATION_DEMO_ONLY", "Text is not one of the demo sentences");

    return {
      translatedText: phrase[primarySubtag(targetLanguage) as DemoLanguage],
      sourceLanguage,
      targetLanguage,
      provider: this.id,
      isDemo: true,
    };
  }

  private wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new VoiceError("TRANSLATION_TIMEOUT", "Translation aborted"));
        return;
      }
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new VoiceError("TRANSLATION_TIMEOUT", "Translation aborted"));
        },
        { once: true },
      );
    });
  }
}
