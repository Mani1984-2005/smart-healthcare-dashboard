import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultTranslationTarget,
  DEFAULT_LANGUAGE,
  getLanguage,
  isSupportedLanguage,
  listLanguages,
  primarySubtag,
  registerLanguage,
  resolveLanguage,
} from "../config/languages";
import { createTranslator } from "../i18n/translator";
import { resetVoiceSessionStore, useVoiceSessionStore } from "../stores/voiceSessionStore";

describe("language registry", () => {
  it("ships English, Hindi and Kannada with region-qualified codes", () => {
    expect(listLanguages().map((language) => language.code)).toEqual(expect.arrayContaining(["en-IN", "hi-IN", "kn-IN"]));
    expect(getLanguage("kn-IN")).toMatchObject({ primary: "kn", nativeLabel: "ಕನ್ನಡ", label: "Kannada" });
  });

  it("matches codes case-insensitively and accepts underscores", () => {
    expect(getLanguage("HI-in")?.code).toBe("hi-IN");
    expect(getLanguage("kn_IN")?.code).toBe("kn-IN");
  });

  it("treats unknown, empty and null languages as unsupported", () => {
    expect(isSupportedLanguage("fr-FR")).toBe(false);
    expect(isSupportedLanguage("")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
    expect(resolveLanguage("fr-FR")).toBe(DEFAULT_LANGUAGE);
  });

  it("extracts the primary subtag", () => {
    expect(primarySubtag("kn-IN")).toBe("kn");
    expect(primarySubtag("EN_us")).toBe("en");
  });

  it("can be extended without touching other code, and falls back to English strings", () => {
    registerLanguage({ code: "ta-IN", primary: "ta", label: "Tamil", nativeLabel: "தமிழ்", script: "Taml", direction: "ltr" });
    expect(isSupportedLanguage("ta-IN")).toBe(true);
    // No Tamil locale bundle yet: the UI uses English rather than showing raw keys.
    const t = createTranslator("ta-IN");
    expect(t("voice.idle")).toBe("Tap to speak");
    expect(t.bundleLanguage).toBe("en");
  });

  it("picks English as the translation target for non-English speakers", () => {
    expect(defaultTranslationTarget("kn-IN")).toBe("en-IN");
    expect(defaultTranslationTarget("hi-IN")).toBe("en-IN");
    expect(defaultTranslationTarget("en-IN")).not.toBe("en-IN");
  });
});

describe("language session store", () => {
  beforeEach(() => resetVoiceSessionStore());

  it("selects and remembers a supported language for the session", () => {
    expect(useVoiceSessionStore.getState().setLanguage("kn-IN")).toBe(true);
    expect(useVoiceSessionStore.getState().language).toBe("kn-IN");
    expect(window.sessionStorage.getItem("medicare.voice.language")).toBe("kn-IN");
  });

  it("rejects an unsupported language, keeps the current one and flags a notice", () => {
    useVoiceSessionStore.getState().setLanguage("hi-IN");
    expect(useVoiceSessionStore.getState().setLanguage("de-DE")).toBe(false);
    expect(useVoiceSessionStore.getState().language).toBe("hi-IN");
    expect(useVoiceSessionStore.getState().languageNotice).toBe(true);
  });

  it("clears the notice after a valid selection", () => {
    useVoiceSessionStore.getState().setLanguage("de-DE");
    useVoiceSessionStore.getState().setLanguage("en-IN");
    expect(useVoiceSessionStore.getState().languageNotice).toBe(false);
  });

  it("stores only language and mode in browser storage, never transcripts", () => {
    useVoiceSessionStore.getState().setLanguage("kn-IN");
    useVoiceSessionStore.getState().setMode("demo");
    const keys = Object.keys(window.sessionStorage).sort();
    expect(keys).toEqual(["medicare.voice.language", "medicare.voice.mode"]);
    expect(window.localStorage.length).toBe(0);
  });
});
