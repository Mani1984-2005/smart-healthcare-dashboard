import { VoiceError } from "../../errors/VoiceError";
import type { PlaybackState, SupportStatus, Unsubscribe, VoiceErrorCode } from "../../types/voice";
import type { TextToSpeechService } from "./TextToSpeechService";

export interface MockTtsOptions {
  /** Fixed speaking time; defaults to a short duration based on text length. */
  durationMs?: number;
  failWith?: VoiceErrorCode;
  unsupportedReason?: VoiceErrorCode;
}

export interface SpokenRecord {
  text: string;
  language: string;
}

/**
 * Demo/test speech output. Makes no sound: it records what would have been
 * read aloud (exposed as `spoken`) and simulates the timing and the
 * pause/resume/stop states.
 */
export class MockTextToSpeechService implements TextToSpeechService {
  readonly id = "mock-tts";
  readonly isDemo = true;

  readonly spoken: SpokenRecord[] = [];

  private readonly options: MockTtsOptions;
  private readonly listeners = new Set<(state: PlaybackState) => void>();
  private state: PlaybackState = "idle";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private remainingMs = 0;
  private resumedAt = 0;
  private finish: (() => void) | null = null;

  constructor(options: MockTtsOptions = {}) {
    this.options = options;
  }

  getSupport(_language: string): SupportStatus {
    if (this.options.unsupportedReason) return { supported: false, reason: this.options.unsupportedReason };
    return { supported: true };
  }

  getState(): PlaybackState {
    return this.state;
  }

  subscribe(listener: (state: PlaybackState) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async speak(text: string, language: string): Promise<void> {
    if (!text.trim()) return;
    const support = this.getSupport(language);
    if (!support.supported) throw new VoiceError(support.reason, "Mock TTS unsupported");
    if (this.options.failWith) throw new VoiceError(this.options.failWith, "Mock TTS failure");

    this.stop();
    this.spoken.push({ text, language });
    this.remainingMs = this.options.durationMs ?? Math.min(2_500, 300 + text.length * 25);

    return new Promise<void>((resolve) => {
      this.finish = resolve;
      this.setState("speaking");
      this.arm();
    });
  }

  pause(): void {
    if (this.state !== "speaking") return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.resumedAt));
    this.setState("paused");
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.setState("speaking");
    this.arm();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const finish = this.finish;
    this.finish = null;
    this.setState("idle");
    finish?.();
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  private arm(): void {
    this.resumedAt = Date.now();
    this.timer = setTimeout(() => {
      this.timer = null;
      const finish = this.finish;
      this.finish = null;
      this.setState("idle");
      finish?.();
    }, this.remainingMs);
  }

  private setState(state: PlaybackState): void {
    if (this.state === state) return;
    this.state = state;
    for (const listener of [...this.listeners]) listener(state);
  }
}
