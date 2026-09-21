// OCR provider contract (documentation):
//
//   provider = {
//     id, label, kind: "demo" | "real", version, description,
//     capabilities: { printed: boolean, handwritten: boolean, languages: string[], mimeTypes: string[] },
//     supports(mimeType): boolean,
//     isAvailable?(): Promise<{ available: boolean, reason?: string }>,
//     recognize({ buffer, mimeType, languageHints }): Promise<{ text: string, pageCount: number,
//                                                            detectedLanguages: string[] | null, providerConfidence: number | null }>
//   }
//
// A provider must throw OcrError (never return invented text) when it cannot read a document.
export const OCR_ERROR_STATUS = {
  UNSUPPORTED_DOCUMENT: 422,
  UNSUPPORTED_MIME: 422,
  TEXT_TOO_LARGE: 422,
  PROVIDER_UNAVAILABLE: 503,
  OCR_TIMEOUT: 504,
  OCR_FAILED: 502,
};

export class OcrError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "OcrError";
    this.code = code;
  }
}
