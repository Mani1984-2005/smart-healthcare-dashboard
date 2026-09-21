// DEMO OCR provider. It performs NO image recognition: it recognises the bundled synthetic documents by checksum and returns the
// transcription recorded with them. Any other file is rejected — it never invents text.
import { OcrError } from "./OcrError.js";
import { sha256 } from "../../seed/fixtureCatalog.js";

export function createSyntheticFixtureProvider(fixtures) {
  return {
    id: "synthetic-demo",
    label: "Synthetic demo OCR (recorded transcripts)",
    kind: "demo",
    version: "1.0.0",
    description: "Returns the recorded transcription of the bundled synthetic documents. Performs no image recognition and cannot read any other file. Replace with a real OCR provider for real documents.",
    capabilities: { printed: true, handwritten: false, languages: ["en"], mimeTypes: ["image/png"] },
    supports: (mimeType) => mimeType === "image/png",
    async isAvailable() { return { available: true }; },
    async recognize({ buffer }) {
      const fixture = fixtures.findByHash(sha256(buffer));
      if (!fixture) {
        throw new OcrError("UNSUPPORTED_DOCUMENT", "The demo OCR provider can only read the bundled synthetic documents. This file is not one of them; configure a real OCR provider to process other documents.");
      }
      return { text: fixtures.getTranscript(fixture.id) ?? "", pageCount: 1, detectedLanguages: null, providerConfidence: null };
    },
  };
}
