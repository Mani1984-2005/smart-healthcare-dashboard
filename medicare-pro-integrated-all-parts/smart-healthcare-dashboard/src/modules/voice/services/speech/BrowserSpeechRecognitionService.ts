import { VoiceError } from "../../errors/VoiceError";
import type {
  SpeechEvent,
  SpeechEventListener,
  SpeechRecognitionOptions,
  SpeechTranscript,
  SupportStatus,
  Unsubscribe,
  VoiceErrorCode,
} from "../../types/voice";
import type { SpeechRecognitionService } from "./SpeechRecognitionService";
import {
  getWebSpeechConstructor,
  type WebSpeechErrorEvent,
  type WebSpeechRecognition,
  type WebSpeechRecognitionConstructor,
  type WebSpeechResultEvent,
} from "./webSpeechTypes";

export interface BrowserSpeechDependencies {
  getConstructor?: () => WebSpeechRecognitionConstructor | undefined;
  isOnline?: () => boolean;
  isSecureContext?: () => boolean;
  now?: () => number;
  /** How long getTranscript() waits for the browser to finish after stop(). */
  finalizeTimeoutMs?: number;
  /**
   * How long start() waits for the recognizer to begin listening. Covers a
   * permission prompt nobody answers and a speech service that never responds.
   */
  startTimeoutMs?: number;
}

const DEFAULT_FINALIZE_TIMEOUT_MS = 8_000;
const DEFAULT_START_TIMEOUT_MS = 20_000;

/** Maps Web Speech error names to module error codes. Exported for tests. */
export function mapWebSpeechError(error: string): VoiceErrorCode {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "PERMISSION_DENIED";
    case "audio-capture":
      return "MICROPHONE_UNAVAILABLE";
    case "no-speech":
      return "EMPTY_RECORDING";
    case "network":
      return "NETWORK_OFFLINE";
    case "language-not-supported":
      return "LANGUAGE_UNSUPPORTED";
    case "aborted":
      return "RECORDING_INTERRUPTED";
    default:
      return "RECOGNITION_FAILED";
  }
}

/**
 * Adapter over the browser's Web Speech API (SpeechRecognition).
 *
 * Privacy note: Chromium-based browsers send the audio to the browser
 * vendor's speech service; this adapter never stores audio itself. It does not
 * open the microphone through any other API, and only starts when start() is
 * called from a user gesture.
 */
export class BrowserSpeechRecognitionService implements SpeechRecognitionService {
  readonly id = "browser-web-speech";
  readonly label = "Browser speech recognition";
  readonly isDemo = false;

  private readonly deps: Required<Omit<BrowserSpeechDependencies, "getConstructor">> & {
    getConstructor: () => WebSpeechRecognitionConstructor | undefined;
  };
  private readonly listeners = new Set<SpeechEventListener>();

  private recognition: WebSpeechRecognition | null = null;
  private language = "";
  private startedAt = 0;
  private finalText = "";
  private interimText = "";
  private confidences: number[] = [];
  private sessionError: VoiceError | null = null;
  private errorEmitted = false;
  private stopRequested = false;
  private cancelled = false;
  private ended = true;
  private endedPromise: Promise<void> = Promise.resolve();
  private resolveEnded: (() => void) | null = null;
  private rejectStart: ((error: VoiceError) => void) | null = null;

  constructor(deps: BrowserSpeechDependencies = {}) {
    this.deps = {
      getConstructor: deps.getConstructor ?? getWebSpeechConstructor,
      isOnline: deps.isOnline ?? (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false)),
      isSecureContext: deps.isSecureContext ?? (() => (typeof window === "undefined" ? true : window.isSecureContext !== false)),
      now: deps.now ?? (() => Date.now()),
      finalizeTimeoutMs: deps.finalizeTimeoutMs ?? DEFAULT_FINALIZE_TIMEOUT_MS,
      startTimeoutMs: deps.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS,
    };
  }

  getSupport(_language: string): SupportStatus {
    if (!this.deps.getConstructor()) return { supported: false, reason: "BROWSER_UNSUPPORTED" };
    if (!this.deps.isSecureContext()) return { supported: false, reason: "PERMISSION_UNAVAILABLE" };
    // Browsers do not expose which recognition languages they support. An
    // unsupported language surfaces as "language-not-supported" at start.
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
    if (!support.supported) throw new VoiceError(support.reason, "Speech recognition is not available");
    if (!this.deps.isOnline()) throw new VoiceError("NETWORK_OFFLINE", "Browser is offline");

    this.discardSession();
    const Recognition = this.deps.getConstructor() as WebSpeechRecognitionConstructor;
    const recognition = new Recognition();
    recognition.lang = options.language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    this.recognition = recognition;
    this.language = options.language;
    this.finalText = "";
    this.interimText = "";
    this.confidences = [];
    this.sessionError = null;
    this.errorEmitted = false;
    this.stopRequested = false;
    this.cancelled = false;
    this.ended = false;
    this.endedPromise = new Promise<void>((resolve) => {
      this.resolveEnded = resolve;
    });

    await new Promise<void>((resolve, reject) => {
      let started = false;
      const startTimer = setTimeout(() => {
        // Never listened: give up rather than leave the screen waiting forever.
        reject(new VoiceError("TIMEOUT", "Recognizer did not start in time"));
      }, this.deps.startTimeoutMs);
      const settle = () => {
        clearTimeout(startTimer);
        this.rejectStart = null;
      };
      this.rejectStart = (error) => {
        settle();
        reject(error);
      };

      recognition.onstart = () => {
        started = true;
        settle();
        this.startedAt = this.deps.now();
        resolve();
      };
      recognition.onresult = (event) => this.handleResult(event);
      recognition.onspeechstart = () => this.emit({ type: "speech-activity", active: true });
      recognition.onspeechend = () => this.emit({ type: "speech-activity", active: false });
      recognition.onerror = (event) => {
        const error = new VoiceError(mapWebSpeechError(event.error), `Web Speech error: ${event.error}`);
        if (this.cancelled) return;
        this.handleError(event, error, started);
        if (!started) {
          settle();
          reject(error);
        }
      };
      recognition.onend = () => {
        this.ended = true;
        this.resolveEnded?.();
        if (!started) {
          settle();
          reject(this.sessionError ?? new VoiceError("RECORDING_INTERRUPTED", "Recognition ended before it started"));
          return;
        }
        if (!this.errorEmitted && !this.cancelled) this.emit({ type: "ended" });
      };

      try {
        recognition.start();
      } catch (cause) {
        settle();
        reject(new VoiceError("RECOGNITION_FAILED", "Could not start recognition", { cause }));
      }
    }).catch((error: unknown) => {
      // A recognizer that failed to start must never start listening later
      // (for example when a permission prompt is finally answered).
      this.detach(recognition);
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
      this.ended = true;
      this.resolveEnded?.();
      throw error;
    });
  }

  async stop(): Promise<void> {
    if (!this.recognition || this.ended) return;
    this.stopRequested = true;
    try {
      this.recognition.stop();
    } catch {
      // stop() on an already-stopped recognizer is harmless.
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    this.discardSession();
  }

  async getTranscript(): Promise<SpeechTranscript> {
    if (!this.recognition && this.ended && !this.finalText && !this.interimText && !this.sessionError) {
      throw new VoiceError("RECORDING_INTERRUPTED", "No recording session");
    }

    if (!this.ended) {
      await this.waitForEnd();
    }

    if (this.cancelled) throw new VoiceError("RECORDING_INTERRUPTED", "Recording was cancelled");

    const text = (this.finalText || this.interimText).trim();
    if (this.sessionError && !text) throw this.sessionError;
    if (!text) throw new VoiceError("EMPTY_RECORDING", "No speech was recognised");

    const confidence = this.confidences.length
      ? this.confidences.reduce((sum, value) => sum + value, 0) / this.confidences.length
      : undefined;

    return {
      text,
      language: this.language,
      confidence,
      durationMs: Math.max(0, this.deps.now() - this.startedAt),
      provider: this.id,
      isDemo: false,
    };
  }

  dispose(): void {
    this.cancelled = true;
    this.discardSession();
    this.listeners.clear();
  }

  private async waitForEnd(): Promise<void> {
    if (!this.stopRequested) {
      await this.endedPromise;
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), this.deps.finalizeTimeoutMs);
    });
    const outcome = await Promise.race([this.endedPromise.then(() => "ended" as const), timeout]);
    if (timer) clearTimeout(timer);
    if (outcome === "timeout") {
      try {
        this.recognition?.abort();
      } catch {
        // ignore
      }
      this.ended = true;
      if (!(this.finalText || this.interimText).trim()) {
        throw new VoiceError("TIMEOUT", "Recognition did not finish in time");
      }
    }
  }

  private handleResult(event: WebSpeechResultEvent): void {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const alternative = result?.[0];
      if (!alternative) continue;
      if (result.isFinal) {
        const piece = alternative.transcript.trim();
        if (piece) this.finalText = this.finalText ? `${this.finalText} ${piece}` : piece;
        if (typeof alternative.confidence === "number" && alternative.confidence > 0) {
          this.confidences.push(alternative.confidence);
        }
      } else {
        interim += alternative.transcript;
      }
    }
    this.interimText = interim.trim();
    const preview = `${this.finalText} ${this.interimText}`.trim();
    if (preview) this.emit({ type: "interim", text: preview });
  }

  private handleError(event: WebSpeechErrorEvent, error: VoiceError, started: boolean): void {
    this.sessionError = error;
    // "no-speech" is reported through getTranscript() when the session ends.
    if (event.error === "no-speech") return;
    if (started) {
      this.errorEmitted = true;
      this.emit({ type: "error", error });
    }
  }

  private emit(event: SpeechEvent): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        // A faulty listener must not break recognition.
      }
    }
  }

  private detach(recognition: WebSpeechRecognition): void {
    recognition.onstart = null;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    recognition.onspeechstart = null;
    recognition.onspeechend = null;
  }

  private discardSession(): void {
    const recognition = this.recognition;
    if (!recognition) return;
    // A start() that is still waiting must not hang after cancel.
    this.rejectStart?.(new VoiceError("RECORDING_INTERRUPTED", "Recording was cancelled while starting"));
    this.rejectStart = null;
    this.detach(recognition);
    try {
      recognition.abort();
    } catch {
      // ignore
    }
    this.recognition = null;
    this.ended = true;
    this.resolveEnded?.();
  }
}
