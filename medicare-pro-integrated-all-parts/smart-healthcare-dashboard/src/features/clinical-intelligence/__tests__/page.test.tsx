import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClinicalApiError } from "../api";
import { FX, installApi, renderPage, type ApiMock } from "./testUtils";

async function pick(user: ReturnType<typeof userEvent.setup>, id: string) {
  await user.selectOptions(await screen.findByLabelText("Demo patient"), id);
}
async function run(user: ReturnType<typeof userEvent.setup>, id: string, ai = false) {
  await pick(user, id);
  if (ai) await user.click(screen.getByLabelText(/Include an AI-drafted narrative/));
  await user.click(screen.getByRole("button", { name: "Run clinical intelligence" }));
  await screen.findByText("Clinical summary");
}
const tab = (name: RegExp | string) => screen.getByRole("tab", { name });

describe("Clinical Intelligence page — loading, empty and error states", () => {
  it("shows a loading state while connecting, then the patient picker", async () => {
    const api = installApi();
    let release: (v: unknown) => void = () => {};
    api.status.mockImplementation(() => new Promise((r) => { release = r; }));
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Connecting to Clinical Intelligence");
    release({ ...FX.status });
    expect(await screen.findByLabelText("Demo patient")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(7);
  });

  it("always shows the decision-support notice and the demo-mode banner", async () => {
    installApi();
    renderPage();
    expect((await screen.findAllByText(/Decision support only\./)).length).toBeGreaterThan(0);
    expect(screen.getByText(/all patients are synthetic and no real patient data is used/)).toBeInTheDocument();
    expect(screen.getByText(/deterministic demo provider \(a fixed template, not a language model\)/)).toBeInTheDocument();
  });

  it("empty states: no patient selected → prompts; other tabs ask to run the analysis", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText("Select a demo patient")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run clinical intelligence" })).toBeDisabled();
    await user.click(tab("Alerts"));
    expect(screen.getByText("Run clinical intelligence", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("Select a demo patient first.")).toBeInTheDocument();
  });

  it("boot failure shows an alert with a working retry", async () => {
    const api = installApi();
    api.status.mockRejectedValueOnce(new ClinicalApiError(0, "NETWORK_ERROR", "The Clinical Intelligence service could not be reached."));
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be reached");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Demo patient")).toBeInTheDocument();
  });

  it("shows a loading state while the analysis runs", async () => {
    installApi({ analysisDelay: 60 });
    const user = userEvent.setup();
    renderPage();
    await pick(user, "CI-DEMO-001");
    await user.click(screen.getByRole("button", { name: "Run clinical intelligence" }));
    expect(await screen.findByText("Running clinical intelligence…")).toBeInTheDocument();
    expect(await screen.findByText("Clinical summary")).toBeInTheDocument();
  });

  it("analysis failure shows the server's message and retry succeeds", async () => {
    const api = installApi();
    api.analyze.mockRejectedValueOnce(new ClinicalApiError(503, "SERVICE_UNAVAILABLE", "The clinical context source is unavailable."));
    const user = userEvent.setup();
    renderPage();
    await pick(user, "CI-DEMO-002");
    await user.click(screen.getByRole("button", { name: "Run clinical intelligence" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("context source is unavailable");
    await user.click(screen.getByRole("button", { name: "Retry analysis" }));
    expect(await screen.findByText("Clinical summary")).toBeInTheDocument();
  });

  it("re-establishes an expired session once and retries (401 → new session → success)", async () => {
    const api = installApi();
    api.analyze.mockRejectedValueOnce(new ClinicalApiError(401, "UNAUTHENTICATED", "Authentication is required."));
    const user = userEvent.setup();
    renderPage();
    await pick(user, "CI-DEMO-001");
    const before = api.createSession.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Run clinical intelligence" }));
    expect(await screen.findByText("Clinical summary")).toBeInTheDocument();
    expect(api.createSession.mock.calls.length).toBe(before + 1);
  });

  it("AI checkbox is disabled, with an explanation, when no AI provider is configured", async () => {
    installApi({ aiProvider: "none" });
    renderPage();
    expect(await screen.findByLabelText(/Include an AI-drafted narrative/)).toBeDisabled();
    expect(screen.getByText(/No AI provider is configured; deterministic analysis only/)).toBeInTheDocument();
  });
});

describe("Clinical Intelligence page — the clinical flow", () => {
  it("loads a demo patient's context; unknown data is marked 'Not provided', never blank or invented", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await pick(user, "CI-DEMO-004");
    expect(await screen.findByText("Vikram Rao (Demo)")).toBeInTheDocument();
    expect(screen.getByText("Synthetic demo data")).toBeInTheDocument();
    expect(screen.getAllByText("Not provided").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("(no unit)")).toBeInTheDocument();
  });

  it("'none known' is displayed differently from 'not provided'", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await pick(user, "CI-DEMO-001");
    expect(await screen.findByText("No known allergies (documented)")).toBeInTheDocument();
  });

  it("runs the analysis and shows the record-derived summary with traceable content", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-006");
    const summary = screen.getByTestId("record-summary");
    expect(within(summary).getByText(/Severe central chest pain for 40 minutes/)).toBeInTheDocument();
    expect(within(summary).getByText(/Chest pain, severe, 40 minutes/)).toBeInTheDocument();
  });

  it("AI content is visually and textually distinct from record content", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-006", true);
    const ai = screen.getByTestId("ai-narrative");
    expect(within(ai).getByText("AI-generated")).toBeInTheDocument();
    expect(ai.className).toContain("border-dashed");
    expect(within(ai).getByText(/unverified/)).toBeInTheDocument();
    const record = screen.getByTestId("record-summary").closest("section") as HTMLElement;
    expect(within(record).queryByText("AI-generated")).not.toBeInTheDocument();
    expect(within(record).getByText("Record")).toBeInTheDocument();
    expect(record.className).not.toContain("border-dashed");
  });

  it("when the AI is not requested, no AI content appears at all", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-006", false);
    expect(screen.queryByTestId("ai-narrative")).not.toBeInTheDocument();
    expect(screen.queryByText("AI-generated")).not.toBeInTheDocument();
  });

  it("Alerts: red flags are prominent, with urgency, and each explains what/why/source/missing/action", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-006");
    expect(within(tab(/^Alerts/)).getByText("6")).toBeInTheDocument();
    await user.click(tab(/^Alerts/));
    expect(screen.getByRole("alert")).toHaveTextContent("6 potential warning signs need clinician review");
    const card = screen.getByTestId("finding-rf-chest-pain");
    expect(within(card).getByText("Immediate review")).toBeInTheDocument();
    for (const label of ["What", "Why", "Source", "What is missing", "Clinician action"]) expect(within(card).getByText(label)).toBeInTheDocument();
    expect(within(card).getByText("ECG")).toBeInTheDocument();
    expect(within(card).getByText(/Chest pain: present, severe, 40 minutes/)).toBeInTheDocument();
  });

  it("Alerts: with no red flags it says so cautiously and lists what could NOT be evaluated", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-004");
    await user.click(tab(/^Alerts/));
    expect(screen.getByText(/does not mean the patient is well/)).toBeInTheDocument();
    expect(screen.getByText("Rules that could not be evaluated")).toBeInTheDocument();
    expect(screen.getByText(/Age not provided: adult vital-sign thresholds were not applied/)).toBeInTheDocument();
  });

  it("Insights: considerations are hedged and never presented as diagnoses; gaps and data quality are separate", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-006");
    await user.click(tab(/^Insights/));
    expect(screen.getByText(/not diagnoses/)).toBeInTheDocument();
    expect(screen.getByText(/may be consistent with an acute coronary syndrome/)).toBeInTheDocument();
    expect(screen.getAllByText(/not a probability/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Data quality" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missing information" })).toBeInTheDocument();
  });

  it("Insights for an incomplete record: gaps and contradictions are visible", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-004");
    await user.click(tab(/^Insights/));
    expect(screen.getAllByText("Allergy status not provided").length).toBeGreaterThan(0);
    expect(screen.getByText("Contradictory symptom entries")).toBeInTheDocument();
    expect(screen.getByText(/No pattern had enough documented support/)).toBeInTheDocument();
  });

  it("Investigations: interpretation only against supplied ranges, trends shown, un-interpretable results explained", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-002");
    await user.click(tab(/^Investigations/));
    expect(screen.getByText(/never invents a range and never converts a unit/)).toBeInTheDocument();
    expect(screen.getAllByText("Above supplied range").length).toBeGreaterThan(0);
    expect(screen.getByText(/Increased by 0.6 mg\/dL \(46.15%\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/moved from within range to above range/).length).toBeGreaterThan(0);
  });

  it("Investigations for a unit-less, range-less result: 'Not interpreted' with the reason", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-004");
    await user.click(tab(/^Investigations/));
    const cells = screen.getAllByText("Not interpreted");
    expect(cells.length).toBeGreaterThan(0);
    expect(screen.getByText(/Reason: unit not provided; reference range not provided/)).toBeInTheDocument();
  });

  it("Medication & allergy: review-required framing, allergy conflict shown, and unperformed checks explained", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-003");
    await user.click(tab(/^Medication/));
    expect(screen.getByText(/never prescribes, changes or stops a medication/)).toBeInTheDocument();
    expect(screen.getByText(/Documented allergy conflict: Amoxicillin/)).toBeInTheDocument();
    expect(screen.getAllByText(/^Review required:/).length).toBeGreaterThan(2);
  });

  it("Medication & allergy for an incomplete record: every check shows 'Not performed' with the reason", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-004");
    await user.click(tab(/^Medication/));
    expect(screen.getAllByText("Not performed").length).toBe(5);
    expect(screen.getByText("Not performed — and why")).toBeInTheDocument();
    expect(screen.getAllByText(/No medication list was provided/).length).toBeGreaterThan(0);
  });

  it("Timeline: events grouped by date in chronological order", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-005");
    await user.click(tab(/^Timeline/));
    const dates = screen.getAllByRole("listitem").map((li) => li.querySelector("p.text-sm.font-semibold")?.textContent).filter(Boolean) as string[];
    expect(dates.slice(0, 3)).toEqual(["12 Jan 2026", "9 Mar 2026", "18 May 2026"]);
    expect(screen.getAllByText("Medication started").length).toBe(3);
  });

  it("Evidence: legend, provenance, AI status and every finding with its explanation", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-006", true);
    await user.click(tab(/^Evidence/));
    expect(screen.getByText("How to read this analysis")).toBeInTheDocument();
    expect(screen.getByText(/sih2026-part4-demo-rules v0.1.0 — demo — not clinically validated/)).toBeInTheDocument();
    expect(screen.getByText(/mock \(deterministic-template-v1\) — used/)).toBeInTheDocument();
  });

  it("does not persist clinical data or the session token in browser storage", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-006", true);
    const dump = JSON.stringify(Object.fromEntries(Object.keys(window.localStorage).map((k) => [k, window.localStorage.getItem(k)])));
    expect(dump).not.toMatch(/Imran|chest|tok-1|analysisId/i);
  });
});

describe("Clinician review workflow", () => {
  it("doctor accepts an item: state, reviewer and progress update; nothing is pre-approved", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage("DOCTOR");
    await run(user, "CI-DEMO-006", true);
    await user.click(tab(/^Clinician review/));
    const summary = screen.getByTestId("review-summary");
    expect(within(summary).getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByTestId("review-ai-narrative")).toHaveTextContent("Needs review");
    expect(screen.getByText(/never marked approved automatically/)).toBeInTheDocument();
    expect(screen.getByText(/^0 of \d+ items reviewed$/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Accept: Clinical summary (record-derived)" }));
    await waitFor(() => expect(within(screen.getByTestId("review-summary")).getByText(/Accepted/, { selector: "strong" })).toBeInTheDocument());
    expect(within(screen.getByTestId("review-summary")).getByText(/by Dr. Test/)).toBeInTheDocument();
    expect(screen.getByText(/^1 of \d+ items reviewed$/)).toBeInTheDocument();
    expect(screen.getByTestId("review-ai-narrative")).toHaveTextContent("Needs review");
  });

  it("rejecting requires a reason: empty submit is blocked client-side, no API call is made", async () => {
    const api: ApiMock = installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-001");
    await user.click(tab(/^Clinician review/));
    await user.click(screen.getByRole("button", { name: "Reject: Clinical summary (record-derived)" }));
    await user.click(screen.getByRole("button", { name: "Record rejection" }));
    expect(await screen.findByText("Please explain why this item is being rejected.")).toBeInTheDocument();
    expect(api.review).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Reason (required)"), "Not relevant to this visit");
    await user.click(screen.getByRole("button", { name: "Record rejection" }));
    await waitFor(() => expect(api.review).toHaveBeenCalledWith("tok-1", expect.any(String), expect.objectContaining({ itemId: "summary", decision: "rejected", note: "Not relevant to this visit" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("modifying requires corrected text and stores it alongside the original", async () => {
    const api: ApiMock = installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-001");
    await user.click(tab(/^Clinician review/));
    await user.click(screen.getByRole("button", { name: "Modify: Clinical summary (record-derived)" }));
    await user.click(screen.getByRole("button", { name: "Record modification" }));
    expect(await screen.findByText("Please enter the corrected text.")).toBeInTheDocument();
    expect(api.review).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Corrected text"), "Mild viral URTI, reviewed");
    await user.click(screen.getByRole("button", { name: "Record modification" }));
    await waitFor(() => expect(within(screen.getByTestId("review-summary")).getByText(/Clinician’s version: Mild viral URTI, reviewed/)).toBeInTheDocument());
  });

  it("when every item is reviewed the panel says so", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage();
    await run(user, "CI-DEMO-001");
    await user.click(tab(/^Clinician review/));
    await user.click(screen.getByRole("button", { name: "Accept: Clinical summary (record-derived)" }));
    expect(await screen.findByText("Every item has a clinician decision.")).toBeInTheDocument();
  });

  it("a nurse can see review items but every decision button is disabled, with an explanation", async () => {
    installApi();
    const user = userEvent.setup();
    renderPage("NURSE");
    await run(user, "CI-DEMO-006");
    await user.click(tab(/^Clinician review/));
    expect(screen.getByText(/Only a doctor can record a clinician review/)).toBeInTheDocument();
    for (const b of screen.getAllByRole("button", { name: /^(Accept|Reject|Modify):/ })) expect(b).toBeDisabled();
  });

  it("a server-side refusal is surfaced to the user (frontend checks are never the only gate)", async () => {
    const api = installApi();
    api.review.mockRejectedValueOnce(new ClinicalApiError(403, "FORBIDDEN", "Your role is not permitted to perform this action."));
    const user = userEvent.setup();
    renderPage("DOCTOR");
    await run(user, "CI-DEMO-001");
    await user.click(tab(/^Clinician review/));
    await user.click(screen.getByRole("button", { name: "Accept: Clinical summary (record-derived)" }));
    expect(await screen.findByText("Your role is not permitted to perform this action.")).toBeInTheDocument();
    expect(within(screen.getByTestId("review-summary")).getByText("Needs review")).toBeInTheDocument();
  });

  it("the session request carries the signed-in user's role, and clinical calls carry the session token", async () => {
    const api = installApi();
    const user = userEvent.setup();
    renderPage("NURSE");
    await run(user, "CI-DEMO-001");
    expect(api.createSession).toHaveBeenCalledWith({ role: "NURSE", displayName: "Dr. Test", hospitalId: "hospital-01" });
    expect(api.analyze).toHaveBeenCalledWith("tok-1", "CI-DEMO-001", false);
    void vi;
  });
});
