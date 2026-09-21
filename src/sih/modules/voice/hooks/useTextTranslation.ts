import { useCallback, useEffect, useRef, useState } from "react";
import { toVoiceError, VoiceError } from "../errors/VoiceError";
import type { TranslationService } from "../services/translation/TranslationService";
import type { TranslationResult } from "../types/voice";

export type TranslationStatus = "idle" | "translating" | "done" | "error";

export interface UseTextTranslation {
  status: TranslationStatus;
  result: TranslationResult | null;
  error: VoiceError | null;
  translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<void>;
  /** Drops the result (for example when the source text changed). */
  reset(): void;
}

const SAFETY_TIMEOUT_MS = 15_000;

/**
 * Runs a TranslationService call and keeps its result apart from the
 * source text. The hook never touches the original wording.
 */
export function useTextTranslation(service: TranslationService): UseTextTranslation {
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<VoiceError | null>(null);
  const runRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const serviceRef = useRef(service);

  useEffect(() => {
    serviceRef.current = service;
    return () => {
      runRef.current += 1;
      abortRef.current?.abort();
    };
  }, [service]);

  const translate = useCallback(async (text: string, sourceLanguage: string, targetLanguage: string) => {
    const run = ++runRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("translating");
    setError(null);
    setResult(null);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new VoiceError("TRANSLATION_TIMEOUT", "Translation exceeded the safety timeout"));
      }, SAFETY_TIMEOUT_MS);
    });

    try {
      const translated = await Promise.race([
        serviceRef.current.translate(text, sourceLanguage, targetLanguage, { signal: controller.signal }),
        guard,
      ]);
      if (run !== runRef.current) return;
      setResult(translated);
      setStatus("done");
    } catch (cause) {
      if (run !== runRef.current) return;
      setError(toVoiceError(cause, "TRANSLATION_UNAVAILABLE"));
      setStatus("error");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }, []);

  const reset = useCallback(() => {
    runRef.current += 1;
    abortRef.current?.abort();
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, translate, reset };
}
