/**
 * Public surface of the Voice, Multilingual & Accessible Clinical Interaction
 * module (SIH26047 - Part 2). Other SIH parts should import only from here and
 * depend only on `VoiceInteractionResult`.
 */
export { default as VoiceInteractionModule } from "./components/VoiceInteractionModule";
export type { VoiceInteractionModuleProps } from "./components/VoiceInteractionModule";
export { default as VoiceInteractionPage } from "./pages/VoiceInteractionPage";

export type {
  LanguageCode,
  PlaybackState,
  SpeechTranscript,
  TranslationResult,
  VoiceInteraction,
  VoiceInteractionResult,
  VoiceLanguage,
  VoiceMode,
} from "./types/voice";

export { VoiceError } from "./errors/VoiceError";
export { listLanguages, registerLanguage, isSupportedLanguage } from "./config/languages";
export { registerLocale } from "./locales";

export { createVoiceServices } from "./services/createVoiceServices";
export type { VoiceServices } from "./services/createVoiceServices";
export { registerSpeechProvider, registerTranslationProvider, registerTtsProvider } from "./services/createVoiceServices";

export type { SpeechRecognitionService } from "./services/speech/SpeechRecognitionService";
export type { TextToSpeechService } from "./services/tts/TextToSpeechService";
export type { TranslationService } from "./services/translation/TranslationService";
export type { VoiceInteractionRepository } from "./repositories/VoiceInteractionRepository";

export { MockSpeechRecognitionService } from "./services/speech/MockSpeechRecognitionService";
export { MockTextToSpeechService } from "./services/tts/MockTextToSpeechService";
export { MockTranslationService } from "./services/translation/MockTranslationService";
export { MockVoiceInteractionRepository } from "./repositories/MockVoiceInteractionRepository";
