import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import VoiceInteractionPage from "../pages/VoiceInteractionPage";
import { en } from "../locales/en";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";

describe("standalone demonstration page", () => {
  it("renders the module with its own header, skip link and reviewer notes", () => {
    render(<VoiceInteractionPage />);
    expect(screen.getByRole("heading", { level: 1, name: en["module.title"] })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /skip to voice interaction/i })).toHaveAttribute("href", "#voice-main");
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText(/About this demo/)).toBeInTheDocument();
    expect(document.title).toContain(en["module.title"]);
  });

  it("sets the document language to the selected language and restores it on close", () => {
    document.documentElement.lang = "en";
    useVoiceSessionStore.getState().setLanguage("kn-IN");
    const view = render(<VoiceInteractionPage />);
    expect(document.documentElement.lang).toBe("kn-IN");
    view.unmount();
    expect(document.documentElement.lang).toBe("en");
  });

  it("has no automated accessibility violations", async () => {
    const { container } = render(<VoiceInteractionPage />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  it("shows a demo-mode explanation when the browser cannot listen (as in this test environment)", () => {
    render(<VoiceInteractionPage />);
    expect(screen.getByText(en["demo.banner"])).toBeInTheDocument();
  });
});
