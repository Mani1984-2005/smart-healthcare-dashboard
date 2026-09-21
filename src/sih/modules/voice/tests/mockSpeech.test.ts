import { describe, expect, it } from "vitest";
import { fastSpeech } from "./helpers";
import type { SpeechEvent } from "../types/voice";

describe("MockSpeechRecognitionService (demo provider)", () => {
  it("produces a clearly marked demo transcript in the selected language", async () => {
    const service = fastSpeech();
    await service.start({ language: "kn-IN" });
    await service.stop();
    const transcript = await service.getTranscript();
    expect(transcript).toMatchObject({ language: "kn-IN", provider: "mock-speech", isDemo: true });
    expect(transcript.text).toMatch(/[\u0C80-\u0CFF]/);
  });

  it("includes a code-switched Kannada + English sample", async () => {
    const service = fastSpeech();
    const heard: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      await service.start({ language: "kn-IN" });
      await service.stop();
      heard.push((await service.getTranscript()).text);
    }
    expect(heard).toContain("Doctor, ನನಗೆ fever ಇದೆ.");
  });

  it("supports English and Hindi samples", async () => {
    const service = fastSpeech();
    await service.start({ language: "hi-IN" });
    expect((await service.getTranscript()).text).toMatch(/[\u0900-\u097F]/);
    await service.start({ language: "en-IN" });
    expect((await service.getTranscript()).text).toMatch(/fever/);
  });

  it("finishes on its own when getTranscript() is called without stop()", async () => {
    const service = fastSpeech();
    await service.start({ language: "en-IN" });
    await expect(service.getTranscript()).resolves.toMatchObject({ isDemo: true });
  });

  it("refuses languages it has no samples for instead of inventing text", async () => {
    const service = fastSpeech();
    expect(service.getSupport("ta-IN")).toEqual({ supported: false, reason: "LANGUAGE_UNSUPPORTED" });
    await expect(service.start({ language: "ta-IN" })).rejects.toMatchObject({ code: "LANGUAGE_UNSUPPORTED" });
  });

  it("can simulate every failure mode", async () => {
    await expect(fastSpeech({ failStartWith: "PERMISSION_DENIED" }).start({ language: "en-IN" })).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });

    const emptying = fastSpeech({ returnEmpty: true });
    await emptying.start({ language: "en-IN" });
    await expect(emptying.getTranscript()).rejects.toMatchObject({ code: "EMPTY_RECORDING" });

    const failing = fastSpeech({ failTranscriptWith: "RECOGNITION_FAILED" });
    await failing.start({ language: "en-IN" });
    await expect(failing.getTranscript()).rejects.toMatchObject({ code: "RECOGNITION_FAILED" });

    expect(fastSpeech({ unsupportedReason: "BROWSER_UNSUPPORTED" }).getSupport("en-IN")).toEqual({
      supported: false,
      reason: "BROWSER_UNSUPPORTED",
    });
  });

  it("cancel() during start rejects start() and yields no transcript", async () => {
    const service = fastSpeech({ startDelayMs: 50 });
    const starting = service.start({ language: "en-IN" });
    await service.cancel();
    await expect(starting).rejects.toMatchObject({ code: "RECORDING_INTERRUPTED" });
    await expect(service.getTranscript()).rejects.toMatchObject({ code: "RECORDING_INTERRUPTED" });
  });

  it("emits level and interim events while 'listening'", async () => {
    const service = fastSpeech({ tickMs: 5 });
    const events: SpeechEvent[] = [];
    service.subscribe((event) => events.push(event));
    await service.start({ language: "en-IN" });
    await new Promise((resolve) => setTimeout(resolve, 80));
    await service.stop();
    const types = new Set(events.map((event) => event.type));
    expect(types.has("level")).toBe(true);
    expect(types.has("speech-activity")).toBe(true);
    const levels = events.filter((event): event is Extract<SpeechEvent, { type: "level" }> => event.type === "level");
    expect(levels.every((event) => event.level >= 0 && event.level <= 1)).toBe(true);
  });

  it("stops emitting events after dispose", async () => {
    const service = fastSpeech({ tickMs: 5 });
    const events: SpeechEvent[] = [];
    service.subscribe((event) => events.push(event));
    await service.start({ language: "en-IN" });
    service.dispose();
    const before = events.length;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(events.length).toBe(before);
  });
});
