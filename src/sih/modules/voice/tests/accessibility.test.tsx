import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceError } from "../errors/VoiceError";
import { en } from "../locales/en";
import { hi } from "../locales/hi";
import { kn } from "../locales/kn";
import { FakeSpeechService, fastSpeech, makeServices, renderModule } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

/** Runs axe on the rendered DOM. Colour contrast needs real layout, so it is checked in a browser instead. */
async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(" | ")}`);
  expect(summary).toEqual([]);
}

const mic = () => screen.getByRole("button", { name: en["voice.startLabel"] });

describe("axe automated checks in every state", () => {
  it("initial screen", async () => {
    const { container } = renderModule();
    await expectNoAxeViolations(container);
  });

  it("initial screen in Hindi and Kannada", async () => {
    const user = userEvent.setup();
    const { container } = renderModule();
    await user.click(screen.getByRole("radio", { name: /हिन्दी/ }));
    await expectNoAxeViolations(container);
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    await expectNoAxeViolations(container);
  });

  it("listening", async () => {
    const user = userEvent.setup();
    const { container } = renderModule();
    await user.click(mic());
    await screen.findByRole("button", { name: en["voice.stopLabel"] });
    await expectNoAxeViolations(container);
  });

  it("transcript review with translation", async () => {
    const user = userEvent.setup();
    const { container } = renderModule();
    await user.click(mic());
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }));
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.translate"] }));
    await screen.findByTestId("translation-result");
    await expectNoAxeViolations(container);
  });

  it("confirmation and submitted screens", async () => {
    const user = userEvent.setup();
    const { container } = renderModule();
    await user.click(mic());
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }));
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: en["action.submit"] }));
    await screen.findByTestId("confirm-text");
    await expectNoAxeViolations(container);
    await user.click(screen.getByRole("button", { name: en["action.confirmSend"] }));
    await screen.findByTestId("contract-preview");
    await expectNoAxeViolations(container);
  });

  it("error and unsupported states", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.startError = new VoiceError("PERMISSION_DENIED");
    const { container, unmount } = renderModule(makeServices({ speech }));
    await user.click(mic());
    await screen.findByRole("alert");
    await expectNoAxeViolations(container);
    unmount();

    const unsupported = new FakeSpeechService();
    unsupported.support = { supported: false, reason: "BROWSER_UNSUPPORTED" };
    const second = renderModule(makeServices({ speech: unsupported }));
    await expectNoAxeViolations(second.container);
  });

  it("demo mode banner and switch", async () => {
    const { container } = render(
      <div>
        <div id="host" />
      </div>,
    );
    const { default: Module } = await import("../components/VoiceInteractionModule");
    const { readVoiceConfig } = await import("../config/voiceConfig");
    const view = render(<Module config={{ ...readVoiceConfig({}), defaultMode: "demo" }} />, { container: container.querySelector("#host") as HTMLElement });
    expect(screen.getByRole("note")).toBeInTheDocument();
    await expectNoAxeViolations(view.container);
  });
});

describe("accessible names and roles", () => {
  it("names the microphone by its action, in every language", async () => {
    const user = userEvent.setup();
    renderModule();
    expect(screen.getByRole("button", { name: "Start voice recording" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /हिन्दी/ }));
    expect(screen.getByRole("button", { name: hi["voice.startLabel"] })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    expect(screen.getByRole("button", { name: kn["voice.startLabel"] })).toBeInTheDocument();
  });

  it("never exposes a bare 'Mic' name", () => {
    renderModule();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
      expect((button.getAttribute("aria-label") ?? button.textContent ?? "").trim().toLowerCase()).not.toBe("mic");
    }
  });

  it("changes the microphone's name as its job changes (start, stop, wait)", async () => {
    const user = userEvent.setup();
    renderModule(makeServices({ speech: fastSpeech({ processingMs: 100 }) }));
    await user.click(mic());
    const stop = await screen.findByRole("button", { name: en["voice.stopLabel"] });
    await user.click(stop);
    expect(screen.getByRole("button", { name: en["voice.processingLabel"] })).toBeDisabled();
    await screen.findByRole("textbox");
  });

  it("announces state changes through a polite live region", async () => {
    const user = userEvent.setup();
    renderModule();
    const status = screen.getAllByRole("status").find((element) => element.textContent === en["voice.idle"]);
    expect(status).toHaveAttribute("aria-live", "polite");
    await user.click(mic());
    expect(await screen.findByText(en["voice.listening"])).toBeInTheDocument();
    expect(screen.getByText(en["voice.listening"]).closest("[role=status]")).toBeInTheDocument();
  });

  it("announces errors with role=alert and states them in text", async () => {
    const user = userEvent.setup();
    const speech = new FakeSpeechService();
    speech.startError = new VoiceError("MICROPHONE_UNAVAILABLE");
    renderModule(makeServices({ speech }));
    await user.click(mic());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["error.micUnavailable"]);
  });

  it("labels the transcript field and links it to its hint", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(mic());
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }));
    const box = await screen.findByRole("textbox", { name: en["transcript.editLabel"] });
    const hintId = box.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(hintId)).toHaveTextContent(en["transcript.editHint"]);
  });

  it("marks languages of text so screen readers pronounce them correctly", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(screen.getByRole("radio", { name: /ಕನ್ನಡ/ }));
    expect(screen.getByText("ಕನ್ನಡ", { selector: "span[lang]" })).toHaveAttribute("lang", "kn-IN");
  });

  it("does not use color alone for the selected language or the recording state", async () => {
    const user = userEvent.setup();
    renderModule();
    const selected = screen.getByRole("radio", { name: /English/ });
    expect(selected).toBeChecked(); // state in the accessibility tree
    expect(selected.parentElement?.querySelector("svg")).not.toBeNull(); // and a check mark, not only a border colour
    await user.click(mic());
    const listening = await screen.findByText(en["voice.listening"]);
    expect(listening.parentElement?.querySelector("svg")).not.toBeNull(); // icon
    expect(listening).toHaveTextContent(en["voice.listening"]); // and words
  });

  it("hides the decorative level bars from assistive technology", async () => {
    const user = userEvent.setup();
    renderModule(makeServices({ speech: fastSpeech({ tickMs: 20 }) }));
    await user.click(mic());
    const bars = await screen.findByTestId("audio-visualizer");
    expect(bars).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(en["voice.listening"])).toBeInTheDocument();
  });
});

describe("keyboard operation", () => {
  it("reaches every control with Tab and starts recording with Enter and Space", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.tab(); // language radios (one tab stop for the group)
    expect(screen.getByRole("radio", { name: /English/ })).toHaveFocus();
    await user.tab(); // demo switch is skipped when services are injected, so next is Listen
    expect(screen.getByRole("button", { name: en["listen.forPrompt"] })).toHaveFocus();
    await user.tab();
    expect(mic()).toHaveFocus();
    await user.keyboard("{Enter}");
    const stop = await screen.findByRole("button", { name: en["voice.stopLabel"] });
    expect(stop).toHaveFocus();
    await user.keyboard(" ");
    expect(await screen.findByRole("textbox")).toBeInTheDocument();
  });

  it("changes language with the arrow keys", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /हिन्दी/ })).toBeChecked();
    expect(screen.getByText(hi["prompt.problem"])).toBeInTheDocument();
  });

  it("completes the whole flow without a mouse", async () => {
    const user = userEvent.setup();
    renderModule();
    mic().focus();
    await user.keyboard("{Enter}");
    (await screen.findByRole("button", { name: en["voice.stopLabel"] })).focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("textbox");
    screen.getByRole("button", { name: en["action.submit"] }).focus();
    await user.keyboard("{Enter}");
    (await screen.findByRole("button", { name: en["action.confirmSend"] })).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText(en["prompt.recorded"])).toBeInTheDocument();
  });

  it("keeps the demo switch operable by keyboard and does not lose focus when the mode changes", async () => {
    const user = userEvent.setup();
    const { default: Module } = await import("../components/VoiceInteractionModule");
    const { readVoiceConfig } = await import("../config/voiceConfig");
    render(<Module config={{ ...readVoiceConfig({}), defaultMode: "demo" }} />);
    screen.getByRole("switch", { name: en["demo.toggle"] }).focus();
    await user.keyboard(" ");
    // The screen rebuilds for the new mode; the switch must be the focused control afterwards.
    const toggle = screen.getByRole("switch", { name: en["demo.toggle"] });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("switch", { name: en["demo.toggle"] })).toBeChecked();
  });
});

describe("visible focus, touch targets and responsive layout", () => {
  it("gives every button a visible focus ring", async () => {
    const user = userEvent.setup();
    renderModule();
    await user.click(mic());
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }));
    await screen.findByRole("textbox");
    for (const button of screen.getAllByRole("button")) {
      expect(button.className, button.textContent ?? "").toMatch(/focus-visible:ring-/);
    }
    expect(screen.getByRole("textbox").className).toMatch(/focus-visible:ring-/);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.nextElementSibling?.className).toMatch(/peer-focus-visible:ring-/);
    }
  });

  it("makes every button at least 48px tall, and the microphone much larger", async () => {
    renderModule();
    for (const button of screen.getAllByRole("button")) {
      expect(button.className, button.textContent ?? button.getAttribute("aria-label") ?? "").toMatch(/min-h-12|h-36/);
    }
    expect(mic().className).toMatch(/h-36/);
    expect(mic().className).toMatch(/sm:h-40/);
  });

  it("uses a mobile-first layout that widens on larger screens", async () => {
    const user = userEvent.setup();
    renderModule();
    expect(screen.getAllByRole("radio")[0].closest(".grid")?.className).toContain("grid-cols-3");
    expect(screen.getByText(en["prompt.problem"]).closest("section")?.className).toMatch(/p-4.*sm:p-6/);
    await user.click(mic());
    await user.click(await screen.findByRole("button", { name: en["voice.stopLabel"] }));
    await screen.findByRole("textbox");
    // Primary action is full width on phones and shrinks to content from the sm breakpoint.
    expect(screen.getByRole("button", { name: en["action.submit"] }).className).toMatch(/w-full.*sm:w-auto/);
    // Two-column translation comparison only from the sm breakpoint up.
    await user.click(screen.getByRole("button", { name: en["action.translate"] }));
    expect((await screen.findByTestId("translation-result")).className).toMatch(/sm:grid-cols-2/);
  });
});

describe("reduced motion", () => {
  function stubReducedMotion(reduce: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: reduce && query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      })),
    );
  }

  it("animates the level bars by default", async () => {
    stubReducedMotion(false);
    const user = userEvent.setup();
    renderModule();
    await user.click(mic());
    const bars = await screen.findByTestId("audio-visualizer");
    expect(bars.firstElementChild?.className).toContain("motion-safe:animate-pulse");
  });

  it("stops moving the level bars when the person prefers reduced motion, and still shows the state as text", async () => {
    stubReducedMotion(true);
    const user = userEvent.setup();
    renderModule();
    await user.click(mic());
    const bars = await screen.findByTestId("audio-visualizer");
    expect(bars.firstElementChild?.className).not.toContain("animate-pulse");
    expect(bars.firstElementChild?.className).not.toContain("transition");
    expect(screen.getByText(en["voice.listening"])).toBeInTheDocument();
    expect(within(document.body).getByText(en["voice.speakNow"])).toBeInTheDocument();
  });

  it("only uses motion-safe variants for spinners and pulses", async () => {
    stubReducedMotion(false);
    const user = userEvent.setup();
    const { container } = renderModule(makeServices({ speech: fastSpeech({ startDelayMs: 50, processingMs: 100 }) }));
    await user.click(mic());
    await act(async () => undefined);
    for (const element of container.querySelectorAll("[class*='animate-']")) {
      for (const token of element.getAttribute("class")?.split(/\s+/) ?? []) {
        if (token.includes("animate-")) expect(token.startsWith("motion-safe:"), token).toBe(true);
      }
    }
  });
});
