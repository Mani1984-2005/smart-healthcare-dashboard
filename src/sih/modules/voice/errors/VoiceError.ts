import type { VoiceErrorCode } from "../types/voice";

/**
 * Error thrown by every voice service. `message` is technical and must never
 * be shown to patients; the UI maps `code` to localized text.
 */
export class VoiceError extends Error {
  readonly code: VoiceErrorCode;

  constructor(code: VoiceErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code);
    this.name = "VoiceError";
    this.code = code;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isVoiceError(value: unknown): value is VoiceError {
  return value instanceof VoiceError;
}

/** Normalises anything thrown by a provider into a VoiceError. */
export function toVoiceError(value: unknown, fallback: VoiceErrorCode = "UNKNOWN"): VoiceError {
  if (isVoiceError(value)) return value;
  return new VoiceError(fallback, "Unexpected provider failure", { cause: value });
}
