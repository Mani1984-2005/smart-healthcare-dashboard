import { describe, expect, it } from "vitest";
import { ERROR_CATALOG, describeError } from "../errors/errorCatalog";
import { createTranslator } from "../i18n/translator";
import { en } from "../locales/en";
import { hi } from "../locales/hi";
import { kn } from "../locales/kn";
import { getLocaleBundle, listLocalePrimaries } from "../locales";

const keys = Object.keys(en) as Array<keyof typeof en>;

describe("locale bundles", () => {
  it("registers en, hi and kn", () => {
    expect(listLocalePrimaries()).toEqual(expect.arrayContaining(["en", "hi", "kn"]));
    expect(getLocaleBundle("kn")).toBe(kn);
  });

  it.each([
    ["hi", hi],
    ["kn", kn],
  ])("%s has exactly the same keys as English, none empty", (_name, bundle) => {
    expect(Object.keys(bundle).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(bundle[key].trim().length).toBeGreaterThan(0);
  });

  it("uses each language's own script for the core voice strings", () => {
    expect(hi["voice.idle"]).toMatch(/[\u0900-\u097F]/);
    expect(kn["voice.idle"]).toMatch(/[\u0C80-\u0CFF]/);
    expect(kn["prompt.problem"]).toMatch(/[\u0C80-\u0CFF]/);
  });

  it("keeps interpolation placeholders identical across languages", () => {
    for (const key of keys) {
      const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
      expect(placeholders(hi[key])).toEqual(placeholders(en[key]));
      expect(placeholders(kn[key])).toEqual(placeholders(en[key]));
    }
  });
});

describe("translator", () => {
  it("returns strings for the requested language", () => {
    expect(createTranslator("en-IN")("voice.idle")).toBe("Tap to speak");
    expect(createTranslator("hi-IN")("voice.idle")).toBe(hi["voice.idle"]);
    expect(createTranslator("kn-IN")("voice.startLabel")).toBe(kn["voice.startLabel"]);
  });

  it("interpolates named values and leaves unknown placeholders intact", () => {
    const t = createTranslator("en-IN");
    expect(t("transcript.language", { language: "Kannada" })).toBe("Language: Kannada");
    expect(t("transcript.language", {})).toBe("Language: {language}");
  });

  it("falls back to English for languages without a bundle", () => {
    expect(createTranslator("fr-FR")("voice.listening")).toBe("Listening...");
  });
});

describe("error catalog", () => {
  it("gives every error code a real message and a way forward", () => {
    for (const [code, description] of Object.entries(ERROR_CATALOG)) {
      expect(en[description.messageKey], code).toBeTruthy();
      expect(description.recovery.length, code).toBeGreaterThan(0);
    }
  });

  it("never puts technical wording in patient messages", () => {
    for (const description of Object.values(ERROR_CATALOG)) {
      expect(en[description.messageKey]).not.toMatch(/exception|undefined|null|stack|NotAllowed|HTTP|\b[45]\d\d\b/i);
    }
  });

  it("falls back to the generic message for unexpected codes", () => {
    expect(describeError("SOMETHING_NEW" as never).messageKey).toBe("error.generic");
  });
});
