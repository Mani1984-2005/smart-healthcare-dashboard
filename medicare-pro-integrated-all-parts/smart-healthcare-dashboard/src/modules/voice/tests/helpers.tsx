import { render } from "@testing-library/react";
import { VoiceError } from "../errors/VoiceError";
import VoiceInteractionModule, { type VoiceInteractionModuleProps } from "../components/VoiceInteractionModule";
import { MockVoiceInteractionRepository } from "../repositories/MockVoiceInteractionRepository";
import type { VoiceServices } from "../services/createVoiceServices";
import { MockSpeechRecognitionService } from "../services/speech/MockSpeechRecognitionService";
import type { SpeechRecognitionService } from "../services/speech/SpeechRecognitionService";
import { MockTextToSpeechService } from "../services/tts/MockTextToSpeechService";
import type { TextToSpeechService } from "../services/tts/TextToSpeechService";
import { MockTranslationService } from "../services/translation/MockTranslationService";
import type { TranslationService } from "../services/translation/TranslationService";
import { resetVoiceSessionStore } from "../stores/voiceSessionStore";
import type {
  SpeechEvent,
  SpeechEventListener,
  SpeechRecognitionOptions,
  SpeechTranscript,
  SupportStatus,
  Unsubscribe,
} from "../types/voice";

/** Instant mock speech so tests do not wait on simulated latency. */
export function fastSpeech(options: ConstructorParameters<typeof MockSpeechRecognitionService>[0] = {}) {
  return new MockSpeechRecognitionService({ startDelayMs: 0, processingMs: 0, tickMs: 0, ...options });
}

/**
 * Scriptable speech service: tests decide exactly what start(), stop() and
 * getTranscript() do, and can push provider events (auto-end, errors).
 */
export class FakeSpeechService implements SpeechRecognitionService {
  readonly id = "fake-speech";
  readonly label = "Fake speech";
  isDemo = false;

  support: SupportStatus = { supported: true };
  startError: VoiceError | null = null;
  /** Consumed one per getTranscript(); a VoiceError is thrown, a string becomes the transcript. */
  script: Array<string | VoiceError> = [];
  startDelayMs = 0;

  startCalls: SpeechRecognitionOptions[] = [];
  stopCalls = 0;
  cancelCalls = 0;
  disposeCalls = 0;
  private readonly listeners = new Set<SpeechEventListener>();
  private language = "en-IN";

  getSupport(): SupportStatus {
    return this.support;
  }

  subscribe(listener: SpeechEventListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(options: SpeechRecognitionOptions): Promise<void> {
    this.startCalls.push(options);
    this.language = options.language;
    if (this.startDelayMs) await new Promise((resolve) => setTimeout(resolve, this.startDelayMs));
    if (this.startError) throw this.startError;
  }

  async stop(): Promise<void> {
    this.stopCalls += 1;
  }

  async cancel(): Promise<void> {
    this.cancelCalls += 1;
  }

  async getTranscript(): Promise<SpeechTranscript> {
    const next = this.script.shift();
    if (next instanceof VoiceError) throw next;
    if (next === undefined) throw new VoiceError("EMPTY_RECORDING");
    return { text: next, language: this.language, confidence: 0.8, durationMs: 1200, provider: this.id, isDemo: this.isDemo };
  }

  dispose(): void {
    this.disposeCalls += 1;
    this.listeners.clear();
  }

  emit(event: SpeechEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

export interface TestServices extends VoiceServices {
  speech: SpeechRecognitionService;
  tts: TextToSpeechService;
  translation: TranslationService;
  repository: MockVoiceInteractionRepository;
  mockTts: MockTextToSpeechService;
}

export function makeServices(
  overrides: Partial<{
    speech: SpeechRecognitionService;
    tts: TextToSpeechService;
    translation: TranslationService;
    repository: MockVoiceInteractionRepository;
  }> = {},
): TestServices {
  const mockTts = new MockTextToSpeechService({ durationMs: 60 });
  const speech = overrides.speech ?? fastSpeech();
  const tts = overrides.tts ?? mockTts;
  const translation = overrides.translation ?? new MockTranslationService({ latencyMs: 0 });
  const repository = overrides.repository ?? new MockVoiceInteractionRepository();
  return {
    mode: "demo",
    speech,
    tts,
    translation,
    repository,
    mockTts,
    dispose() {
      speech.dispose();
      tts.dispose();
    },
  };
}

export function renderModule(
  services: TestServices = makeServices(),
  props: Omit<VoiceInteractionModuleProps, "services"> = {},
) {
  resetVoiceSessionStore();
  const utils = render(<VoiceInteractionModule services={services} showContractPreview {...props} />);
  return { services, ...utils };
}

/** Kannada sample the demo providers know how to translate. */
export const KN_SAMPLE = "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ";
export const KN_SAMPLE_EN = "I have had fever for two days.";
export const EN_SAMPLE = "I have had fever for two days and body pain.";
