import { Part3ApiError } from "./client";

/** A plain-language message for the UI. Never exposes stack traces or internals. */
export function describeError(err: unknown): string {
  if (err instanceof Part3ApiError) {
    switch (err.code) {
      case "NETWORK_ERROR": return "Cannot reach the Part 3 service. Check that it is running (npm run part3:api) and try again.";
      case "TIMEOUT": return "The Part 3 service took too long to respond. Please try again.";
      case "NOT_SIGNED_IN": return err.message;
      case "FORBIDDEN": return "Your role is not permitted to do this in Medical Documents.";
      case "RATE_LIMITED": return "Too many requests. Please wait a moment and try again.";
      case "UNSUPPORTED_DOCUMENT": return "The demo OCR provider can only read the bundled synthetic documents. This file cannot be read without a real OCR provider.";
      default: return err.message;
    }
  }
  return "Something went wrong. Please try again.";
}

export const errorCode = (err: unknown): string | null => (err instanceof Part3ApiError ? err.code : null);
export const errorRequestId = (err: unknown): string | null => (err instanceof Part3ApiError ? err.requestId ?? null : null);
