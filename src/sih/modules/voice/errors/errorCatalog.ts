import type { RecoveryAction, VoiceErrorCode } from "../types/voice";
import type { VoiceMessageKey } from "../locales/en";

interface ErrorDescription {
  messageKey: VoiceMessageKey;
  recovery: RecoveryAction[];
}

/**
 * Every failure maps to a localized, non-technical message and at least one
 * way forward. Keep this table exhaustive: the Record type enforces it.
 */
export const ERROR_CATALOG: Record<VoiceErrorCode, ErrorDescription> = {
  PERMISSION_DENIED: { messageKey: "error.permissionDenied", recovery: ["retry", "type", "demo"] },
  PERMISSION_UNAVAILABLE: { messageKey: "error.permissionUnavailable", recovery: ["type", "demo"] },
  MICROPHONE_UNAVAILABLE: { messageKey: "error.micUnavailable", recovery: ["retry", "type", "demo"] },
  BROWSER_UNSUPPORTED: { messageKey: "error.unsupported", recovery: ["type", "demo"] },
  LANGUAGE_UNSUPPORTED: { messageKey: "error.languageUnsupported", recovery: ["type", "demo"] },
  RECORDING_INTERRUPTED: { messageKey: "error.interrupted", recovery: ["retry", "type"] },
  EMPTY_RECORDING: { messageKey: "error.empty", recovery: ["retry", "type"] },
  RECOGNITION_FAILED: { messageKey: "error.recognitionFailed", recovery: ["retry", "type", "demo"] },
  NETWORK_OFFLINE: { messageKey: "error.offline", recovery: ["retry", "type", "demo"] },
  TIMEOUT: { messageKey: "error.timeout", recovery: ["retry", "type"] },
  SERVER_FAILURE: { messageKey: "error.server", recovery: ["retry", "type", "demo"] },
  TRANSLATION_UNAVAILABLE: { messageKey: "error.translationUnavailable", recovery: ["retry", "dismiss"] },
  TRANSLATION_TIMEOUT: { messageKey: "error.translationTimeout", recovery: ["retry", "dismiss"] },
  TRANSLATION_LANGUAGE_UNSUPPORTED: { messageKey: "error.translationUnsupported", recovery: ["dismiss"] },
  TRANSLATION_DEMO_ONLY: { messageKey: "error.translationDemoOnly", recovery: ["dismiss"] },
  TTS_UNSUPPORTED: { messageKey: "error.ttsUnsupported", recovery: ["dismiss"] },
  TTS_LANGUAGE_UNSUPPORTED: { messageKey: "error.ttsLanguageUnsupported", recovery: ["dismiss"] },
  TTS_FAILED: { messageKey: "error.ttsFailed", recovery: ["retry", "dismiss"] },
  STORAGE_FAILED: { messageKey: "error.saveFailed", recovery: ["retry"] },
  UNKNOWN: { messageKey: "error.generic", recovery: ["retry", "type"] },
};

export function describeError(code: VoiceErrorCode): ErrorDescription {
  return ERROR_CATALOG[code] ?? ERROR_CATALOG.UNKNOWN;
}
