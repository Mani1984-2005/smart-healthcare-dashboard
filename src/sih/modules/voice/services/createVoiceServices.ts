import { readVoiceConfig, type VoiceModuleConfig } from "../config/voiceConfig";
import { MockVoiceInteractionRepository } from "../repositories/MockVoiceInteractionRepository";
import type { VoiceInteractionRepository } from "../repositories/VoiceInteractionRepository";
import type { VoiceMode } from "../types/voice";
import { BrowserSpeechRecognitionService } from "./speech/BrowserSpeechRecognitionService";
import { MockSpeechRecognitionService } from "./speech/MockSpeechRecognitionService";
import type { SpeechRecognitionService } from "./speech/SpeechRecognitionService";
import { BrowserTextToSpeechService } from "./tts/BrowserTextToSpeechService";
import { MockTextToSpeechService } from "./tts/MockTextToSpeechService";
import type { TextToSpeechService } from "./tts/TextToSpeechService";
import { HttpTranslationService } from "./translation/HttpTranslationService";
import { MockTranslationService } from "./translation/MockTranslationService";
import type { TranslationService } from "./translation/TranslationService";

/** Everything the UI needs, behind interfaces. Swap any member without touching components. */
export interface VoiceServices {
  mode: VoiceMode;
  speech: SpeechRecognitionService;
  tts: TextToSpeechService;
  translation: TranslationService;
  repository: VoiceInteractionRepository;
  dispose(): void;
}

type Factory<T> = (config: VoiceModuleConfig) => T;

const speechProviders: Record<string, Factory<SpeechRecognitionService>> = {
  browser: () => new BrowserSpeechRecognitionService(),
  mock: () => new MockSpeechRecognitionService(),
};
const ttsProviders: Record<string, Factory<TextToSpeechService>> = {
  browser: () => new BrowserTextToSpeechService(),
  mock: () => new MockTextToSpeechService(),
};
const translationProviders: Record<string, Factory<TranslationService>> = {
  http: (config) =>
    new HttpTranslationService({ endpoint: config.translationEndpoint, timeoutMs: config.translationTimeoutMs }),
  mock: () => new MockTranslationService(),
};

/** Register a new provider (for example a cloud STT adapter) under an id usable in VITE_VOICE_PROVIDER. */
export function registerSpeechProvider(id: string, factory: Factory<SpeechRecognitionService>): void {
  speechProviders[id] = factory;
}
export function registerTtsProvider(id: string, factory: Factory<TextToSpeechService>): void {
  ttsProviders[id] = factory;
}
export function registerTranslationProvider(id: string, factory: Factory<TranslationService>): void {
  translationProviders[id] = factory;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return new BrowserSpeechRecognitionService().getSupport("en-IN").supported;
}

export interface CreateVoiceServicesOptions {
  mode: VoiceMode;
  config?: VoiceModuleConfig;
  /** Replace any service, for embedding or tests. */
  overrides?: Partial<Omit<VoiceServices, "mode" | "dispose">>;
}

/**
 * Live mode uses the configured real providers (browser speech by default).
 * Demo mode uses simulated speech recognition and translation so the module
 * runs with no microphone permission, network or credentials; read-aloud uses
 * the device voice when the browser has one, otherwise a silent simulation.
 */
export function createVoiceServices({ mode, config = readVoiceConfig(), overrides = {} }: CreateVoiceServicesOptions): VoiceServices {
  const speech =
    overrides.speech ?? (mode === "demo" ? speechProviders.mock(config) : (speechProviders[config.speechProvider] ?? speechProviders.browser)(config));

  const translation =
    overrides.translation ??
    (mode === "demo" ? translationProviders.mock(config) : (translationProviders[config.translationProvider] ?? translationProviders.http)(config));

  let tts = overrides.tts;
  if (!tts) {
    if (mode === "demo" && config.ttsProvider !== "mock") {
      const browserTts = ttsProviders.browser(config);
      tts = browserTts.getSupport("en-IN").supported || browserTts.getSupport("hi-IN").supported ? browserTts : ttsProviders.mock(config);
    } else {
      tts = (ttsProviders[config.ttsProvider] ?? ttsProviders.browser)(config);
    }
  }

  const repository = overrides.repository ?? new MockVoiceInteractionRepository();

  return {
    mode,
    speech,
    tts,
    translation,
    repository,
    dispose() {
      speech.dispose();
      tts.dispose();
    },
  };
}
