import { en } from "./en";
import type { VoiceMessages } from "./en";
import { hi } from "./hi";
import { kn } from "./kn";

export type { VoiceMessageKey, VoiceMessages } from "./en";

/**
 * Locale bundles keyed by primary language subtag. To add a language, create
 * locales/<code>.ts typed as VoiceMessages and register it here (or call
 * registerLocale from your own code).
 */
const bundles: Record<string, VoiceMessages> = { en, hi, kn };

export function getLocaleBundle(primary: string): VoiceMessages | undefined {
  return bundles[primary];
}

export function registerLocale(primary: string, messages: VoiceMessages): void {
  bundles[primary] = messages;
}

export function listLocalePrimaries(): string[] {
  return Object.keys(bundles);
}
