import type {
  InputMethod,
  TranslationResult,
  VoiceInteraction,
  VoiceInteractionResult,
} from "../types/voice";
import { createId } from "./id";

export interface BuildInteractionArgs {
  sessionId: string;
  language: string;
  /** Wording the patient confirmed (possibly edited). */
  confirmedText: string;
  /** Raw recognizer output; empty for typed input. */
  recognizedText: string;
  inputMethod: InputMethod;
  durationMs?: number;
  confidence?: number;
  speechProvider?: string;
  translation?: TranslationResult | null;
  isDemoData: boolean;
  now?: Date;
}

/**
 * Builds the stored interaction. The confirmed text is copied verbatim; a
 * translation is attached as separate fields and never replaces it.
 */
export function buildInteraction(args: BuildInteractionArgs): VoiceInteraction {
  const transcript = args.confirmedText.trim();
  const edited = args.inputMethod === "voice" && transcript !== args.recognizedText.trim();
  const translation = args.translation ?? undefined;

  return {
    id: createId("voice"),
    sessionId: args.sessionId,
    language: args.language,
    transcript,
    originalTranscript: edited ? args.recognizedText.trim() : undefined,
    translatedTranscript: translation?.translatedText,
    translationLanguage: translation?.targetLanguage,
    inputMethod: args.inputMethod,
    transcriptEdited: edited,
    durationMs: args.durationMs,
    confidence: args.confidence,
    createdAt: (args.now ?? new Date()).toISOString(),
    status: "completed",
    isDemoData: args.isDemoData,
    providers: { speech: args.speechProvider, translation: translation?.provider },
  };
}

/** The stable, versioned shape other SIH parts should consume. */
export function toVoiceInteractionResult(interaction: VoiceInteraction): VoiceInteractionResult {
  return {
    contractVersion: "1.0",
    interactionId: interaction.id,
    sessionId: interaction.sessionId,
    originalText: interaction.transcript,
    originalLanguage: interaction.language,
    recognizedText: interaction.originalTranscript,
    wasEdited: interaction.transcriptEdited,
    translatedText: interaction.translatedTranscript,
    translatedLanguage: interaction.translationLanguage,
    translationProvider: interaction.providers.translation,
    inputMethod: interaction.inputMethod,
    confidence: interaction.confidence,
    durationMs: interaction.durationMs,
    capturedAt: interaction.createdAt,
    isDemoData: interaction.isDemoData,
  };
}
