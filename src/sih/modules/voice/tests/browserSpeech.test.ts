import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BrowserSpeechRecognitionService,
  mapWebSpeechError,
} from "../services/speech/BrowserSpeechRecognitionService";
import type {
  WebSpeechErrorEvent,
  WebSpeechRecognition,
  WebSpeechResultEvent,
} from "../services/speech/webSpeechTypes";
import type { SpeechEvent } from "../types/voice";

type StartBehavior = "ok" | "denied" | "no-mic" | "throws" | "silent";

class FakeRecognition implements WebSpeechRecognition {
  static instances: FakeRecognition[] = [];
  static behavior: StartBehavior = "ok";
  /** When false, stop() never produces an "end" event (simulates a hung recognizer). */
  static endOnStop = true;

  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: WebSpeechErrorEvent) => void) | null = null;
  onresult: ((event: WebSpeechResultEvent) => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  aborted = false;
  stopped = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {
    switch (FakeRecognition.behavior) {
      case "ok":
        setTimeout(() => this.onstart?.(), 0);
        break;
      case "denied":
        setTimeout(() => {
          this.onerror?.({ error: "not-allowed" });
          this.onend?.();
        }, 0);
        break;
      case "no-mic":
        setTimeout(() => {
          this.onerror?.({ error: "audio-capture" });
          this.onend?.();
        }, 0);
        break;
      case "throws":
        throw new Error("InvalidStateError");
      case "silent":
        break;
    }
  }

  stop() {
    this.stopped = true;
    if (FakeRecognition.endOnStop) setTimeout(() => this.onend?.(), 0);
  }

  abort() {
    this.aborted = true;
  }

  /** Test helper: deliver one recognition result. */
  hear(text: string, isFinal: boolean, confidence = 0.9) {
    const result = Object.assign([{ transcript: text, confidence }], { isFinal, length: 1 });
    this.onresult?.({ resultIndex: 0, results: { length: 1, 0: result } as WebSpeechResultEvent["results"] });
  }
}

function makeService(overrides: ConstructorParameters<typeof BrowserSpeechRecognitionService>[0] = {}) {
  return new BrowserSpeechRecognitionService({
    getConstructor: () => FakeRecognition,
    isOnline: () => true,
    isSecureContext: () => true,
    finalizeTimeoutMs: 40,
    ...overrides,
  });
}

const last = () => FakeRecognition.instances[FakeRecognition.instances.length - 1];

beforeEach(() => {
  FakeRecognition.instances = [];
  FakeRecognition.behavior = "ok";
  FakeRecognition.endOnStop = true;
});

describe("BrowserSpeechRecognitionService support checks", () => {
  it("reports an unsupported browser without throwing", () => {
    const service = makeService({ getConstructor: () => undefined });
    expect(service.getSupport("en-IN")).toEqual({ supported: false, reason: "BROWSER_UNSUPPORTED" });
  });

  it("reports an insecure page as permission-unavailable", () => {
    const service = makeService({ isSecureContext: () => false });
    expect(service.getSupport("en-IN")).toEqual({ supported: false, reason: "PERMISSION_UNAVAILABLE" });
  });

  it("start() rejects with a typed error when unsupported, and creates no recognizer", async () => {
    const service = makeService({ getConstructor: () => undefined });
    await expect(service.start({ language: "en-IN" })).rejects.toMatchObject({ code: "BROWSER_UNSUPPORTED" });
    expect(FakeRecognition.instances).toHaveLength(0);
  });

  it("start() rejects when offline before touching the microphone", async () => {
    const service = makeService({ isOnline: () => false });
    await expect(service.start({ language: "hi-IN" })).rejects.toMatchObject({ code: "NETWORK_OFFLINE" });
    expect(FakeRecognition.instances).toHaveLength(0);
  });

  it("never creates a recognizer (never asks for the microphone) until start() is called", () => {
    const service = makeService();
    service.getSupport("kn-IN");
    service.subscribe(() => undefined);
    expect(FakeRecognition.instances).toHaveLength(0);
  });
});

describe("BrowserSpeechRecognitionService recording", () => {
  it("configures the recognizer with the selected language and resolves once the mic is live", async () => {
    const service = makeService();
    await service.start({ language: "kn-IN" });
    expect(last().lang).toBe("kn-IN");
    expect(last().interimResults).toBe(true);
    expect(last().continuous).toBe(true);
  });

  it("returns the final transcript after stop, with average confidence and provider info", async () => {
    const now = vi.fn().mockReturnValueOnce(1000).mockReturnValue(3500);
    const service = makeService({ now });
    await service.start({ language: "en-IN" });
    last().hear("I have had fever", true, 0.8);
    last().hear("for two days", true, 1);
    await service.stop();
    const transcript = await service.getTranscript();
    expect(transcript).toMatchObject({
      text: "I have had fever for two days",
      language: "en-IN",
      provider: "browser-web-speech",
      isDemo: false,
    });
    expect(transcript.confidence).toBeCloseTo(0.9);
    expect(transcript.durationMs).toBe(2500);
  });

  it("emits interim text while the person is still speaking", async () => {
    const service = makeService();
    const events: SpeechEvent[] = [];
    service.subscribe((event) => events.push(event));
    await service.start({ language: "en-IN" });
    last().hear("I have", false);
    expect(events).toContainEqual({ type: "interim", text: "I have" });
  });

  it("reports speech activity from the recognizer", async () => {
    const service = makeService();
    const events: SpeechEvent[] = [];
    service.subscribe((event) => events.push(event));
    await service.start({ language: "en-IN" });
    last().onspeechstart?.();
    last().onspeechend?.();
    expect(events).toEqual([
      { type: "speech-activity", active: true },
      { type: "speech-activity", active: false },
    ]);
  });

  it("keeps a code-switched sentence exactly as recognised", async () => {
    const service = makeService();
    await service.start({ language: "kn-IN" });
    last().hear("Doctor, ನನಗೆ fever ಇದೆ.", true);
    await service.stop();
    expect((await service.getTranscript()).text).toBe("Doctor, ನನಗೆ fever ಇದೆ.");
  });

  it("uses interim text when the engine ends without a final result", async () => {
    const service = makeService();
    await service.start({ language: "en-IN" });
    last().hear("my head hurts", false);
    await service.stop();
    expect((await service.getTranscript()).text).toBe("my head hurts");
  });

  it("emits 'ended' when the browser stops listening on its own", async () => {
    const service = makeService();
    const events: SpeechEvent[] = [];
    service.subscribe((event) => events.push(event));
    await service.start({ language: "en-IN" });
    last().hear("hello", true);
    last().onend?.();
    expect(events).toContainEqual({ type: "ended" });
    expect((await service.getTranscript()).text).toBe("hello");
  });

  it("reports an empty recording", async () => {
    const service = makeService();
    await service.start({ language: "en-IN" });
    await service.stop();
    await expect(service.getTranscript()).rejects.toMatchObject({ code: "EMPTY_RECORDING" });
  });

  it("reports 'no-speech' as an empty recording when the session ends", async () => {
    const service = makeService();
    await service.start({ language: "en-IN" });
    last().onerror?.({ error: "no-speech" });
    last().onend?.();
    await expect(service.getTranscript()).rejects.toMatchObject({ code: "EMPTY_RECORDING" });
  });

  it("rejects start() when the microphone permission is denied", async () => {
    FakeRecognition.behavior = "denied";
    const service = makeService();
    await expect(service.start({ language: "en-IN" })).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("rejects start() when no microphone is available", async () => {
    FakeRecognition.behavior = "no-mic";
    const service = makeService();
    await expect(service.start({ language: "en-IN" })).rejects.toMatchObject({ code: "MICROPHONE_UNAVAILABLE" });
  });

  it("wraps a throwing start() as a recognition failure", async () => {
    FakeRecognition.behavior = "throws";
    const service = makeService();
    await expect(service.start({ language: "en-IN" })).rejects.toMatchObject({ code: "RECOGNITION_FAILED" });
  });

  it("emits an error event when recognition fails mid-recording (disconnect, network)", async () => {
    const service = makeService();
    const events: SpeechEvent[] = [];
    service.subscribe((event) => events.push(event));
    await service.start({ language: "en-IN" });
    last().onerror?.({ error: "audio-capture" });
    expect(events).toContainEqual(expect.objectContaining({ type: "error", error: expect.objectContaining({ code: "MICROPHONE_UNAVAILABLE" }) }));
    // A trailing "end" after an error must not also announce a normal end.
    last().onend?.();
    expect(events.filter((event) => event.type === "ended")).toHaveLength(0);
  });

  it("reports an unsupported recognition language", async () => {
    const service = makeService();
    const events: SpeechEvent[] = [];
    service.subscribe((event) => events.push(event));
    await service.start({ language: "kn-IN" });
    last().onerror?.({ error: "language-not-supported" });
    expect(events).toContainEqual(expect.objectContaining({ type: "error", error: expect.objectContaining({ code: "LANGUAGE_UNSUPPORTED" }) }));
  });

  it("times out when the recognizer never finishes and nothing was heard", async () => {
    FakeRecognition.endOnStop = false;
    const service = makeService();
    await service.start({ language: "en-IN" });
    await service.stop();
    await expect(service.getTranscript()).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(last().aborted).toBe(true);
  });

  it("returns what was heard when the recognizer hangs after producing text", async () => {
    FakeRecognition.endOnStop = false;
    const service = makeService();
    await service.start({ language: "en-IN" });
    last().hear("chest feels tight", true);
    await service.stop();
    expect((await service.getTranscript()).text).toBe("chest feels tight");
  });

  it("cancel() aborts the recognizer and produces no transcript", async () => {
    const service = makeService();
    await service.start({ language: "en-IN" });
    last().hear("discard me", true);
    await service.cancel();
    expect(last().aborted).toBe(true);
    await expect(service.getTranscript()).rejects.toMatchObject({ code: "RECORDING_INTERRUPTED" });
  });

  it("starts a fresh session after cancel and does not leak the previous text", async () => {
    const service = makeService();
    await service.start({ language: "en-IN" });
    last().hear("old words", true);
    await service.cancel();
    await service.start({ language: "en-IN" });
    last().hear("new words", true);
    await service.stop();
    expect((await service.getTranscript()).text).toBe("new words");
  });

  it("detaches handlers and listeners on dispose", async () => {
    const service = makeService();
    const listener = vi.fn();
    service.subscribe(listener);
    await service.start({ language: "en-IN" });
    const recognizer = last();
    service.dispose();
    expect(recognizer.aborted).toBe(true);
    expect(recognizer.onresult).toBeNull();
    expect(recognizer.onend).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores a listener that throws so recording continues", async () => {
    const service = makeService();
    service.subscribe(() => {
      throw new Error("boom");
    });
    await service.start({ language: "en-IN" });
    expect(() => last().hear("still works", false)).not.toThrow();
  });
});

describe("BrowserSpeechRecognitionService start that never completes", () => {
  it("gives up with TIMEOUT when the recognizer never starts, instead of waiting forever", async () => {
    FakeRecognition.behavior = "silent";
    const service = makeService({ startTimeoutMs: 30 });
    await expect(service.start({ language: "en-IN" })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("aborts the recognizer after a start timeout so a late permission answer cannot open the microphone", async () => {
    FakeRecognition.behavior = "silent";
    const service = makeService({ startTimeoutMs: 20 });
    await expect(service.start({ language: "en-IN" })).rejects.toMatchObject({ code: "TIMEOUT" });
    const recognizer = last();
    expect(recognizer.aborted).toBe(true);
    // Handlers are detached, so even a late "start" event does nothing.
    expect(recognizer.onstart).toBeNull();
  });

  it("cancel() while starting rejects the pending start() and aborts the recognizer", async () => {
    FakeRecognition.behavior = "silent";
    const service = makeService({ startTimeoutMs: 5000 });
    const starting = service.start({ language: "en-IN" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.cancel();
    await expect(starting).rejects.toMatchObject({ code: "RECORDING_INTERRUPTED" });
    expect(last().aborted).toBe(true);
  });

  it("can start again after a start timeout", async () => {
    FakeRecognition.behavior = "silent";
    const service = makeService({ startTimeoutMs: 20 });
    await expect(service.start({ language: "en-IN" })).rejects.toMatchObject({ code: "TIMEOUT" });
    FakeRecognition.behavior = "ok";
    await service.start({ language: "en-IN" });
    last().hear("works now", true);
    await service.stop();
    expect((await service.getTranscript()).text).toBe("works now");
  });

  it("does not fire the start timeout once listening has begun", async () => {
    const service = makeService({ startTimeoutMs: 20 });
    await service.start({ language: "en-IN" });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(last().aborted).toBe(false);
  });
});

describe("mapWebSpeechError", () => {
  it.each([
    ["not-allowed", "PERMISSION_DENIED"],
    ["service-not-allowed", "PERMISSION_DENIED"],
    ["audio-capture", "MICROPHONE_UNAVAILABLE"],
    ["no-speech", "EMPTY_RECORDING"],
    ["network", "NETWORK_OFFLINE"],
    ["language-not-supported", "LANGUAGE_UNSUPPORTED"],
    ["aborted", "RECORDING_INTERRUPTED"],
    ["bad-grammar", "RECOGNITION_FAILED"],
    ["something-new", "RECOGNITION_FAILED"],
  ])("maps %s to %s", (input, expected) => {
    expect(mapWebSpeechError(input)).toBe(expected);
  });
});
