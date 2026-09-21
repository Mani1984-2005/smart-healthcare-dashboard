import { describe, expect, it } from "vitest";
import { VoiceError } from "../errors/VoiceError";
import { MockVoiceInteractionRepository } from "../repositories/MockVoiceInteractionRepository";
import type { TranslationResult } from "../types/voice";
import { buildInteraction, toVoiceInteractionResult } from "../utils/contract";

const translation: TranslationResult = {
  translatedText: "I have had fever for two days.",
  sourceLanguage: "kn-IN",
  targetLanguage: "en-IN",
  provider: "mock-translation",
  isDemo: true,
};

const base = {
  sessionId: "session-1",
  language: "kn-IN",
  confirmedText: "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ",
  recognizedText: "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ",
  inputMethod: "voice" as const,
  isDemoData: true,
};

describe("interaction data model", () => {
  it("keeps the patient's exact wording and original language", () => {
    const interaction = buildInteraction({ ...base, translation });
    expect(interaction.transcript).toBe(base.confirmedText);
    expect(interaction.language).toBe("kn-IN");
    expect(interaction.status).toBe("completed");
  });

  it("stores a translation in separate fields and never replaces the original", () => {
    const interaction = buildInteraction({ ...base, translation });
    expect(interaction.translatedTranscript).toBe("I have had fever for two days.");
    expect(interaction.translationLanguage).toBe("en-IN");
    expect(interaction.transcript).not.toBe(interaction.translatedTranscript);
  });

  it("omits translation fields when there is none", () => {
    const interaction = buildInteraction(base);
    expect(interaction.translatedTranscript).toBeUndefined();
    expect(interaction.translationLanguage).toBeUndefined();
  });

  it("keeps raw recognizer output when the patient edited it", () => {
    const interaction = buildInteraction({ ...base, confirmedText: "ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ" });
    expect(interaction.transcriptEdited).toBe(true);
    expect(interaction.originalTranscript).toBe(base.recognizedText);
  });

  it("does not flag typed input as edited", () => {
    const interaction = buildInteraction({ ...base, inputMethod: "typed", recognizedText: "", confirmedText: "fever" });
    expect(interaction.transcriptEdited).toBe(false);
    expect(interaction.originalTranscript).toBeUndefined();
  });

  it("trims only surrounding whitespace", () => {
    expect(buildInteraction({ ...base, confirmedText: "  Doctor, ನನಗೆ fever ಇದೆ.  ", recognizedText: "Doctor, ನನಗೆ fever ಇದೆ." }).transcript).toBe(
      "Doctor, ನನಗೆ fever ಇದೆ.",
    );
  });
});

describe("VoiceInteractionResult (integration contract)", () => {
  it("exposes the versioned shape other SIH parts consume", () => {
    const result = toVoiceInteractionResult(buildInteraction({ ...base, translation, durationMs: 2100, confidence: 0.9 }));
    expect(result).toMatchObject({
      contractVersion: "1.0",
      originalText: base.confirmedText,
      originalLanguage: "kn-IN",
      translatedText: "I have had fever for two days.",
      translatedLanguage: "en-IN",
      translationProvider: "mock-translation",
      inputMethod: "voice",
      wasEdited: false,
      isDemoData: true,
      durationMs: 2100,
      confidence: 0.9,
    });
    expect(typeof result.capturedAt).toBe("string");
  });

  it("is plain JSON so it can cross a module or network boundary", () => {
    const result = toVoiceInteractionResult(buildInteraction({ ...base, translation }));
    expect(JSON.parse(JSON.stringify(result))).toEqual(JSON.parse(JSON.stringify(result)));
    expect(Object.values(result).every((value) => value === undefined || ["string", "number", "boolean"].includes(typeof value))).toBe(true);
  });
});

describe("MockVoiceInteractionRepository", () => {
  it("saves, reads back, lists by session, deletes and clears", async () => {
    const repo = new MockVoiceInteractionRepository();
    const a = buildInteraction({ ...base, sessionId: "s1" });
    const b = buildInteraction({ ...base, sessionId: "s2" });
    await repo.save(a);
    await repo.save(b);
    expect((await repo.get(a.id))?.transcript).toBe(base.confirmedText);
    expect(await repo.listBySession("s1")).toHaveLength(1);
    await repo.delete(a.id);
    expect(await repo.get(a.id)).toBeNull();
    await repo.clearSession("s2");
    expect(await repo.listBySession("s2")).toHaveLength(0);
  });

  it("returns copies, so callers cannot mutate stored data", async () => {
    const repo = new MockVoiceInteractionRepository();
    const saved = await repo.save(buildInteraction(base));
    saved.transcript = "changed";
    expect((await repo.get(saved.id))?.transcript).toBe(base.confirmedText);
  });

  it("reports storage failures with a typed error", async () => {
    const repo = new MockVoiceInteractionRepository();
    repo.failSaves = true;
    await expect(repo.save(buildInteraction(base))).rejects.toMatchObject({ code: "STORAGE_FAILED" });
    await expect(repo.save(buildInteraction(base))).rejects.toBeInstanceOf(VoiceError);
  });

  it("keeps data in memory only (no browser storage writes)", async () => {
    const repo = new MockVoiceInteractionRepository();
    await repo.save(buildInteraction(base));
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
