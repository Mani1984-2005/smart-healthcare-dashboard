import { useCallback, useState } from "react";
import { defaultTranslationTarget } from "../config/languages";
import { toVoiceError, type VoiceError } from "../errors/VoiceError";
import type { VoiceServices } from "../services/createVoiceServices";
import type { InputMethod, SpeechTranscript, VoiceInteractionResult } from "../types/voice";
import { buildInteraction, toVoiceInteractionResult } from "../utils/contract";
import { useTextTranslation } from "./useTextTranslation";
import { useVoiceRecording } from "./useVoiceRecording";

export type FlowPhase = "capture" | "review" | "confirm" | "submitted";

export interface UseVoiceInteractionFlowArgs {
  services: VoiceServices;
  language: string;
  sessionId: string;
  maxRecordingMs?: number;
  onSubmit?: (result: VoiceInteractionResult) => void;
}

/**
 * Orchestrates one patient response: capture (speak or type) > review and
 * edit > optional translation > confirm > submit. Keeps the original wording,
 * the raw recognizer output and any translation as separate values.
 */
export function useVoiceInteractionFlow({
  services,
  language,
  sessionId,
  maxRecordingMs,
  onSubmit,
}: UseVoiceInteractionFlowArgs) {
  const [phase, setPhase] = useState<FlowPhase>("capture");
  const [draftText, setDraft] = useState("");
  const [recognizedText, setRecognizedText] = useState("");
  const [transcriptLanguage, setTranscriptLanguage] = useState(language);
  const [inputMethod, setInputMethod] = useState<InputMethod>("voice");
  const [durationMs, setDurationMs] = useState<number | undefined>();
  const [confidence, setConfidence] = useState<number | undefined>();
  const [speechProvider, setSpeechProvider] = useState<string | undefined>();
  const [translationStale, setTranslationStale] = useState(false);
  const [targetOverride, setTargetOverride] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<VoiceError | null>(null);
  const [result, setResult] = useState<VoiceInteractionResult | null>(null);

  const translation = useTextTranslation(services.translation);

  const handleTranscript = useCallback(
    (transcript: SpeechTranscript) => {
      setRecognizedText(transcript.text);
      setDraft(transcript.text);
      setTranscriptLanguage(transcript.language);
      setInputMethod("voice");
      setDurationMs(transcript.durationMs);
      setConfidence(transcript.confidence);
      setSpeechProvider(transcript.provider);
      setTranslationStale(false);
      translation.reset();
      setPhase("review");
    },
    [translation],
  );

  const recording = useVoiceRecording({
    service: services.speech,
    language,
    maxDurationMs: maxRecordingMs,
    onTranscript: handleTranscript,
  });

  const targetLanguage =
    targetOverride && targetOverride !== transcriptLanguage ? targetOverride : defaultTranslationTarget(transcriptLanguage);

  const setDraftText = useCallback(
    (text: string) => {
      setDraft(text);
      if (translation.status !== "idle") {
        translation.reset();
        setTranslationStale(translation.status === "done");
      }
    },
    [translation],
  );

  const requestTranslation = useCallback(async () => {
    const text = draftText.trim();
    if (!text) return;
    setTranslationStale(false);
    await translation.translate(text, transcriptLanguage, targetLanguage);
  }, [draftText, targetLanguage, transcriptLanguage, translation]);

  const clearAll = useCallback(() => {
    recording.reset();
    translation.reset();
    setDraft("");
    setRecognizedText("");
    setTranslationStale(false);
    setSubmitError(null);
    setResult(null);
    setPhase("capture");
  }, [recording, translation]);

  const recordAgain = useCallback(async () => {
    clearAll();
    await recording.start();
  }, [clearAll, recording]);

  const startTyping = useCallback(() => {
    recording.reset();
    translation.reset();
    setDraft("");
    setRecognizedText("");
    setTranscriptLanguage(language);
    setInputMethod("typed");
    setDurationMs(undefined);
    setConfidence(undefined);
    setSpeechProvider(undefined);
    setTranslationStale(false);
    setPhase("review");
  }, [language, recording, translation]);

  const requestSubmit = useCallback(() => {
    if (!draftText.trim()) return;
    setSubmitError(null);
    setPhase("confirm");
  }, [draftText]);

  const backToReview = useCallback(() => {
    setSubmitError(null);
    setPhase("review");
  }, []);

  const confirmSubmit = useCallback(async () => {
    if (submitting || !draftText.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const interaction = buildInteraction({
        sessionId,
        language: transcriptLanguage,
        confirmedText: draftText,
        recognizedText,
        inputMethod,
        durationMs,
        confidence,
        speechProvider,
        translation: translation.result,
        isDemoData: services.mode === "demo",
      });
      const saved = await services.repository.save(interaction);
      const contract = toVoiceInteractionResult(saved);
      setResult(contract);
      setPhase("submitted");
      onSubmit?.(contract);
    } catch (cause) {
      setSubmitError(toVoiceError(cause, "STORAGE_FAILED"));
    } finally {
      setSubmitting(false);
    }
  }, [
    confidence,
    draftText,
    durationMs,
    inputMethod,
    onSubmit,
    recognizedText,
    services.mode,
    services.repository,
    sessionId,
    speechProvider,
    submitting,
    transcriptLanguage,
    translation.result,
  ]);

  const startNewResponse = useCallback(() => {
    clearAll();
    setInputMethod("voice");
    setTargetOverride(null);
  }, [clearAll]);

  return {
    phase,
    recording,
    translation,
    draftText,
    setDraftText,
    recognizedText,
    transcriptLanguage,
    inputMethod,
    targetLanguage,
    setTargetLanguage: setTargetOverride,
    translationStale,
    requestTranslation,
    clearAll,
    recordAgain,
    startTyping,
    requestSubmit,
    backToReview,
    confirmSubmit,
    startNewResponse,
    submitting,
    submitError,
    dismissSubmitError: () => setSubmitError(null),
    result,
    maxRecordingMs,
  };
}
