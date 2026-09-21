import type { LanguageCode, VoiceLanguage } from "../types/voice";

/**
 * Language registry. Adding a language means:
 *  1. add an entry here (or call registerLanguage),
 *  2. add a locale bundle in locales/ (until then the UI falls back to English),
 *  3. optionally add demo sentences for the mock providers.
 * Nothing else in the module hard-codes a language.
 */
const registry: VoiceLanguage[] = [
  { code: "en-IN", primary: "en", label: "English", nativeLabel: "English", script: "Latn", direction: "ltr" },
  { code: "hi-IN", primary: "hi", label: "Hindi", nativeLabel: "हिन्दी", script: "Deva", direction: "ltr" },
  { code: "kn-IN", primary: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", script: "Knda", direction: "ltr" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en-IN";

export function listLanguages(): VoiceLanguage[] {
  return [...registry];
}

export function primarySubtag(code: string): string {
  return code.split(/[-_]/)[0]?.toLowerCase() ?? "";
}

export function getLanguage(code: string | null | undefined): VoiceLanguage | undefined {
  if (!code) return undefined;
  const normalized = code.replace("_", "-").toLowerCase();
  return registry.find((language) => language.code.toLowerCase() === normalized);
}

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return getLanguage(code) !== undefined;
}

/** Returns a registered language code, falling back to the default for unknown input. */
export function resolveLanguage(code: string | null | undefined): LanguageCode {
  return getLanguage(code)?.code ?? DEFAULT_LANGUAGE;
}

export function registerLanguage(language: VoiceLanguage): void {
  const existing = registry.findIndex((item) => item.code.toLowerCase() === language.code.toLowerCase());
  if (existing >= 0) registry[existing] = language;
  else registry.push(language);
}

/**
 * Default translation target: English for non-English speakers, otherwise the
 * first other registered language. The person can change it in the UI.
 */
export function defaultTranslationTarget(source: LanguageCode): LanguageCode {
  const sourcePrimary = primarySubtag(source);
  if (sourcePrimary !== "en") return "en-IN";
  return registry.find((language) => language.primary !== "en")?.code ?? "en-IN";
}
