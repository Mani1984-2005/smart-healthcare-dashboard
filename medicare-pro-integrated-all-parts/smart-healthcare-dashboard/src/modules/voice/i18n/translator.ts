import { getLocaleBundle, type VoiceMessageKey, type VoiceMessages } from "../locales";
import { primarySubtag } from "../config/languages";

export type TranslateParams = Record<string, string | number>;

export interface Translator {
  (key: VoiceMessageKey, params?: TranslateParams): string;
  /** The language this translator resolves to (may be "en" when a bundle is missing). */
  readonly bundleLanguage: string;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/**
 * Creates t("voice.idle")-style lookup for a language. Missing bundles or
 * missing keys fall back to English so the UI never shows a raw key.
 */
export function createTranslator(language: string): Translator {
  const english = getLocaleBundle("en") as VoiceMessages;
  const primary = primarySubtag(language);
  const bundle = getLocaleBundle(primary) ?? english;
  const bundleLanguage = getLocaleBundle(primary) ? primary : "en";

  const t = ((key: VoiceMessageKey, params?: TranslateParams) =>
    interpolate(bundle[key] ?? english[key] ?? key, params)) as Translator;
  Object.defineProperty(t, "bundleLanguage", { value: bundleLanguage, enumerable: true });
  return t;
}
