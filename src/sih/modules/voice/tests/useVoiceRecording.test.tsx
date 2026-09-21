import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoiceError } from "../errors/VoiceError";
import { useVoiceRecording } from "../hooks/useVoiceRecording";
import type { SpeechTranscript } from "../types/voice";
import { FakeSpeechService } from "./helpers";

function deferredTranscript(text: string) {
  let resolve: () => void = () => undefined;
  const promise = new Promise<SpeechTranscript>((done) => {
    resolve = () => done({ text, language: "en-IN", durationMs: 10, provider: "fake", isDemo: false });
  });
  return { promise, resolve };
}

function setup(options: { maxDurationMs?: number; language?: string } = {}) {
  const service = new FakeSpeechService();
  const onTranscript = vi.fn();
  const hook = renderHook(
    (props: { language: string }) =>
      useVoiceRecording({ service, language: props.language, maxDurationMs: options.maxDurationMs, onTranscript }),
    { initialProps: { language: options.language ?? "en-IN" } },
  );
  return { service, onTranscript, ...hook };
}

describe("useVoiceRecording", () => {
  it("does not touch the microphone until start() is called", () => {
    const { service, result } = setup();
    expect(result.current.status).toBe("idle");
    expect(service.startCalls).toHaveLength(0);
    expect(service.listenerCount).toBe(0);
  });

  it("start > listening > stop > processing > success, delivering the transcript once", async () => {
    const { service, result, onTranscript } = setup({ language: "kn-IN" });
    service.script = ["ನನಗೆ ಜ್ವರ ಇದೆ"];

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe("listening");
    expect(result.current.startedAt).not.toBeNull();
    expect(service.startCalls[0]).toMatchObject({ language: "kn-IN" });

    await act(async () => {
      await result.current.stop();
    });
    expect(result.current.status).toBe("success");
    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith(expect.objectContaining({ text: "ನನಗೆ ಜ್ವರ ಇದೆ", language: "kn-IN" }));
    expect(service.stopCalls).toBe(1);
  });

  it("shows a processing state while the transcript is pending", async () => {
    const { service, result } = setup();
    const pending = deferredTranscript("hello");
    service.getTranscript = () => pending.promise;
    await act(async () => {
      await result.current.start();
    });
    let stopping: Promise<void> = Promise.resolve();
    act(() => {
      stopping = result.current.stop();
    });
    expect(result.current.status).toBe("processing");
    await act(async () => {
      pending.resolve();
      await stopping;
    });
    expect(result.current.status).toBe("success");
  });

  it("cancel() discards the recording and reports nothing", async () => {
    const { service, result, onTranscript } = setup();
    service.script = ["should not appear"];
    await act(async () => {
      await result.current.start();
    });
    act(() => result.current.cancel());
    expect(result.current.status).toBe("idle");
    expect(service.cancelCalls).toBeGreaterThan(0);
    expect(onTranscript).not.toHaveBeenCalled();
    expect(service.listenerCount).toBe(0);
  });

  it("stop() while still starting behaves like cancel", async () => {
    const { service, result, onTranscript } = setup();
    service.startDelayMs = 30;
    let starting: Promise<void> = Promise.resolve();
    act(() => {
      starting = result.current.start();
    });
    expect(result.current.status).toBe("starting");
    await act(async () => {
      await result.current.stop();
      await starting;
    });
    expect(result.current.status).toBe("idle");
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("ignores a second start() while already recording", async () => {
    const { service, result } = setup();
    await act(async () => {
      await result.current.start();
      await result.current.start();
    });
    expect(service.startCalls).toHaveLength(1);
  });

  it.each([
    ["PERMISSION_DENIED"],
    ["MICROPHONE_UNAVAILABLE"],
    ["BROWSER_UNSUPPORTED"],
    ["NETWORK_OFFLINE"],
  ] as const)("surfaces a %s failure at start as an error state", async (code) => {
    const { service, result } = setup();
    service.startError = new VoiceError(code);
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe(code);
    expect(service.listenerCount).toBe(0);
  });

  it("recovers: a retry after a failure can succeed and clears the error", async () => {
    const { service, result, onTranscript } = setup();
    service.startError = new VoiceError("PERMISSION_DENIED");
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe("error");

    service.startError = null;
    service.script = ["second try works"];
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.error).toBeNull();
    await act(async () => {
      await result.current.stop();
    });
    expect(result.current.status).toBe("success");
    expect(onTranscript).toHaveBeenCalledWith(expect.objectContaining({ text: "second try works" }));
  });

  it("reports an empty recording as an error with a retry path", async () => {
    const { service, result, onTranscript } = setup();
    service.script = [new VoiceError("EMPTY_RECORDING")];
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.stop();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("EMPTY_RECORDING");
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("wraps unexpected provider exceptions in a typed error", async () => {
    const { service, result } = setup();
    service.getTranscript = () => Promise.reject(new TypeError("internal detail"));
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.stop();
    });
    expect(result.current.error).toBeInstanceOf(VoiceError);
    expect(result.current.error?.code).toBe("UNKNOWN");
  });

  it("finalizes when the provider ends on its own (silence timeout)", async () => {
    const { service, result, onTranscript } = setup();
    service.script = ["ended by itself"];
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      service.emit({ type: "ended" });
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(onTranscript).toHaveBeenCalledWith(expect.objectContaining({ text: "ended by itself" }));
  });

  it("moves to an error state when the provider fails mid-recording (mic disconnected)", async () => {
    const { service, result } = setup();
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      service.emit({ type: "error", error: new VoiceError("MICROPHONE_UNAVAILABLE") });
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("MICROPHONE_UNAVAILABLE");
    expect(service.cancelCalls).toBeGreaterThan(0);
  });

  it("stops automatically at the maximum duration", async () => {
    const { service, result, onTranscript } = setup({ maxDurationMs: 40 });
    service.script = ["long story"];
    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe("success"), { timeout: 1000 });
    expect(service.stopCalls).toBe(1);
    expect(onTranscript).toHaveBeenCalledTimes(1);
  });

  it("exposes interim text and speech activity, and clears interim text on success", async () => {
    const { service, result } = setup();
    service.script = ["final words"];
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      service.emit({ type: "interim", text: "fin" });
      service.emit({ type: "speech-activity", active: true });
    });
    expect(result.current.interimText).toBe("fin");
    expect(result.current.speechActive).toBe(true);
    await act(async () => {
      await result.current.stop();
    });
    expect(result.current.interimText).toBe("");
    expect(result.current.speechActive).toBe(false);
  });

  it("forwards level events to subscribers without re-rendering the hook", async () => {
    const { service, result } = setup();
    const renders = vi.fn();
    const levels: number[] = [];
    await act(async () => {
      await result.current.start();
    });
    const unsubscribe = result.current.levelSource.subscribe((level) => {
      levels.push(level);
      renders();
    });
    const before = result.current;
    act(() => {
      service.emit({ type: "level", level: 0.4 });
      service.emit({ type: "level", level: 0.6 });
    });
    expect(levels).toEqual([0.4, 0.6]);
    expect(result.current).toBe(before);
    unsubscribe();
    act(() => service.emit({ type: "level", level: 0.9 }));
    expect(levels).toHaveLength(2);
  });

  it("ignores events and results from a cancelled run", async () => {
    const { service, result, onTranscript } = setup();
    service.startDelayMs = 20;
    let starting: Promise<void> = Promise.resolve();
    act(() => {
      starting = result.current.start();
    });
    act(() => result.current.cancel());
    await act(async () => {
      await starting;
    });
    expect(result.current.status).toBe("idle");
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("releases the microphone session and subscriptions on unmount", async () => {
    const { service, result, unmount } = setup();
    await act(async () => {
      await result.current.start();
    });
    expect(service.listenerCount).toBe(1);
    const cancelsBefore = service.cancelCalls;
    unmount();
    expect(service.cancelCalls).toBeGreaterThan(cancelsBefore);
    expect(service.listenerCount).toBe(0);
  });

  it("does not deliver a transcript that finishes after unmount", async () => {
    const { service, result, unmount, onTranscript } = setup();
    const pending = deferredTranscript("late");
    service.getTranscript = () => pending.promise;
    await act(async () => {
      await result.current.start();
    });
    let stopping: Promise<void> = Promise.resolve();
    act(() => {
      stopping = result.current.stop();
    });
    await waitFor(() => expect(service.stopCalls).toBe(1));
    unmount();
    pending.resolve();
    await stopping;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("uses the language given at the time of start()", async () => {
    const { service, result, rerender } = setup({ language: "en-IN" });
    rerender({ language: "hi-IN" });
    await act(async () => {
      await result.current.start();
    });
    expect(service.startCalls[0].language).toBe("hi-IN");
  });
});
