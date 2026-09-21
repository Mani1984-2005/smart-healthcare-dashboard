import type { VoiceMode } from "../types/voice";

export type SpeechProviderId = "browser" | "mock";
export type TranslationProviderId = "http" | "mock";
export type TtsProviderId = "browser" | "mock";

export interface VoiceModuleConfig {
  /** "auto" picks live when the browser can listen, otherwise demo. */
  defaultMode: VoiceMode | "auto";
  speechProvider: SpeechProviderId;
  translationProvider: TranslationProviderId;
  ttsProvider: TtsProviderId;
  /** Backend proxy that holds translation credentials. Never put API keys in the frontend. */
  translationEndpoint?: string;
  translationTimeoutMs: number;
  maxRecordingMs: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceModuleConfig = {
  defaultMode: "auto",
  speechProvider: "browser",
  translationProvider: "http",
  ttsProvider: "browser",
  translationEndpoint: undefined,
  translationTimeoutMs: 10_000,
  maxRecordingMs: 60_000,
};

type EnvRecord = Record<string, string | undefined>;

function readViteEnv(): EnvRecord {
  const meta = import.meta as unknown as { env?: EnvRecord };
  return meta.env ?? {};
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Reads VITE_VOICE_* variables. Only non-secret settings are read here: the
 * frontend never receives provider API keys.
 */
export function readVoiceConfig(env: EnvRecord = readViteEnv()): VoiceModuleConfig {
  const endpoint = env.VITE_VOICE_TRANSLATION_ENDPOINT?.trim();
  return {
    defaultMode: pick(env.VITE_VOICE_DEFAULT_MODE, ["auto", "live", "demo"] as const, DEFAULT_VOICE_CONFIG.defaultMode),
    speechProvider: pick(env.VITE_VOICE_PROVIDER, ["browser", "mock"] as const, DEFAULT_VOICE_CONFIG.speechProvider),
    translationProvider: pick(
      env.VITE_VOICE_TRANSLATION_PROVIDER,
      ["http", "mock"] as const,
      DEFAULT_VOICE_CONFIG.translationProvider,
    ),
    ttsProvider: pick(env.VITE_VOICE_TTS_PROVIDER, ["browser", "mock"] as const, DEFAULT_VOICE_CONFIG.ttsProvider),
    translationEndpoint: endpoint ? endpoint : undefined,
    translationTimeoutMs: DEFAULT_VOICE_CONFIG.translationTimeoutMs,
    maxRecordingMs: DEFAULT_VOICE_CONFIG.maxRecordingMs,
  };
}
