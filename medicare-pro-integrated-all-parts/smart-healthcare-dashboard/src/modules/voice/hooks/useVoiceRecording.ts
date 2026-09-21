import { useCallback, useEffect, useRef, useState } from "react";
import { toVoiceError, type VoiceError } from "../errors/VoiceError";
import type { SpeechRecognitionService } from "../services/speech/SpeechRecognitionService";
import type { SpeechEvent, SpeechTranscript, Unsubscribe } from "../types/voice";

export type RecordingStatus = "idle" | "starting" | "listening" | "processing" | "success" | "error";

/** Lets small components (the level meter) follow input level without re-rendering the page. */
export interface LevelSource {
  subscribe(listener: (level: number) => void): Unsubscribe;
}

export interface UseVoiceRecordingArgs {
  service: SpeechRecognitionService;
  language: string;
  maxDurationMs?: number;
  /** Called once per successful recording, from the async handler (not an effect). */
  onTranscript?: (transcript: SpeechTranscript) => void;
}

export interface UseVoiceRecording {
  status: RecordingStatus;
  error: VoiceError | null;
  interimText: string;
  /** Date.now() when the microphone went live, or null. */
  startedAt: number | null;
  speechActive: boolean;
  levelSource: LevelSource;
  start(): Promise<void>;
  stop(): Promise<void>;
  cancel(): void;
  /** Cancel and clear any error or success state. */
  reset(): void;
}

const DEFAULT_MAX_DURATION_MS = 60_000;

/**
 * Drives a SpeechRecognitionService through idle > starting > listening >
 * processing > success | error. All timers, subscriptions and the provider
 * session are cleaned up on unmount, and results from a cancelled or replaced
 * run are ignored.
 */
export function useVoiceRecording({
  service,
  language,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
  onTranscript,
}: UseVoiceRecordingArgs): UseVoiceRecording {
  const [status, setStatusState] = useState<RecordingStatus>("idle");
  const [error, setError] = useState<VoiceError | null>(null);
  const [interimText, setInterimText] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [speechActive, setSpeechActive] = useState(false);
  const [levelListeners] = useState(() => new Set<(level: number) => void>());
  const [levelSource] = useState<LevelSource>(() => ({
    subscribe(listener) {
      levelListeners.add(listener);
      return () => {
        levelListeners.delete(listener);
      };
    },
  }));

  const statusRef = useRef<RecordingStatus>("idle");
  const runRef = useRef(0);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const serviceRef = useRef(service);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const setStatus = useCallback((next: RecordingStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = null;
  }, []);

  const detach = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const fail = useCallback(
    (run: number, cause: unknown) => {
      if (run !== runRef.current) return;
      clearTimers();
      detach();
      finalizingRef.current = false;
      void serviceRef.current.cancel().catch(() => undefined);
      setSpeechActive(false);
      setError(toVoiceError(cause));
      setStatus("error");
    },
    [clearTimers, detach, setStatus],
  );

  const finalize = useCallback(
    async (run: number) => {
      if (run !== runRef.current || finalizingRef.current) return;
      finalizingRef.current = true;
      clearTimers();
      setSpeechActive(false);
      setStatus("processing");
      try {
        const transcript = await serviceRef.current.getTranscript();
        if (run !== runRef.current) return;
        detach();
        finalizingRef.current = false;
        setInterimText("");
        setStatus("success");
        onTranscriptRef.current?.(transcript);
      } catch (cause) {
        fail(run, cause);
      }
    },
    [clearTimers, detach, fail, setStatus],
  );

  const handleEvent = useCallback(
    (run: number, event: SpeechEvent) => {
      if (run !== runRef.current) return;
      switch (event.type) {
        case "interim":
          setInterimText(event.text);
          break;
        case "level":
          for (const listener of [...levelListeners]) listener(event.level);
          break;
        case "speech-activity":
          setSpeechActive(event.active);
          break;
        case "ended":
          if (statusRef.current === "listening") void finalize(run);
          break;
        case "error":
          fail(run, event.error);
          break;
      }
    },
    [fail, finalize, levelListeners],
  );

  const start = useCallback(async () => {
    const current = statusRef.current;
    if (current === "starting" || current === "listening" || current === "processing") return;

    const run = ++runRef.current;
    finalizingRef.current = false;
    detach();
    clearTimers();
    setError(null);
    setInterimText("");
    setSpeechActive(false);
    setStartedAt(null);
    setStatus("starting");

    const activeService = serviceRef.current;
    unsubscribeRef.current = activeService.subscribe((event) => handleEvent(run, event));

    try {
      await activeService.start({ language, maxDurationMs });
    } catch (cause) {
      if (run !== runRef.current) return; // cancelled while starting
      fail(run, cause);
      return;
    }
    if (run !== runRef.current) return;

    setStartedAt(Date.now());
    setStatus("listening");
    maxTimerRef.current = setTimeout(() => {
      if (run !== runRef.current || statusRef.current !== "listening") return;
      void (async () => {
        try {
          await activeService.stop();
        } catch {
          // fall through to finalize, which reports any real failure
        }
        void finalize(run);
      })();
    }, maxDurationMs);
  }, [clearTimers, detach, fail, finalize, handleEvent, language, maxDurationMs, setStatus]);

  const stop = useCallback(async () => {
    const run = runRef.current;
    if (statusRef.current === "starting") {
      // Nothing has been recorded yet, so stopping is the same as cancelling.
      runRef.current += 1;
      clearTimers();
      detach();
      void serviceRef.current.cancel().catch(() => undefined);
      setStatus("idle");
      return;
    }
    if (statusRef.current !== "listening") return;
    clearTimers();
    setStatus("processing");
    try {
      await serviceRef.current.stop();
    } catch {
      // finalize() surfaces whatever the provider reports
    }
    await finalize(run);
  }, [clearTimers, detach, finalize, setStatus]);

  const cancel = useCallback(() => {
    runRef.current += 1;
    finalizingRef.current = false;
    clearTimers();
    detach();
    void serviceRef.current.cancel().catch(() => undefined);
    setInterimText("");
    setSpeechActive(false);
    setStartedAt(null);
    setStatus("idle");
  }, [clearTimers, detach, setStatus]);

  const reset = useCallback(() => {
    cancel();
    setError(null);
  }, [cancel]);

  // Keep the latest service in a ref, and release the microphone session when
  // the service changes (demo/live switch) or the component unmounts.
  useEffect(() => {
    serviceRef.current = service;
    return () => {
      runRef.current += 1;
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      void service.cancel().catch(() => undefined);
    };
  }, [service]);

  return { status, error, interimText, startedAt, speechActive, levelSource, start, stop, cancel, reset };
}

