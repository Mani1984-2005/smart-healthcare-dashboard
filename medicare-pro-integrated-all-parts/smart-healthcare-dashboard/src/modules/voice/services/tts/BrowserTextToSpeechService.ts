import { VoiceError } from "../../errors/VoiceError";
import { primarySubtag } from "../../config/languages";
import type { PlaybackState, SupportStatus, Unsubscribe } from "../../types/voice";
import type { TextToSpeechService } from "./TextToSpeechService";

export interface BrowserTtsDependencies {
  getSynthesis?: () => SpeechSynthesis | undefined;
  createUtterance?: (text: string) => SpeechSynthesisUtterance;
  /** How long to wait for the voice list, which many browsers load lazily. */
  voiceLoadTimeoutMs?: number;
}

function normalizeTag(tag: string): string {
  return tag.replace("_", "-").toLowerCase();
}

/** Prefers an exact locale match, then any voice with the same primary language. */
export function pickVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | undefined {
  const wanted = normalizeTag(language);
  const primary = primarySubtag(language);
  return (
    voices.find((voice) => normalizeTag(voice.lang) === wanted) ??
    voices.find((voice) => primarySubtag(voice.lang) === primary)
  );
}

/**
 * Adapter over window.speechSynthesis. Speaks nothing until speak() is called
 * from a user action, and never sends text anywhere itself.
 */
export class BrowserTextToSpeechService implements TextToSpeechService {
  readonly id = "browser-speech-synthesis";
  readonly isDemo = false;

  private readonly getSynthesis: () => SpeechSynthesis | undefined;
  private readonly createUtterance: (text: string) => SpeechSynthesisUtterance;
  private readonly voiceLoadTimeoutMs: number;
  private readonly listeners = new Set<(state: PlaybackState) => void>();
  private state: PlaybackState = "idle";
  // Keeps a strong reference: some browsers drop utterances that get garbage collected mid-speech.
  private current: SpeechSynthesisUtterance | null = null;
  // Incremented by every speak()/stop() so a slow voice lookup cannot start stale speech.
  private token = 0;
  private resolvePending: (() => void) | null = null;

  constructor(deps: BrowserTtsDependencies = {}) {
    this.getSynthesis =
      deps.getSynthesis ?? (() => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined));
    this.createUtterance = deps.createUtterance ?? ((text) => new SpeechSynthesisUtterance(text));
    this.voiceLoadTimeoutMs = deps.voiceLoadTimeoutMs ?? 1_500;
  }

  getSupport(language: string): SupportStatus {
    const synthesis = this.getSynthesis();
    if (!synthesis) return { supported: false, reason: "TTS_UNSUPPORTED" };
    const voices = synthesis.getVoices();
    // An empty list usually means "not loaded yet", so stay optimistic.
    if (voices.length > 0 && !pickVoice(voices, language)) {
      return { supported: false, reason: "TTS_LANGUAGE_UNSUPPORTED" };
    }
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
    const trimmed = text.trim();
    if (!trimmed) return;
    const synthesis = this.getSynthesis();
    if (!synthesis) throw new VoiceError("TTS_UNSUPPORTED", "speechSynthesis is unavailable");

    this.stop();
    const token = this.token;
    const voices = await this.loadVoices(synthesis);
    if (token !== this.token) return; // stopped or replaced while voices were loading
    const voice = pickVoice(voices, language);
    if (voices.length > 0 && !voice) {
      throw new VoiceError("TTS_LANGUAGE_UNSUPPORTED", `No voice for ${language}`);
    }

    const utterance = this.createUtterance(trimmed);
    utterance.lang = voice?.lang ?? language;
    if (voice) utterance.voice = voice;
    this.current = utterance;

    return new Promise<void>((resolve, reject) => {
      this.resolvePending = resolve;
      const finish = () => {
        if (this.current === utterance) {
          this.current = null;
          this.resolvePending = null;
          this.setState("idle");
        }
      };
      utterance.onstart = () => {
        if (this.current === utterance) this.setState("speaking");
      };
      utterance.onend = () => {
        finish();
        resolve();
      };
      utterance.onerror = (event) => {
        finish();
        const reason = (event as SpeechSynthesisErrorEvent).error;
        // Stopping playback on purpose reports "interrupted" or "canceled"; that is not a failure.
        if (reason === "interrupted" || reason === "canceled") {
          resolve();
        } else if (reason === "language-unavailable" || reason === "voice-unavailable") {
          reject(new VoiceError("TTS_LANGUAGE_UNSUPPORTED", `Speech synthesis error: ${reason}`));
        } else {
          reject(new VoiceError("TTS_FAILED", `Speech synthesis error: ${reason ?? "unknown"}`));
        }
      };
      try {
        this.setState("speaking");
        synthesis.speak(utterance);
      } catch (cause) {
        finish();
        reject(new VoiceError("TTS_FAILED", "speak() threw", { cause }));
      }
    });
  }

  pause(): void {
    const synthesis = this.getSynthesis();
    if (!synthesis || this.state !== "speaking") return;
    synthesis.pause();
    this.setState("paused");
  }

  resume(): void {
    const synthesis = this.getSynthesis();
    if (!synthesis || this.state !== "paused") return;
    synthesis.resume();
    this.setState("speaking");
  }

  stop(): void {
    this.token += 1;
    const synthesis = this.getSynthesis();
    if (synthesis && (this.state !== "idle" || this.current)) {
      try {
        synthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.current = null;
    this.setState("idle");
    // Some browsers never fire an event after cancel(), so settle the pending promise ourselves.
    const resolvePending = this.resolvePending;
    this.resolvePending = null;
    resolvePending?.();
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  private setState(state: PlaybackState): void {
    if (this.state === state) return;
    this.state = state;
    for (const listener of [...this.listeners]) listener(state);
  }

  private loadVoices(synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
    const initial = synthesis.getVoices();
    if (initial.length > 0) return Promise.resolve(initial);
    return new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        synthesis.removeEventListener?.("voiceschanged", settle);
        resolve(synthesis.getVoices());
      };
      const timer = setTimeout(settle, this.voiceLoadTimeoutMs);
      synthesis.addEventListener?.("voiceschanged", settle);
    });
  }
}
