import type {
  SpeechEventListener,
  SpeechRecognitionOptions,
  SpeechTranscript,
  SupportStatus,
  Unsubscribe,
} from "../../types/voice";

/**
 * Provider-neutral speech-to-text contract. UI code talks only to this
 * interface; browser, mock and any future cloud provider are adapters.
 *
 * Lifecycle:
 *   start()          resolves once the microphone is live (rejects with VoiceError)
 *   stop()           asks the provider to finish; audio already captured is kept
 *   getTranscript()  resolves with the final transcript after stop() or an
 *                    "ended" event, or rejects with a VoiceError
 *   cancel()         discards the session; no transcript is produced
 *   dispose()        cancel + remove all listeners (call on unmount)
 */
export interface SpeechRecognitionService {
  readonly id: string;
  readonly label: string;
  /** True for simulated providers whose output is demo data. */
  readonly isDemo: boolean;

  getSupport(language: string): SupportStatus;
  start(options: SpeechRecognitionOptions): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  getTranscript(): Promise<SpeechTranscript>;
  subscribe(listener: SpeechEventListener): Unsubscribe;
  dispose(): void;
}
