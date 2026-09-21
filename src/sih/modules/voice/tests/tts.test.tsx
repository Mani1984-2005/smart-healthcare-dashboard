import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { BrowserTextToSpeechService, pickVoice } from "../services/tts/BrowserTextToSpeechService";
import { MockTextToSpeechService } from "../services/tts/MockTextToSpeechService";

/** Just enough of speechSynthesis for the adapter. */
class FakeUtterance {
  text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function voice(lang: string, name = lang): SpeechSynthesisVoice {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

function makeSynthesis(voices: SpeechSynthesisVoice[]) {
  const spoken: FakeUtterance[] = [];
  const listeners = new Map<string, () => void>();
  const synthesis = {
    voices,
    speak: vi.fn((utterance: FakeUtterance) => {
      spoken.push(utterance);
    }),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => synthesis.voices,
    addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
    fire: (name: string) => listeners.get(name)?.(),
  };
  return { synthesis, spoken };
}

function makeService(voices: SpeechSynthesisVoice[], extra: { timeout?: number } = {}) {
  const { synthesis, spoken } = makeSynthesis(voices);
  const service = new BrowserTextToSpeechService({
    getSynthesis: () => synthesis as unknown as SpeechSynthesis,
    createUtterance: (text) => new FakeUtterance(text) as unknown as SpeechSynthesisUtterance,
    voiceLoadTimeoutMs: extra.timeout ?? 20,
  });
  return { service, synthesis, spoken };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("BrowserTextToSpeechService", () => {
  it("speaks with a voice matching the language and resolves when playback ends", async () => {
    const { service, spoken } = makeService([voice("en-US"), voice("kn-IN", "Kannada voice")]);
    const done = service.speak("ನಮಸ್ಕಾರ", "kn-IN");
    await tick();
    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe("kn-IN");
    expect((spoken[0].voice as SpeechSynthesisVoice).name).toBe("Kannada voice");
    spoken[0].onstart?.();
    expect(service.getState()).toBe("speaking");
    spoken[0].onend?.();
    await expect(done).resolves.toBeUndefined();
    expect(service.getState()).toBe("idle");
  });

  it("prefers an exact locale but accepts any voice of the same language", () => {
    const voices = [voice("hi-IN"), voice("en-GB"), voice("en-IN")];
    expect(pickVoice(voices, "en-IN")?.lang).toBe("en-IN");
    expect(pickVoice([voice("en-GB")], "en-IN")?.lang).toBe("en-GB");
    expect(pickVoice(voices, "kn-IN")).toBeUndefined();
    expect(pickVoice([voice("kn_IN")], "kn-IN")?.lang).toBe("kn_IN");
  });

  it("rejects with TTS_LANGUAGE_UNSUPPORTED when the device has voices but none for the language", async () => {
    const { service, synthesis } = makeService([voice("en-US"), voice("hi-IN")]);
    expect(service.getSupport("kn-IN")).toEqual({ supported: false, reason: "TTS_LANGUAGE_UNSUPPORTED" });
    await expect(service.speak("ನಮಸ್ಕಾರ", "kn-IN")).rejects.toMatchObject({ code: "TTS_LANGUAGE_UNSUPPORTED" });
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("reports missing speech synthesis as unsupported without crashing", async () => {
    const service = new BrowserTextToSpeechService({ getSynthesis: () => undefined });
    expect(service.getSupport("en-IN")).toEqual({ supported: false, reason: "TTS_UNSUPPORTED" });
    await expect(service.speak("hello", "en-IN")).rejects.toMatchObject({ code: "TTS_UNSUPPORTED" });
    expect(() => {
      service.pause();
      service.resume();
      service.stop();
    }).not.toThrow();
  });

  it("still speaks when the voice list is empty (some browsers never populate it)", async () => {
    const { service, spoken } = makeService([]);
    const done = service.speak("hello", "en-IN");
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe("en-IN");
    spoken[0].onend?.();
    await done;
  });

  it("waits for voices that load late", async () => {
    const { service, synthesis, spoken } = makeService([], { timeout: 500 });
    const done = service.speak("नमस्ते", "hi-IN");
    await tick();
    synthesis.voices = [voice("hi-IN")];
    synthesis.fire("voiceschanged");
    await tick();
    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe("hi-IN");
    spoken[0].onend?.();
    await done;
  });

  it("stop() cancels playback, resolves the pending speak and returns to idle", async () => {
    const { service, synthesis, spoken } = makeService([voice("en-IN")]);
    const done = service.speak("a long instruction", "en-IN");
    await tick();
    spoken[0].onstart?.();
    service.stop();
    await expect(done).resolves.toBeUndefined();
    expect(synthesis.cancel).toHaveBeenCalled();
    expect(service.getState()).toBe("idle");
  });

  it("treats 'interrupted' and 'canceled' errors as a normal stop, not a failure", async () => {
    const { service, spoken } = makeService([voice("en-IN")]);
    const done = service.speak("hello", "en-IN");
    await tick();
    spoken[0].onerror?.({ error: "interrupted" });
    await expect(done).resolves.toBeUndefined();
  });

  it("maps real synthesis errors to typed errors", async () => {
    const { service, spoken } = makeService([voice("en-IN")]);
    const failed = service.speak("hello", "en-IN");
    await tick();
    spoken[0].onerror?.({ error: "synthesis-failed" });
    await expect(failed).rejects.toMatchObject({ code: "TTS_FAILED" });

    const unavailable = service.speak("hello", "en-IN");
    await tick();
    spoken[1].onerror?.({ error: "language-unavailable" });
    await expect(unavailable).rejects.toMatchObject({ code: "TTS_LANGUAGE_UNSUPPORTED" });
  });

  it("pauses and resumes, tracking state", async () => {
    const { service, synthesis, spoken } = makeService([voice("en-IN")]);
    const done = service.speak("hello", "en-IN");
    await tick();
    spoken[0].onstart?.();
    service.pause();
    expect(synthesis.pause).toHaveBeenCalled();
    expect(service.getState()).toBe("paused");
    service.resume();
    expect(synthesis.resume).toHaveBeenCalled();
    expect(service.getState()).toBe("speaking");
    spoken[0].onend?.();
    await done;
  });

  it("ignores pause/resume when nothing is playing", () => {
    const { service, synthesis } = makeService([voice("en-IN")]);
    service.pause();
    service.resume();
    expect(synthesis.pause).not.toHaveBeenCalled();
    expect(synthesis.resume).not.toHaveBeenCalled();
  });

  it("a new speak() replaces the current one, and stop() during voice loading prevents speech", async () => {
    const { service, spoken } = makeService([voice("en-IN")]);
    const first = service.speak("first", "en-IN");
    await tick();
    const second = service.speak("second", "en-IN");
    await tick();
    expect(spoken.map((item) => item.text)).toEqual(["first", "second"]);
    spoken[1].onend?.();
    await Promise.all([first, second]);

    const late = makeService([]);
    const pending = late.service.speak("never", "en-IN");
    late.service.stop();
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(late.spoken).toHaveLength(0);
  });

  it("does not speak empty text", async () => {
    const { service, synthesis } = makeService([voice("en-IN")]);
    await service.speak("   ", "en-IN");
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("notifies subscribers of state changes until disposed", async () => {
    const { service, spoken } = makeService([voice("en-IN")]);
    const states: string[] = [];
    service.subscribe((state) => states.push(state));
    const done = service.speak("hello", "en-IN");
    await tick();
    spoken[0].onend?.();
    await done;
    expect(states).toEqual(["speaking", "idle"]);
    service.dispose();
    expect(service.getState()).toBe("idle");
  });
});

describe("MockTextToSpeechService", () => {
  it("records what would be read aloud and simulates playback", async () => {
    const service = new MockTextToSpeechService({ durationMs: 10 });
    await service.speak("Please tell us what problem you are experiencing.", "en-IN");
    expect(service.spoken).toEqual([{ text: "Please tell us what problem you are experiencing.", language: "en-IN" }]);
    expect(service.getState()).toBe("idle");
    expect(service.isDemo).toBe(true);
  });

  it("supports pause, resume and stop", async () => {
    const service = new MockTextToSpeechService({ durationMs: 500 });
    const done = service.speak("hello", "en-IN");
    expect(service.getState()).toBe("speaking");
    service.pause();
    expect(service.getState()).toBe("paused");
    service.resume();
    expect(service.getState()).toBe("speaking");
    service.stop();
    await done;
    expect(service.getState()).toBe("idle");
  });

  it("can simulate unsupported and failing speech", async () => {
    const unsupported = new MockTextToSpeechService({ unsupportedReason: "TTS_UNSUPPORTED" });
    expect(unsupported.getSupport("en-IN").supported).toBe(false);
    await expect(unsupported.speak("hi", "en-IN")).rejects.toMatchObject({ code: "TTS_UNSUPPORTED" });
    await expect(new MockTextToSpeechService({ failWith: "TTS_FAILED" }).speak("hi", "en-IN")).rejects.toMatchObject({
      code: "TTS_FAILED",
    });
  });
});

describe("useSpeechSynthesis", () => {
  it("tracks which item is playing and clears it when finished", async () => {
    const service = new MockTextToSpeechService({ durationMs: 30 });
    const { result } = renderHook(() => useSpeechSynthesis(service));
    let speaking: Promise<void> = Promise.resolve();
    act(() => {
      speaking = result.current.speak("prompt", "Hello", "en-IN");
    });
    expect(result.current.activeKey).toBe("prompt");
    expect(result.current.activeText).toBe("Hello");
    expect(result.current.playback).toBe("speaking");
    await act(async () => {
      await speaking;
    });
    expect(result.current.activeKey).toBeNull();
    expect(result.current.playback).toBe("idle");
  });

  it("stop() ends playback immediately", async () => {
    const service = new MockTextToSpeechService({ durationMs: 1000 });
    const { result } = renderHook(() => useSpeechSynthesis(service));
    act(() => {
      void result.current.speak("a", "Hello", "en-IN");
    });
    act(() => result.current.stop());
    expect(result.current.activeKey).toBeNull();
    expect(result.current.playback).toBe("idle");
  });

  it("starting a second item replaces the first", async () => {
    const service = new MockTextToSpeechService({ durationMs: 1000 });
    const { result } = renderHook(() => useSpeechSynthesis(service));
    act(() => {
      void result.current.speak("a", "First", "en-IN");
    });
    act(() => {
      void result.current.speak("b", "Second", "en-IN");
    });
    expect(result.current.activeKey).toBe("b");
    act(() => result.current.stop());
  });

  it("surfaces a typed, recoverable error when speech is unsupported", async () => {
    const service = new MockTextToSpeechService({ unsupportedReason: "TTS_UNSUPPORTED" });
    const { result } = renderHook(() => useSpeechSynthesis(service));
    await act(async () => {
      await result.current.speak("a", "Hello", "en-IN");
    });
    expect(result.current.error?.code).toBe("TTS_UNSUPPORTED");
    expect(result.current.activeKey).toBeNull();
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("stops speaking when the component unmounts", () => {
    const service = new MockTextToSpeechService({ durationMs: 1000 });
    const stop = vi.spyOn(service, "stop");
    const { result, unmount } = renderHook(() => useSpeechSynthesis(service));
    act(() => {
      void result.current.speak("a", "Hello", "en-IN");
    });
    unmount();
    expect(stop).toHaveBeenCalled();
    expect(service.getState()).toBe("idle");
  });
});
