import { VoiceError } from "../../errors/VoiceError";
import { primarySubtag } from "../../config/languages";
import type {
  SpeechEvent,
  SpeechEventListener,
  SpeechRecognitionOptions,
  SpeechTranscript,
  SupportStatus,
  Unsubscribe,
  VoiceErrorCode,
} from "../../types/voice";
import { DEMO_SPOKEN_SAMPLES } from "./demoSamples";
import type { SpeechRecognitionService } from "./SpeechRecognitionService";

export interface MockSpeechOptions {
  /** Delay before the "microphone" is live. */
  startDelayMs?: number;
  /** Delay between stop() and the transcript being ready. */
  processingMs?: number;
  /** Interval for simulated level/interim events; 0 disables them. */
  tickMs?: number;
  /** Sentences the mock "hears", keyed by primary language subtag. */
  samples?: Record<string, string[]>;
  /** Make start() fail with this code. */
  failStartWith?: VoiceErrorCode;
  /** Make getTranscript() fail with this code. */
  failTranscriptWith?: VoiceErrorCode;
  /** Return an empty recording. */
  returnEmpty?: boolean;
  /** Report the provider as unsupported with this reason. */
  unsupportedReason?: VoiceErrorCode;
}

/**
 * Demo speech provider. Needs no microphone, network or credentials. It
 * "hears" one of a few clearly labelled sample sentences and marks every
 * transcript as demo data.
 */
export class MockSpeechRecognitionService implements SpeechRecognitionService {
  readonly id = "mock-speech";
  readonly label = "Demo speech recognition (simulated)";
  readonly isDemo = true;

  private readonly options: Required<Pick<MockSpeechOptions, "startDelayMs" | "processingMs" | "tickMs">> & MockSpeechOptions;
  private readonly listeners = new Set<SpeechEventListener>();
  private readonly cursor = new Map<string, number>();

  private active = false;
  private language = "";
  private startedAt = 0;
  private sample = "";
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private startReject: ((error: VoiceError) => void) | null = null;
  private stopped = false;
  private cancelled = false;
  private tickCount = 0;

  constructor(options: MockSpeechOptions = {}) {
    this.options = { startDelayMs: 150, processingMs: 700, tickMs: 120, ...options };
  }

  getSupport(language: string): SupportStatus {
    if (this.options.unsupportedReason) return { supported: false, reason: this.options.unsupportedReason };
    if (!this.samplesFor(language).length) return { supported: false, reason: "LANGUAGE_UNSUPPORTED" };
    return { supported: true };
  }

  subscribe(listener: SpeechEventListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(options: SpeechRecognitionOptions): Promise<void> {
    const support = this.getSupport(options.language);
    if (!support.supported) throw new VoiceError(support.reason, "Mock provider does not support this request");
    if (this.options.failStartWith) throw new VoiceError(this.options.failStartWith, "Mock start failure");

    this.clearTimers();
    this.active = true;
    this.stopped = false;
    this.cancelled = false;
    this.tickCount = 0;
    this.language = options.language;
    this.sample = this.nextSample(options.language);

    await new Promise<void>((resolve, reject) => {
      this.startReject = reject;
      this.startTimer = setTimeout(() => {
        this.startTimer = null;
        this.startReject = null;
        this.startedAt = Date.now();
        this.beginTicks();
        resolve();
      }, this.options.startDelayMs);
    });
  }

  async stop(): Promise<void> {
    if (!this.active) return;
    if (this.startReject) {
      // Stopped before the "microphone" was live: nothing was recorded.
      this.startReject(new VoiceError("RECORDING_INTERRUPTED", "Mock stopped before start finished"));
      this.startReject = null;
    }
    this.stopped = true;
    this.clearTimers();
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    this.active = false;
    this.clearTimers();
    this.startReject?.(new VoiceError("RECORDING_INTERRUPTED", "Mock start cancelled"));
    this.startReject = null;
  }

  async getTranscript(): Promise<SpeechTranscript> {
    if (this.cancelled || !this.active) throw new VoiceError("RECORDING_INTERRUPTED", "No active mock recording");
    if (!this.stopped) {
      // Behave like a real provider that ends on its own.
      this.stopped = true;
      this.clearTimers();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, this.options.processingMs));
    if (this.cancelled) throw new VoiceError("RECORDING_INTERRUPTED", "Mock recording cancelled");
    this.active = false;

    if (this.options.failTranscriptWith) throw new VoiceError(this.options.failTranscriptWith, "Mock transcript failure");
    if (this.options.returnEmpty) throw new VoiceError("EMPTY_RECORDING", "Mock returned no speech");

    return {
      text: this.sample,
      language: this.language,
      confidence: 0.9,
      durationMs: Math.max(0, Date.now() - this.startedAt),
      provider: this.id,
      isDemo: true,
    };
  }

  dispose(): void {
    this.cancelled = true;
    this.active = false;
    this.clearTimers();
    this.startReject?.(new VoiceError("RECORDING_INTERRUPTED", "Mock disposed"));
    this.startReject = null;
    this.listeners.clear();
  }

  private samplesFor(language: string): string[] {
    const table = this.options.samples ?? DEMO_SPOKEN_SAMPLES;
    return table[primarySubtag(language)] ?? [];
  }

  private nextSample(language: string): string {
    const samples = this.samplesFor(language);
    const key = primarySubtag(language);
    const index = this.cursor.get(key) ?? 0;
    this.cursor.set(key, (index + 1) % samples.length);
    return samples[index % samples.length] ?? "";
  }

  private beginTicks(): void {
    if (this.options.tickMs <= 0) return;
    this.emit({ type: "speech-activity", active: true });
    const words = this.sample.split(/\s+/);
    this.tickTimer = setInterval(() => {
      this.tickCount += 1;
      // Smooth pseudo-level so the visualizer has something honest to draw.
      const level = 0.35 + 0.25 * Math.sin(this.tickCount / 2) + 0.15 * Math.sin(this.tickCount * 1.7);
      this.emit({ type: "level", level: Math.min(1, Math.max(0.05, level)) });
      const revealed = Math.min(words.length - 1, Math.floor(this.tickCount / 3));
      if (revealed > 0) this.emit({ type: "interim", text: words.slice(0, revealed).join(" ") });
    }, this.options.tickMs);
  }

  private emit(event: SpeechEvent): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        // ignore faulty listeners
      }
    }
  }

  private clearTimers(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.startTimer) clearTimeout(this.startTimer);
    this.tickTimer = null;
    this.startTimer = null;
  }
}
