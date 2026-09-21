import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoiceError } from "../errors/VoiceError";
import { useTextTranslation } from "../hooks/useTextTranslation";
import { HttpTranslationService } from "../services/translation/HttpTranslationService";
import { MockTranslationService, normalizePhrase } from "../services/translation/MockTranslationService";
import type { TranslationService } from "../services/translation/TranslationService";
import { EN_SAMPLE, KN_SAMPLE, KN_SAMPLE_EN } from "./helpers";

const mock = () => new MockTranslationService({ latencyMs: 0 });

describe("MockTranslationService (demo)", () => {
  it("translates the Kannada sample into English and marks it as demo output", async () => {
    const result = await mock().translate(KN_SAMPLE, "kn-IN", "en-IN");
    expect(result).toEqual({
      translatedText: KN_SAMPLE_EN,
      sourceLanguage: "kn-IN",
      targetLanguage: "en-IN",
      provider: "mock-translation",
      isDemo: true,
    });
  });

  it("handles code-switched Kannada + English input without altering it", async () => {
    const mixed = "Doctor, ನನಗೆ fever ಇದೆ.";
    const result = await mock().translate(mixed, "kn-IN", "en-IN");
    expect(result.translatedText).toBe("Doctor, I have fever.");
    // The service returns only the translation; the caller still holds `mixed` untouched.
    expect(mixed).toBe("Doctor, ನನಗೆ fever ಇದೆ.");
  });

  it("translates between all three demo languages", async () => {
    expect((await mock().translate(EN_SAMPLE, "en-IN", "hi-IN")).translatedText).toMatch(/[\u0900-\u097F]/);
    expect((await mock().translate(EN_SAMPLE, "en-IN", "kn-IN")).translatedText).toMatch(/[\u0C80-\u0CFF]/);
    expect((await mock().translate("मुझे दो दिन से बुखार है।", "hi-IN", "en-IN")).translatedText).toBe(KN_SAMPLE_EN);
  });

  it("ignores case, extra spaces and end punctuation when matching samples", async () => {
    expect((await mock().translate("  i have had FEVER for two days ", "en-IN", "kn-IN")).translatedText).toBe(KN_SAMPLE);
    expect(normalizePhrase("Hello,  World!! ")).toBe("hello, world");
  });

  it("refuses text it has no sample for instead of inventing a translation", async () => {
    await expect(mock().translate("My knee hurts when I climb stairs", "en-IN", "kn-IN")).rejects.toMatchObject({
      code: "TRANSLATION_DEMO_ONLY",
    });
  });

  it("reports unsupported language pairs", async () => {
    const service = mock();
    expect(service.supports("kn-IN", "ta-IN")).toBe(false);
    expect(service.supports("kn-IN", "kn-IN")).toBe(false);
    expect(service.supports("kn-IN", "en-IN")).toBe(true);
    await expect(service.translate(KN_SAMPLE, "kn-IN", "ta-IN")).rejects.toMatchObject({
      code: "TRANSLATION_LANGUAGE_UNSUPPORTED",
    });
  });

  it("can simulate an outage and honours cancellation", async () => {
    await expect(new MockTranslationService({ latencyMs: 0, failWith: "TRANSLATION_UNAVAILABLE" }).translate(KN_SAMPLE, "kn-IN", "en-IN")).rejects.toMatchObject({
      code: "TRANSLATION_UNAVAILABLE",
    });
    const controller = new AbortController();
    const slow = new MockTranslationService({ latencyMs: 200 }).translate(KN_SAMPLE, "kn-IN", "en-IN", { signal: controller.signal });
    controller.abort();
    await expect(slow).rejects.toMatchObject({ code: "TRANSLATION_TIMEOUT" });
  });
});

describe("HttpTranslationService (proxy adapter)", () => {
  const endpoint = "/api/voice/translate";
  const okResponse = (body: unknown, status = 200) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

  it("reports translation as unavailable when no endpoint is configured", async () => {
    const service = new HttpTranslationService({});
    expect(service.supports("kn-IN", "en-IN")).toBe(false);
    await expect(service.translate("x", "kn-IN", "en-IN")).rejects.toMatchObject({ code: "TRANSLATION_UNAVAILABLE" });
  });

  it("posts the text and languages, never credentials, and returns the translation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ translatedText: "I have fever", provider: "backend-x" }));
    const service = new HttpTranslationService({ endpoint, fetchImpl, isOnline: () => true });
    const result = await service.translate("ನನಗೆ ಜ್ವರ", "kn-IN", "en-IN");

    expect(result).toMatchObject({ translatedText: "I have fever", provider: "backend-x", isDemo: false, targetLanguage: "en-IN" });
    const [url, init] = fetchImpl.mock.calls[0] as [string, NonNullable<Parameters<typeof fetch>[1]>];
    expect(url).toBe(endpoint);
    expect(JSON.parse(init.body as string)).toEqual({ text: "ನನಗೆ ಜ್ವರ", sourceLanguage: "kn-IN", targetLanguage: "en-IN" });
    expect(Object.keys(init.headers as Record<string, string>).map((key) => key.toLowerCase())).not.toContain("authorization");
    expect(init.credentials).toBe("same-origin");
  });

  it("fails fast when offline", async () => {
    const fetchImpl = vi.fn();
    const service = new HttpTranslationService({ endpoint, fetchImpl, isOnline: () => false });
    await expect(service.translate("x", "kn-IN", "en-IN")).rejects.toMatchObject({ code: "NETWORK_OFFLINE" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("times out slow servers", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: Parameters<typeof fetch>[1]) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const service = new HttpTranslationService({ endpoint, fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20, isOnline: () => true });
    await expect(service.translate("x", "kn-IN", "en-IN")).rejects.toMatchObject({ code: "TRANSLATION_TIMEOUT" });
  });

  it.each([
    [500, "SERVER_FAILURE"],
    [503, "SERVER_FAILURE"],
    [422, "TRANSLATION_LANGUAGE_UNSUPPORTED"],
    [400, "TRANSLATION_LANGUAGE_UNSUPPORTED"],
    [404, "TRANSLATION_UNAVAILABLE"],
  ])("maps HTTP %s to %s", async (status, code) => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({}, status));
    const service = new HttpTranslationService({ endpoint, fetchImpl, isOnline: () => true });
    await expect(service.translate("x", "kn-IN", "en-IN")).rejects.toMatchObject({ code });
  });

  it("rejects malformed responses instead of showing garbage", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ translatedText: "   " }));
    const service = new HttpTranslationService({ endpoint, fetchImpl, isOnline: () => true });
    await expect(service.translate("x", "kn-IN", "en-IN")).rejects.toMatchObject({ code: "SERVER_FAILURE" });
  });

  it("maps network failures to TRANSLATION_UNAVAILABLE", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const service = new HttpTranslationService({ endpoint, fetchImpl, isOnline: () => true });
    await expect(service.translate("x", "kn-IN", "en-IN")).rejects.toMatchObject({ code: "TRANSLATION_UNAVAILABLE" });
  });
});

describe("useTextTranslation", () => {
  it("moves idle > translating > done and keeps the result apart from the source text", async () => {
    const { result } = renderHook(() => useTextTranslation(mock()));
    expect(result.current.status).toBe("idle");
    await act(async () => {
      await result.current.translate(KN_SAMPLE, "kn-IN", "en-IN");
    });
    expect(result.current.status).toBe("done");
    expect(result.current.result?.translatedText).toBe(KN_SAMPLE_EN);
    expect(result.current.result?.sourceLanguage).toBe("kn-IN");
  });

  it("shows a translating state while the request is running", async () => {
    const service = new MockTranslationService({ latencyMs: 30 });
    const { result } = renderHook(() => useTextTranslation(service));
    let running: Promise<void> = Promise.resolve();
    act(() => {
      running = result.current.translate(KN_SAMPLE, "kn-IN", "en-IN");
    });
    expect(result.current.status).toBe("translating");
    await act(async () => {
      await running;
    });
    expect(result.current.status).toBe("done");
  });

  it("captures failures as a typed error and can retry successfully", async () => {
    let fail = true;
    const service: TranslationService = {
      id: "flaky",
      isDemo: false,
      supports: () => true,
      async translate(text, source, target) {
        if (fail) throw new VoiceError("TRANSLATION_UNAVAILABLE");
        return { translatedText: "ok", sourceLanguage: source, targetLanguage: target, provider: "flaky", isDemo: false };
      },
    };
    const { result } = renderHook(() => useTextTranslation(service));
    await act(async () => {
      await result.current.translate("x", "kn-IN", "en-IN");
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("TRANSLATION_UNAVAILABLE");
    expect(result.current.result).toBeNull();

    fail = false;
    await act(async () => {
      await result.current.translate("x", "kn-IN", "en-IN");
    });
    expect(result.current.status).toBe("done");
    expect(result.current.error).toBeNull();
  });

  it("wraps non-VoiceError exceptions", async () => {
    const service: TranslationService = {
      id: "broken",
      isDemo: false,
      supports: () => true,
      translate: () => Promise.reject(new Error("raw provider message")),
    };
    const { result } = renderHook(() => useTextTranslation(service));
    await act(async () => {
      await result.current.translate("x", "kn-IN", "en-IN");
    });
    expect(result.current.error).toBeInstanceOf(VoiceError);
    expect(result.current.error?.code).toBe("TRANSLATION_UNAVAILABLE");
  });

  it("reset() drops the result and cancels in-flight work", async () => {
    const service = new MockTranslationService({ latencyMs: 30 });
    const { result } = renderHook(() => useTextTranslation(service));
    act(() => {
      void result.current.translate(KN_SAMPLE, "kn-IN", "en-IN");
    });
    act(() => result.current.reset());
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
  });

  it("cancels in-flight translation when the component unmounts", async () => {
    let captured: AbortSignal | undefined;
    const service: TranslationService = {
      id: "watcher",
      isDemo: false,
      supports: () => true,
      translate: (_text, source, target, options) => {
        captured = options?.signal;
        return new Promise(() => undefined).then(() => ({
          translatedText: "never",
          sourceLanguage: source,
          targetLanguage: target,
          provider: "watcher",
          isDemo: false,
        }));
      },
    };
    const { result, unmount } = renderHook(() => useTextTranslation(service));
    act(() => {
      void result.current.translate("x", "kn-IN", "en-IN");
    });
    expect(captured?.aborted).toBe(false);
    unmount();
    expect(captured?.aborted).toBe(true);
  });
});
