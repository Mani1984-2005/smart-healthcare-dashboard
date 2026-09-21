/**
 * Shared types for the Voice, Multilingual & Accessible Clinical Interaction
 * module (SIH26047 - Part 2). This file has no runtime code and no imports
 * from the rest of MediCare Pro or from any other SIH part.
 */

/** BCP-47 language tag, for example "kn-IN". Validated against the language registry. */
export type LanguageCode = string;

export type Unsubscribe = () => void;

/* ----------------------------------------------------------------------- */
/* Errors                                                                   */
/* ----------------------------------------------------------------------- */

export type VoiceErrorCode =
  | "PERMISSION_DENIED"
  | "PERMISSION_UNAVAILABLE"
  | "MICROPHONE_UNAVAILABLE"
  | "BROWSER_UNSUPPORTED"
  | "LANGUAGE_UNSUPPORTED"
  | "RECORDING_INTERRUPTED"
  | "EMPTY_RECORDING"
  | "RECOGNITION_FAILED"
  | "NETWORK_OFFLINE"
  | "TIMEOUT"
  | "SERVER_FAILURE"
  | "TRANSLATION_UNAVAILABLE"
  | "TRANSLATION_TIMEOUT"
  | "TRANSLATION_LANGUAGE_UNSUPPORTED"
  | "TRANSLATION_DEMO_ONLY"
  | "TTS_UNSUPPORTED"
  | "TTS_LANGUAGE_UNSUPPORTED"
  | "TTS_FAILED"
  | "STORAGE_FAILED"
  | "UNKNOWN";

/** What the interface can offer the person after a failure. */
export type RecoveryAction = "retry" | "type" | "demo" | "dismiss";

export type SupportStatus =
  | { supported: true }
  | { supported: false; reason: VoiceErrorCode };

/* ----------------------------------------------------------------------- */
/* Languages                                                                */
/* ----------------------------------------------------------------------- */

export interface VoiceLanguage {
  /** BCP-47 tag with region, passed to speech recognition and synthesis. */
  code: LanguageCode;
  /** Primary subtag ("kn"); used to look up locale bundles and fall back on voices. */
  primary: string;
  /** English name, for reviewers and logs. */
  label: string;
  /** Name written in its own script; this is what patients see on the button. */
  nativeLabel: string;
  script: string;
  direction: "ltr" | "rtl";
}

/* ----------------------------------------------------------------------- */
/* Speech recognition                                                       */
/* ----------------------------------------------------------------------- */

export interface SpeechRecognitionOptions {
  language: LanguageCode;
  /** Hard ceiling for one recording; the hook stops the recording at this point. */
  maxDurationMs?: number;
}

export interface SpeechTranscript {
  text: string;
  language: LanguageCode;
  /** 0..1 when the provider reports it. Never shown to patients. */
  confidence?: number;
  durationMs: number;
  provider: string;
  /** True when the text came from simulated demo data. */
  isDemo: boolean;
}

export type SpeechEvent =
  | { type: "interim"; text: string }
  /** Optional input level 0..1 (only providers that can measure it emit this). */
  | { type: "level"; level: number }
  | { type: "speech-activity"; active: boolean }
  /** Recognition finished on its own (silence, browser limit). Call getTranscript(). */
  | { type: "ended" }
  /** Recognition failed after it had started. */
  | { type: "error"; error: Error & { code: VoiceErrorCode } };

export type SpeechEventListener = (event: SpeechEvent) => void;

/* ----------------------------------------------------------------------- */
/* Text to speech                                                           */
/* ----------------------------------------------------------------------- */

export type PlaybackState = "idle" | "speaking" | "paused";

/* ----------------------------------------------------------------------- */
/* Translation                                                              */
/* ----------------------------------------------------------------------- */

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  provider: string;
  isDemo: boolean;
}

/* ----------------------------------------------------------------------- */
/* Interaction data model                                                   */
/* ----------------------------------------------------------------------- */

export type VoiceInteractionStatus = "recording" | "processing" | "completed" | "failed";
export type InputMethod = "voice" | "typed";
export type VoiceMode = "live" | "demo";

export interface VoiceInteraction {
  id: string;
  sessionId: string;
  /** Language the patient spoke or typed in. Fixed when the transcript is captured. */
  language: LanguageCode;
  /** The wording the patient confirmed. Never machine-translated or rewritten. */
  transcript: string;
  /** Raw recognizer output. Only present when the patient edited it. */
  originalTranscript?: string;
  translatedTranscript?: string;
  translationLanguage?: LanguageCode;
  inputMethod: InputMethod;
  transcriptEdited: boolean;
  durationMs?: number;
  confidence?: number;
  createdAt: string;
  status: VoiceInteractionStatus;
  /** True when any part of the interaction came from simulated demo providers. */
  isDemoData: boolean;
  providers: { speech?: string; translation?: string };
}

/**
 * The only shape other SIH parts should depend on. Contains patient wording
 * exactly as confirmed plus an optional, clearly separate translation.
 */
export interface VoiceInteractionResult {
  contractVersion: "1.0";
  interactionId: string;
  sessionId: string;
  originalText: string;
  originalLanguage: LanguageCode;
  /** Raw recognizer output, present only when the patient edited it. */
  recognizedText?: string;
  wasEdited: boolean;
  translatedText?: string;
  translatedLanguage?: LanguageCode;
  translationProvider?: string;
  inputMethod: InputMethod;
  confidence?: number;
  durationMs?: number;
  capturedAt: string;
  isDemoData: boolean;
}
