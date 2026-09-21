import type { PlaybackState, SupportStatus, Unsubscribe } from "../../types/voice";

/**
 * Provider-neutral speech output. speak() resolves when playback finishes or
 * is stopped; it rejects with a VoiceError when speech is unavailable.
 */
export interface TextToSpeechService {
  readonly id: string;
  readonly isDemo: boolean;

  getSupport(language: string): SupportStatus;
  speak(text: string, language: string): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getState(): PlaybackState;
  subscribe(listener: (state: PlaybackState) => void): Unsubscribe;
  dispose(): void;
}
