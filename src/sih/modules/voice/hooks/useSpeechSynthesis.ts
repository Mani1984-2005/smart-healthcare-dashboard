import { useCallback, useEffect, useRef, useState } from "react";
import { toVoiceError, type VoiceError } from "../errors/VoiceError";
import type { TextToSpeechService } from "../services/tts/TextToSpeechService";
import type { PlaybackState } from "../types/voice";

export interface UseSpeechSynthesis {
  playback: PlaybackState;
  /** Identifies which Listen button owns the current playback. */
  activeKey: string | null;
  /** Text being read, for the demo caption. */
  activeText: string | null;
  error: VoiceError | null;
  speak(key: string, text: string, language: string): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  clearError(): void;
}

/**
 * Wraps a TextToSpeechService for the UI. One playback at a time: starting a
 * new one stops the previous. Stops speaking when the component unmounts.
 */
export function useSpeechSynthesis(service: TextToSpeechService): UseSpeechSynthesis {
  const [playback, setPlayback] = useState<PlaybackState>(() => service.getState());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeText, setActiveText] = useState<string | null>(null);
  const [error, setError] = useState<VoiceError | null>(null);
  const runRef = useRef(0);
  const serviceRef = useRef(service);

  useEffect(() => {
    serviceRef.current = service;
    const unsubscribe = service.subscribe(setPlayback);
    return () => {
      unsubscribe();
      runRef.current += 1;
      service.stop();
    };
  }, [service]);

  const speak = useCallback(async (key: string, text: string, language: string) => {
    const run = ++runRef.current;
    setError(null);
    setActiveKey(key);
    setActiveText(text);
    try {
      await serviceRef.current.speak(text, language);
    } catch (cause) {
      if (run === runRef.current) setError(toVoiceError(cause, "TTS_FAILED"));
    } finally {
      if (run === runRef.current) {
        setActiveKey(null);
        setActiveText(null);
      }
    }
  }, []);

  const pause = useCallback(() => serviceRef.current.pause(), []);
  const resume = useCallback(() => serviceRef.current.resume(), []);
  const stop = useCallback(() => {
    runRef.current += 1;
    serviceRef.current.stop();
    setActiveKey(null);
    setActiveText(null);
  }, []);
  const clearError = useCallback(() => setError(null), []);

  return { playback, activeKey, activeText, error, speak, pause, resume, stop, clearError };
}
