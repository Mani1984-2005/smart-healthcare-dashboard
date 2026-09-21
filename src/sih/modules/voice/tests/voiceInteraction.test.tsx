import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import VoiceInteractionModule from "../components/VoiceInteractionModule";
import { readVoiceConfig } from "../config/voiceConfig";
import { VoiceError } from "../errors/VoiceError";
import { en } from "../locales/en";
import { hi } from "../locales/hi";
import { kn } from "../locales/kn";
import { MockVoiceInteractionRepository } from "../repositories/MockVoiceInteractionRepository";
import { MockTextToSpeechService } from "../services/tts/MockTextToSpeechService";
import { MockTranslationService } from "../services/translation/MockTranslationService";
import type { VoiceInteraction, VoiceInteractionResult } from "../types/voice";
import { EN_SAMPLE, FakeSpeechService, KN_SAMPLE, KN_SAMPLE_EN, fastSpeech, makeServices, renderModule } from "./helpers";

afterEach(() => vi.restoreAllMocks());

const last = <T,>(items: T[]): T | undefined => items[items.length - 1];

const mic = () => screen.getByRole("button", { name: en["voice.startLabel"] });
const transcriptBox = (label: string = en["transcript.editLabel"]) => screen.getByRole("textbox", { name: label });

async function record(user: ReturnType<typeof userEvent.setup>, labels: { start: string; stop: string } = { start: en["voice.startLabel"], stop: en["voice.stopLabel"] }) {
  await user.click(screen.getByRole("button", { name: labels.start }));
  await user.click(await screen.findByRole("button", { name: labels.stop }));
}

describe("language selection", () => {
  it("offers English, Hindi and Kannada and starts with English", () => {
    renderModule();
    expect(screen.getByRole("group", { name: en["language.legend"] })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual(["en-IN", "hi-IN", "kn-IN"]);
    expect(screen.getByRole("radio", { name: /English/ })).toBeChecked();
    expect(screen.getByText(en["prompt.problem"])).toBeInTheDocument();
  });

  it("switches the whole interface to the chosen language", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(screen.getByRole("radio", { name: /हिन्दी/ }));
    expect(screen.getByText(hi["prompt.problem"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: hi["voice.startLabel"] })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    expect(screen.getByText(kn["prompt.problem"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: kn["voice.startLabel"] })).toBeInTheDocument();
  });

  it("keeps the selected language when the screen is closed and reopened in the same session", async () => {
    const user = userEvent.setup();
    const first = renderModule();
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    first.unmount();
    render(<VoiceInteractionModule services={makeServices()} />);
    expect(screen.getByRole("radio", { name: /ಕನ್ನಡ/ })).toBeChecked();
    expect(screen.getByText(kn["prompt.problem"])).toBeInTheDocument();
  });

  it("passes the selected language to speech recognition", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.script = [KN_SAMPLE];
    renderModule(makeServices({ speech }));
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await record(user, { start: kn["voice.startLabel"], stop: kn["voice.stopLabel"] });
    expect(speech.startCalls[0].language).toBe("kn-IN");
  });

  it("cannot be changed while a recording is in progress", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(mic());
    await screen.findByRole("button", { name: en["voice.stopLabel"] });
    expect(screen.getByRole("radio", { name: /Hindi|हिन्दी/ })).toBeDisabled();
  });
});

describe("voice capture", () => {
  it("does not start the microphone until the person taps", () => {
    const services = makeServices();
    const start = vi.spyOn(services.speech, "start");
    renderModule(services);
    expect(start).not.toHaveBeenCalled();
    expect(screen.getByText(en["voice.idle"])).toBeInTheDocument();
  });

  it("shows starting, listening (with timer) and processing states, then the transcript", async () => {
    const user = userEvent.setup();
    renderModule(makeServices({ speech: fastSpeech({ startDelayMs: 40, processingMs: 120 }) }));
    await user.click(mic());
    expect(screen.getByText(en["voice.starting"])).toBeInTheDocument();
    expect(await screen.findByText(en["voice.listening"])).toBeInTheDocument();
    expect(screen.getByText(en["voice.timerLabel"])).toBeInTheDocument();
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getByText(en["voice.speakNow"])).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: en["voice.stopLabel"] }));
    expect(screen.getByText(en["voice.processing"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en["voice.processingLabel"] })).toBeDisabled();

    expect(await screen.findByText(en["voice.success"])).toBeInTheDocument();
    expect(transcriptBox()).toHaveValue(EN_SAMPLE);
  });

  it("moves keyboard focus to the transcript heading when it appears", async () => {
    const user = userEvent.setup();
    renderModule();
    await record(user);
    const heading = await screen.findByRole("heading", { name: en["transcript.heading"] });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("can cancel a recording and returns to the start with no transcript", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(mic());
    await user.click(await screen.findByRole("button", { name: en["voice.cancel"] }));
    expect(await screen.findByRole("button", { name: en["voice.startLabel"] })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("lets the person cancel while the microphone is still getting ready", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.startDelayMs = 300;
    renderModule(makeServices({ speech }));
    await user.click(mic());
    expect(screen.getByText(en["voice.starting"])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en["voice.cancel"] }));
    expect(await screen.findByRole("button", { name: en["voice.startLabel"] })).toBeEnabled();
    expect(screen.queryByText(en["voice.starting"])).not.toBeInTheDocument();
  });

  it("still allows typing instead while the microphone is getting ready", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.startDelayMs = 300;
    renderModule(makeServices({ speech }));
    await user.click(mic());
    const typeInstead = screen.getByRole("button", { name: en["action.typeInstead"] });
    expect(typeInstead).toBeEnabled();
    await user.click(typeInstead);
    expect(screen.getByRole("heading", { name: en["transcript.typedHeading"] })).toBeInTheDocument();
  });

  it("explains a start that times out and offers a retry", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.startError = new VoiceError("TIMEOUT");
    renderModule(makeServices({ speech }));
    await user.click(mic());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en["error.timeout"]);
    expect(within(alert).getByRole("button", { name: en["action.tryAgain"] })).toBeInTheDocument();
  });

  it("shows a code-switched sentence exactly as heard", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.script = ["Doctor, ನನಗೆ fever ಇದೆ."];
    renderModule(makeServices({ speech }));
    await record(user);
    expect(await screen.findByDisplayValue("Doctor, ನನಗೆ fever ಇದೆ.")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("lang", "en-IN");
  });

  it("records again after a transcript and replaces it", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await record(user, { start: kn["voice.startLabel"], stop: kn["voice.stopLabel"] });
    expect(await screen.findByDisplayValue(KN_SAMPLE)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: kn["action.recordAgain"] }));
    await user.click(await screen.findByRole("button", { name: kn["voice.stopLabel"] }));
    expect(await screen.findByDisplayValue("Doctor, ನನಗೆ fever ಇದೆ.")).toBeInTheDocument();
  });

  it("clears the transcript and goes back to the microphone", async () => {
    const user = userEvent.setup();
    renderModule();
    await record(user);
    await user.click(await screen.findByRole("button", { name: en["action.clear"] }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(mic()).toBeInTheDocument();
  });

  it("releases the microphone session when the screen is closed mid-recording", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    const view = renderModule(makeServices({ speech }));
    await user.click(mic());
    await screen.findByRole("button", { name: en["voice.stopLabel"] });
    const cancelsBefore = speech.cancelCalls;
    view.unmount();
    expect(speech.cancelCalls).toBeGreaterThan(cancelsBefore);
    expect(speech.listenerCount).toBe(0);
  });
});

describe("transcript editing, translation and original wording", () => {
  it("lets the person edit the transcript", async () => {
    const user = userEvent.setup();
    renderModule();
    await record(user);
    const box = await screen.findByRole("textbox", { name: en["transcript.editLabel"] });
    await user.clear(box);
    await user.type(box, "My head hurts");
    expect(box).toHaveValue("My head hurts");
  });

  it("shows the translation next to, never instead of, the original words", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await record(user, { start: kn["voice.startLabel"], stop: kn["voice.stopLabel"] });
    await screen.findByDisplayValue(KN_SAMPLE);

    await user.click(screen.getByRole("button", { name: kn["action.translate"] }));
    const result = await screen.findByTestId("translation-result");
    expect(within(result).getByTestId("translation-original")).toHaveTextContent(KN_SAMPLE);
    expect(within(result).getByTestId("translation-original")).toHaveAttribute("lang", "kn-IN");
    expect(within(result).getByTestId("translation-translated")).toHaveTextContent(KN_SAMPLE_EN);
    expect(within(result).getByTestId("translation-translated")).toHaveAttribute("lang", "en-IN");
    expect(screen.getByRole("textbox")).toHaveValue(KN_SAMPLE);
    expect(screen.getByText(kn["translation.demoNotice"])).toBeInTheDocument();
  });

  it("removes a translation that no longer matches after the text is edited, and says so", async () => {
    const user = userEvent.setup();
    renderModule();
    await record(user);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.translate"] }));
    await screen.findByTestId("translation-result");

    await user.type(screen.getByRole("textbox"), " since Monday");
    expect(screen.queryByTestId("translation-result")).not.toBeInTheDocument();
    expect(screen.getByText(en["translation.stale"])).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue(`${EN_SAMPLE} since Monday`);
  });

  it("offers a choice of target language that never includes the source language", async () => {
    const user = userEvent.setup();
    renderModule();
    await record(user);
    await screen.findByRole("textbox");
    const select = screen.getByRole("combobox", { name: en["translation.targetLabel"] });
    const values = within(select).getAllByRole("option").map((option) => (option as HTMLOptionElement).value);
    expect(values).toEqual(["hi-IN", "kn-IN"]);
    await user.selectOptions(select, "kn-IN");
    await user.click(screen.getByRole("button", { name: en["action.translate"] }));
    const result = await screen.findByTestId("translation-result");
    expect(within(result).getByTestId("translation-translated")).toHaveTextContent(KN_SAMPLE.slice(0, 12));
  });

  it("keeps the original and offers recovery when translation fails", async () => {
    const user = userEvent.setup();
    renderModule(makeServices({ translation: new MockTranslationService({ latencyMs: 0, failWith: "TRANSLATION_UNAVAILABLE" }) }));
    await record(user);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.translate"] }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en["error.translationUnavailable"]);
    expect(within(alert).getByRole("button", { name: en["action.tryAgain"] })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue(EN_SAMPLE);
    await user.click(within(alert).getByRole("button", { name: en["action.dismiss"] }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains that demo translation only covers sample sentences", async () => {
    const user = userEvent.setup();
    renderModule();
    await record(user);
    const box = await screen.findByRole("textbox");
    await user.clear(box);
    await user.type(box, "My knee hurts on stairs");
    await user.click(screen.getByRole("button", { name: en["action.translate"] }));
    expect(await screen.findByRole("alert")).toHaveTextContent(en["error.translationDemoOnly"]);
    expect(box).toHaveValue("My knee hurts on stairs");
  });

  it("shows a translating state while waiting", async () => {
    const user = userEvent.setup();
    renderModule(makeServices({ translation: new MockTranslationService({ latencyMs: 120 }) }));
    await record(user);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.translate"] }));
    const busy = screen.getByRole("button", { name: en["translation.working"] });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    await screen.findByTestId("translation-result");
  });
});

describe("submit with confirmation", () => {
  it("requires a confirmation step and hands the versioned result to the host", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(result: VoiceInteractionResult) => void>();
    const services = makeServices();
    renderModule(services, { onSubmit });
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await record(user, { start: kn["voice.startLabel"], stop: kn["voice.stopLabel"] });
    await screen.findByDisplayValue(KN_SAMPLE);
    await user.click(screen.getByRole("button", { name: kn["action.translate"] }));
    await screen.findByTestId("translation-result");

    await user.click(screen.getByRole("button", { name: kn["action.submit"] }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(kn["review.heading"])).toBeInTheDocument();
    expect(screen.getByTestId("confirm-text")).toHaveTextContent(KN_SAMPLE);

    await user.click(screen.getByRole("button", { name: kn["action.goBack"] }));
    expect(screen.getByRole("textbox")).toHaveValue(KN_SAMPLE);
    await user.click(screen.getByRole("button", { name: kn["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: kn["action.confirmSend"] }));

    expect(await screen.findByText(kn["prompt.recorded"])).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      contractVersion: "1.0",
      originalText: KN_SAMPLE,
      originalLanguage: "kn-IN",
      translatedText: KN_SAMPLE_EN,
      translatedLanguage: "en-IN",
      inputMethod: "voice",
      wasEdited: false,
      isDemoData: true,
    });

    const stored = await services.repository.listBySession(onSubmit.mock.calls[0][0].sessionId);
    expect(stored).toHaveLength(1);
    expect(stored[0].transcript).toBe(KN_SAMPLE);
    expect(JSON.parse(screen.getByTestId("contract-preview").textContent ?? "{}").originalText).toBe(KN_SAMPLE);
  });

  it("records the raw recognized text separately when the person edited it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(result: VoiceInteractionResult) => void>();
    renderModule(makeServices(), { onSubmit });
    await record(user);
    const box = await screen.findByRole("textbox");
    await user.clear(box);
    await user.type(box, "Fever for three days");
    await user.click(screen.getByRole("button", { name: en["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: en["action.confirmSend"] }));
    await screen.findByText(en["prompt.recorded"]);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      originalText: "Fever for three days",
      recognizedText: EN_SAMPLE,
      wasEdited: true,
    });
  });

  it("does not allow submitting an empty response", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(screen.getByRole("button", { name: en["action.typeInstead"] }));
    expect(screen.getByRole("button", { name: en["action.submit"] })).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "   ");
    expect(screen.getByRole("button", { name: en["action.submit"] })).toBeDisabled();
  });

  it("keeps the confirmation open and offers a retry when saving fails", async () => {
    const user = userEvent.setup();
    const repository = new MockVoiceInteractionRepository();
    repository.failSaves = true;
    const onSubmit = vi.fn();
    renderModule(makeServices({ repository }), { onSubmit });
    await record(user);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: en["action.confirmSend"] }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en["error.saveFailed"]);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-text")).toHaveTextContent(EN_SAMPLE);

    repository.failSaves = false;
    await user.click(within(alert).getByRole("button", { name: en["action.tryAgain"] }));
    expect(await screen.findByText(en["prompt.recorded"])).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows a sending state while saving", async () => {
    const user = userEvent.setup();
    class SlowRepository extends MockVoiceInteractionRepository {
      override async save(interaction: VoiceInteraction) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return super.save(interaction);
      }
    }
    renderModule(makeServices({ repository: new SlowRepository() }));
    await record(user);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: en["action.confirmSend"] }));
    const sending = screen.getByRole("button", { name: en["submit.saving"] });
    expect(sending).toBeDisabled();
    expect(sending).toHaveAttribute("aria-busy", "true");
    await screen.findByText(en["prompt.recorded"]);
  });

  it("starts a fresh response after submitting", async () => {
    const user = userEvent.setup();
    renderModule();
    await record(user);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: en["action.confirmSend"] }));
    await user.click(await screen.findByRole("button", { name: en["action.newResponse"] }));
    expect(mic()).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("failures always leave a way forward", () => {
  it.each([
    ["PERMISSION_DENIED", en["error.permissionDenied"]],
    ["MICROPHONE_UNAVAILABLE", en["error.micUnavailable"]],
    ["NETWORK_OFFLINE", en["error.offline"]],
    ["RECOGNITION_FAILED", en["error.recognitionFailed"]],
    ["SERVER_FAILURE", en["error.server"]],
  ] as const)("%s at start shows a friendly message, not the raw error", async (code, message) => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.startError = new VoiceError(code, "TECHNICAL: NotAllowedError at line 42");
    renderModule(makeServices({ speech }));
    await user.click(mic());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert).not.toHaveTextContent(/TECHNICAL|NotAllowedError|line 42/);
    expect(alert).not.toHaveTextContent(code);
    expect(within(alert).getByRole("button", { name: en["action.tryAgain"] })).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: en["action.typeInstead"] })).toBeInTheDocument();
  });

  it("recovers from a denied microphone with Try again once access is allowed", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.startError = new VoiceError("PERMISSION_DENIED");
    renderModule(makeServices({ speech }));
    await user.click(mic());
    const alert = await screen.findByRole("alert");

    speech.startError = null;
    speech.script = ["Allowed now"];
    await user.click(within(alert).getByRole("button", { name: en["action.tryAgain"] }));
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }));
    expect(await screen.findByDisplayValue("Allowed now")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("handles an empty recording with the friendly 'couldn't hear you' message and a retry", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.script = [new VoiceError("EMPTY_RECORDING"), "Second attempt"];
    renderModule(makeServices({ speech }));
    await record(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en["error.empty"]);
    await user.click(within(alert).getByRole("button", { name: en["action.tryAgain"] }));
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }));
    expect(await screen.findByDisplayValue("Second attempt")).toBeInTheDocument();
  });

  it("handles a microphone that disconnects mid-recording", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    renderModule(makeServices({ speech }));
    await user.click(mic());
    await screen.findByRole("button", { name: en["voice.stopLabel"] });
    act(() => speech.emit({ type: "error", error: new VoiceError("MICROPHONE_UNAVAILABLE") }));
    expect(await screen.findByRole("alert")).toHaveTextContent(en["error.micUnavailable"]);
    expect(await screen.findByRole("button", { name: en["voice.startLabel"] })).toBeInTheDocument();
  });

  it("shows an unsupported-browser fallback instead of a dead microphone", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.support = { supported: false, reason: "BROWSER_UNSUPPORTED" };
    renderModule(makeServices({ speech }));

    expect(screen.getByRole("alert")).toHaveTextContent(en["error.unsupported"]);
    expect(screen.queryByRole("button", { name: en["voice.startLabel"] })).not.toBeInTheDocument();
    expect(speech.startCalls).toHaveLength(0);

    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: en["action.typeInstead"] }));
    await user.type(screen.getByRole("textbox"), "I have a cough");
    expect(screen.getByRole("button", { name: en["action.submit"] })).toBeEnabled();
  });

  it("lets the person type instead and submit typed text", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(result: VoiceInteractionResult) => void>();
    renderModule(makeServices(), { onSubmit });
    await user.click(screen.getByRole("button", { name: en["action.typeInstead"] }));
    expect(screen.getByRole("heading", { name: en["transcript.typedHeading"] })).toBeInTheDocument();
    const box = screen.getByRole("textbox");
    expect(box).toHaveValue("");
    expect(box).toHaveFocus();
    await user.type(box, "Cough since Sunday");
    await user.click(screen.getByRole("button", { name: en["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: en["action.confirmSend"] }));
    await screen.findByText(en["prompt.recorded"]);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ inputMethod: "typed", originalText: "Cough since Sunday", wasEdited: false });
    expect(onSubmit.mock.calls[0][0].recognizedText).toBeUndefined();
  });

  it("recovers from an unexpected rendering failure with a plain message", () => {
    const services = makeServices();
    vi.spyOn(services.speech, "getSupport").mockImplementation(() => {
      throw new Error("boom");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderModule(services);
    expect(screen.getByRole("alert")).toHaveTextContent(en["error.boundary"]);
    expect(screen.getByRole("button", { name: en["action.reload"] })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("boom");
  });
});

describe("read aloud", () => {
  it("reads an instruction in the selected language and lets the person stop it", async () => {
    const user = userEvent.setup();
    const services = makeServices();
    renderModule(services);
    await user.click(screen.getByRole("radio", { name: /हिन्दी/ }));

    await user.click(screen.getByRole("button", { name: hi["listen.forPrompt"] }));
    expect(services.mockTts.spoken).toEqual([{ text: hi["prompt.problem"], language: "hi-IN" }]);
    const stop = await screen.findByRole("button", { name: hi["listen.stop"] });
    await user.click(stop);
    expect(services.mockTts.getState()).toBe("idle");
    expect(await screen.findByRole("button", { name: hi["listen.forPrompt"] })).toBeInTheDocument();
  });

  it("can pause and resume playback", async () => {
    const user = userEvent.setup();
    const services = makeServices({ tts: new MockTextToSpeechService({ durationMs: 2000 }) });
    renderModule(services);
    await user.click(screen.getByRole("button", { name: en["listen.forPrompt"] }));
    await user.click(await screen.findByRole("button", { name: en["listen.pause"] }));
    expect(services.tts.getState()).toBe("paused");
    await user.click(await screen.findByRole("button", { name: en["listen.resume"] }));
    expect(services.tts.getState()).toBe("speaking");
    await user.click(screen.getByRole("button", { name: en["listen.stop"] }));
    expect(services.tts.getState()).toBe("idle");
  });

  it("reads the transcript in the language it was spoken in", async () => {
    const user = userEvent.setup();
    const services = makeServices();
    renderModule(services);
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await record(user, { start: kn["voice.startLabel"], stop: kn["voice.stopLabel"] });
    await screen.findByDisplayValue(KN_SAMPLE);
    await user.click(screen.getByRole("button", { name: kn["listen.readTranscript"] }));
    expect(last(services.mockTts.spoken)).toEqual({ text: KN_SAMPLE, language: "kn-IN" });
  });

  it("reads the translation in the target language", async () => {
    const user = userEvent.setup();
    const services = makeServices();
    renderModule(services);
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await record(user, { start: kn["voice.startLabel"], stop: kn["voice.stopLabel"] });
    await screen.findByDisplayValue(KN_SAMPLE);
    await user.click(screen.getByRole("button", { name: kn["action.translate"] }));
    await screen.findByTestId("translation-result");
    await user.click(screen.getByRole("button", { name: kn["listen.readTranslation"] }));
    expect(last(services.mockTts.spoken)).toEqual({ text: KN_SAMPLE_EN, language: "en-IN" });
  });

  it("reads the confirmation message after submitting", async () => {
    const user = userEvent.setup();
    const services = makeServices();
    renderModule(services);
    await record(user);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: en["action.confirmSend"] }));
    await screen.findByText(en["prompt.recorded"]);
    await user.click(screen.getByRole("button", { name: en["listen.forPrompt"] }));
    expect(last(services.mockTts.spoken)?.text).toBe(en["prompt.recorded"]);
  });

  it("explains unsupported speech output and keeps the text readable", async () => {
    const user = userEvent.setup();
    const tts = new MockTextToSpeechService({ unsupportedReason: "TTS_UNSUPPORTED" });
    renderModule(makeServices({ tts }));
    await user.click(screen.getByRole("button", { name: en["listen.forPrompt"] }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en["error.ttsUnsupported"]);
    expect(screen.getByText(en["prompt.problem"])).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: en["action.dismiss"] }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains a missing voice for the language", async () => {
    const user = userEvent.setup();
    const tts = new MockTextToSpeechService({ failWith: "TTS_LANGUAGE_UNSUPPORTED" });
    renderModule(makeServices({ tts }));
    await user.click(screen.getByRole("button", { name: en["listen.forPrompt"] }));
    expect(await screen.findByRole("alert")).toHaveTextContent(en["error.ttsLanguageUnsupported"]);
  });

  it("shows a caption in place of sound when read-aloud is simulated in demo mode", async () => {
    const user = userEvent.setup();
    const tts = new MockTextToSpeechService({ durationMs: 500 });
    renderModule(makeServices({ tts }));
    await user.click(screen.getByRole("button", { name: en["listen.forPrompt"] }));
    expect(await screen.findByText(en["listen.demoCaption"].replace("{text}", en["prompt.problem"]))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en["listen.stop"] }));
  });
});

describe("privacy", () => {
  it("never writes transcripts to the console or to browser storage", async () => {
    const user = userEvent.setup();
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
    renderModule();
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await record(user, { start: kn["voice.startLabel"], stop: kn["voice.stopLabel"] });
    await screen.findByDisplayValue(KN_SAMPLE);
    await user.click(screen.getByRole("button", { name: kn["action.translate"] }));
    await screen.findByTestId("translation-result");
    await user.click(screen.getByRole("button", { name: kn["action.submit"] }));
    await user.click(await screen.findByRole("button", { name: kn["action.confirmSend"] }));
    await screen.findByText(kn["prompt.recorded"]);

    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain(KN_SAMPLE);
    expect(logged).not.toContain(KN_SAMPLE_EN);
    const stored = JSON.stringify({ ...window.sessionStorage }) + JSON.stringify({ ...window.localStorage });
    expect(stored).not.toContain(KN_SAMPLE);
    expect(stored).not.toContain(KN_SAMPLE_EN);
  });
});

describe("demo mode with the built-in providers (no services injected)", () => {
  const config = readVoiceConfig({});

  it("runs the full flow with no microphone, network or credentials, and says it is a demo", async () => {
    const user = userEvent.setup();
    render(<VoiceInteractionModule config={{ ...config, defaultMode: "demo" }} />);
    expect(screen.getByText(en["demo.banner"])).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: en["demo.toggle"] })).toBeChecked();
    expect(screen.getByText(en["privacy.demo"])).toBeInTheDocument();

    await user.click(mic());
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }, { timeout: 2000 }));
    expect(await screen.findByRole("textbox", { name: en["transcript.editLabel"] }, { timeout: 3000 })).toHaveValue(EN_SAMPLE);
  });

  it("falls back to demo mode, with an explanation, when the browser cannot listen", () => {
    render(<VoiceInteractionModule config={{ ...config, defaultMode: "auto" }} />);
    // jsdom has no speech recognition, which is exactly the unsupported-browser case.
    expect(screen.getByRole("switch", { name: en["demo.toggle"] })).toBeChecked();
    expect(screen.getByText(en["demo.autoNotice"])).toBeInTheDocument();
  });

  it("lets the person switch to live mode, sees a clear fallback, and can return to demo mode", async () => {
    const user = userEvent.setup();
    render(<VoiceInteractionModule config={{ ...config, defaultMode: "demo" }} />);
    await user.click(screen.getByRole("switch", { name: en["demo.toggle"] }));
    expect(screen.getByRole("switch", { name: en["demo.toggle"] })).not.toBeChecked();
    expect(screen.queryByText(en["demo.banner"])).not.toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(en["error.unsupported"]);
    expect(screen.getByText(en["privacy.live"])).toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: en["action.useDemo"] }));
    expect(screen.getByRole("switch", { name: en["demo.toggle"] })).toBeChecked();
    expect(mic()).toBeInTheDocument();
  });
});
