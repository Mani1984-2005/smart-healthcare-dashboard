import type { TranslationResult } from "../../types/voice";

export interface TranslateOptions {
  signal?: AbortSignal;
}

/**
 * Provider-neutral translation contract. Implementations must never modify
 * or discard the source text: callers keep the original alongside the result.
 * Mixed-language input (for example Kannada with English words) is passed
 * through as written; providers decide how to handle it.
 */
export interface TranslationService {
  readonly id: string;
  readonly isDemo: boolean;

  supports(sourceLanguage: string, targetLanguage: string): boolean;
  translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options?: TranslateOptions,
  ): Promise<TranslationResult>;
}
