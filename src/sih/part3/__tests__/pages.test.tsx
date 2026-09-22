// Full-stack UI tests: the real pages + the real API client against the real Part 3 backend (in-process, in-memory).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import DocumentWorkspacePage from "../pages/DocumentWorkspacePage";
import MedicalDocumentsPage from "../pages/MedicalDocumentsPage";
import { useAuthStore } from "../../store/authStore.js";

interface Backend { baseUrl: string; close: () => Promise<void>; context: { store: { resetAll: () => void; listDocuments: () => { total: number } } } }
const HELPERS = "../../../../backend/sih/part3/__tests__/helpers.js";
let backend: Backend;

beforeAll(async () => { backend = await (await import(/* @vite-ignore */ HELPERS)).startTestServer(); });
afterAll(async () => { await backend.close(); });
beforeEach(() => {
  backend.context.store.resetAll();
  vi.stubEnv("VITE_PART3_API_BASE_URL", backend.baseUrl);
  signInAs("DOCTOR");
});

function signInAs(role: string) {
  useAuthStore.setState({ user: { id: "u1", name: "Dr Test", email: "t@example.org", role }, isAuthenticated: true });
}
function renderApp(route = "/medical-documents") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/medical-documents" element={<MedicalDocumentsPage />} />
        <Route path="/medical-documents/:documentId" element={<DocumentWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const SLOW = { timeout: 10_000 };

async function openFixture(title: string) {
  await userEvent.click(await screen.findByRole("tab", { name: "Add a document" }));
  const item = (await screen.findByText(title)).closest("li") as HTMLElement;
  await userEvent.click(within(item).getByRole("button", { name: /Use this document/ }));
}

describe("Medical documents — the complete journey through the real UI", () => {
  it("synthetic library → run all steps → lab results with abnormal highlighting → source text → timeline", async () => {
    renderApp();
    const patient = await screen.findByRole("combobox", { name: /Patient/ }, SLOW);
    expect(within(patient).getByText(/Demo Patient A \(DEMO-P001\) — 0 documents/)).toBeInTheDocument();
    expect(await screen.findByText("No documents for this patient yet")).toBeInTheDocument();
    expect(screen.getByRole("note", { name: /medical safety notice/i })).toBeInTheDocument();

    await openFixture("Laboratory report - biochemistry & haematology (Mar 2025)");
    expect(await screen.findByRole("heading", { name: "Laboratory report" }, SLOW)).toBeInTheDocument();
    expect(screen.getAllByText("Synthetic demo data").length).toBeGreaterThan(0);

    await userEvent.click(await screen.findByRole("button", { name: /Run all remaining steps/ }));
    expect(await screen.findByText(/Completed: OCR, data extraction, timeline\./, {}, SLOW)).toBeInTheDocument();

    // Lab results are shown first for an extracted lab report.
    expect(await screen.findByText(/4 outside provided range/)).toBeInTheDocument();
    const row = (name: RegExp) => screen.getByRole("row", { name });
    expect(row(/Hemoglobin/)).toHaveAttribute("data-status", "OUTSIDE_RANGE");
    expect(within(row(/Hemoglobin/)).getByText("Below provided range")).toBeInTheDocument();
    expect(within(row(/Fasting Glucose/)).getByText("Above provided range")).toBeInTheDocument();
    expect(within(row(/Serum Creatinine/)).getByText("Within provided range")).toBeInTheDocument();
    expect(within(row(/Vitamin D/)).getByText("Unable to determine")).toBeInTheDocument();
    expect(within(row(/Serum Potassium/)).getByText("Unable to determine")).toBeInTheDocument();

    // "Show in text" jumps to the exact source line in the OCR text.
    await userEvent.click(within(row(/Hemoglobin/)).getByRole("button", { name: /show in text/i }));
    await waitFor(() => expect(document.querySelector("mark")).not.toBeNull());
    expect(document.querySelector("mark")?.textContent).toMatch(/Hemoglobin\s+10\.8/);
    expect(screen.getByText(/Demo OCR · recorded transcript/)).toBeInTheDocument();

    // Extracted-data tab keeps the "not confirmed" labelling.
    await userEvent.click(screen.getByRole("tab", { name: "Extracted data" }));
    const panel = screen.getByRole("tabpanel", { name: "Extracted data" });
    expect(within(panel).getByText(/not clinician-confirmed/i)).toBeInTheDocument();
    expect(within(panel).getByText("Used as document date")).toBeInTheDocument();

    // The document is now on the patient timeline, dated from the document.
    await userEvent.click(screen.getAllByRole("link", { name: /All medical documents/ })[0]);
    await userEvent.click(await screen.findByRole("tab", { name: "Timeline" }));
    expect(await screen.findByRole("heading", { name: "15 Mar 2025" }, SLOW)).toBeInTheDocument();
    expect(screen.getByText("Hemoglobin: 10.8 g/dL")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "16 Mar 2025" })).toBeInTheDocument();
  });

  it("runs the steps one at a time and shows each result", async () => {
    renderApp();
    await openFixture("Prescription - diabetes & hypertension (Mar 2025)");
    await userEvent.click(await screen.findByRole("button", { name: "Run OCR" }, SLOW));
    expect(await screen.findByLabelText("Text read from the document", {}, SLOW)).toHaveTextContent(/Metformin 500 mg/);
    await userEvent.click(await screen.findByRole("button", { name: "Extract data" }));
    const meds = await screen.findByRole("table", { name: /Medications found in the document/ }, SLOW);
    expect(within(meds).getByRole("row", { name: /Metformin/ })).toHaveTextContent("1-0-1");
    expect(within(within(meds).getByRole("row", { name: /Atorvastatin/ })).getByText("Not stated")).toBeInTheDocument(); // no frequency printed
    await userEvent.click(await screen.findByRole("button", { name: "Add to timeline" }));
    expect(await screen.findByText("On timeline", {}, SLOW)).toBeInTheDocument();
  });

  it("shows an undated document's entries as undated, never by upload time", async () => {
    renderApp();
    await openFixture("Prescription - no legible date");
    await userEvent.click(await screen.findByRole("button", { name: /Run all remaining steps/ }, SLOW));
    await screen.findByText(/Completed:/, {}, SLOW);
    await userEvent.click(screen.getAllByRole("link", { name: /All medical documents/ })[0]);
    await userEvent.selectOptions(await screen.findByRole("combobox", { name: /Patient/ }), "DEMO-P002");
    await userEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    const undated = await screen.findByRole("region", { name: "Undated entries" }, SLOW);
    expect(within(undated).getByText("Diagnosis: Acute pharyngitis")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /2026/ })).not.toBeInTheDocument();
  });

  it("reports a blank scan honestly and offers no extraction", async () => {
    renderApp();
    await openFixture("Blank scan - no recognisable text");
    await userEvent.click(await screen.findByRole("button", { name: "Run OCR" }, SLOW));
    expect(await screen.findByText("No text was found", {}, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Extract data" })).not.toBeInTheDocument();
  });
});

describe("Medical documents — failure paths", () => {
  const junkPng = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])], "scan.png", { type: "image/png" });

  it("uploads a scan the demo OCR cannot read, then explains the failure without inventing any text", async () => {
    renderApp("/medical-documents?view=add");
    await userEvent.upload(await screen.findByLabelText("File", {}, SLOW), junkPng());
    await userEvent.click(screen.getByRole("button", { name: /Upload and open/ }));
    expect(await screen.findByRole("heading", { name: "Prescription" }, SLOW)).toBeInTheDocument();
    expect(screen.queryByText("Synthetic demo data")).not.toBeInTheDocument(); // a user upload is not labelled synthetic

    await userEvent.click(screen.getByRole("button", { name: "Run OCR" }));
    const alerts = await screen.findAllByRole("alert", {}, SLOW);
    expect(alerts.some((a) => /can only read the bundled synthetic documents/.test(a.textContent ?? ""))).toBe(true);
    expect(await screen.findByText("OCR failed")).toBeInTheDocument();
    expect(screen.getByText(/none has been guessed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry OCR" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Extracted data" })).not.toBeInTheDocument();
  });

  it("uploading the downloaded synthetic sample through the upload form works end to end (as the docs describe)", async () => {
    const bytes = readFileSync(join(process.cwd(), "backend/sih/part3/seed/fixtures/rx-p001-2025-03.png")); // (jsdom replaces the global URL, so build a plain path)
    renderApp("/medical-documents?view=add");
    await userEvent.selectOptions(await screen.findByLabelText("Document type", {}, SLOW), "lab_report"); // wrong on purpose: a recognised synthetic file keeps its own type
    await userEvent.upload(screen.getByLabelText("File"), new File([new Uint8Array(bytes)], "sample.png", { type: "image/png" }));
    await userEvent.click(screen.getByRole("button", { name: /Upload and open/ }));
    expect(await screen.findByRole("heading", { name: "Prescription" }, SLOW)).toBeInTheDocument();
    expect(screen.getAllByText("Synthetic demo data").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Run OCR" }));
    expect(await screen.findByLabelText("Text read from the document", {}, SLOW)).toHaveTextContent(/Metformin 500 mg/);
  });

  it("validates a file before uploading it", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderApp("/medical-documents?view=add");
    await screen.findByLabelText("File", {}, SLOW);
    await user.click(screen.getByRole("button", { name: /Upload and open/ }));
    expect(await screen.findByText("Choose a file to upload.")).toBeInTheDocument();
    await user.upload(screen.getByLabelText("File"), new File(["hello"], "notes.txt", { type: "text/plain" }));
    await user.click(screen.getByRole("button", { name: /Upload and open/ }));
    expect(await screen.findByText("Only PNG, JPEG or PDF files can be uploaded.")).toBeInTheDocument();
    expect(backend.context.store.listDocuments().total).toBe(0);
  });

  it("shows a clear message when the role is not permitted", async () => {
    signInAs("BILLING");
    renderApp();
    expect(await screen.findByRole("alert", {}, SLOW)).toHaveTextContent(/Your role is not permitted/);
  });

  it("shows a clear message, with a retry, when the service is unreachable", async () => {
    vi.stubEnv("VITE_PART3_API_BASE_URL", "http://127.0.0.1:1/part3");
    renderApp();
    expect(await screen.findByRole("alert", {}, SLOW)).toHaveTextContent(/Cannot reach the Part 3 service/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("says so when a document does not exist", async () => {
    renderApp("/medical-documents/doc_0000000000");
    expect(await screen.findByRole("alert", {}, SLOW)).toHaveTextContent(/Document not found/);
  });
});

describe("Medical documents — administrator tools", () => {
  it("only administrators see the reset action", async () => {
    renderApp();
    await screen.findByRole("combobox", { name: /Patient/ }, SLOW);
    expect(screen.queryByRole("button", { name: /Reset demo data/ })).not.toBeInTheDocument();
  });

  it("an administrator sees the activity trail and can reset the demo data after confirming", async () => {
    signInAs("ADMIN");
    renderApp();
    await openFixture("Prescription - diabetes & hypertension (Mar 2025)");
    await userEvent.click(await screen.findByRole("button", { name: /Run all remaining steps/ }, SLOW));
    await screen.findByText(/Completed:/, {}, SLOW);
    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(await screen.findByText(/ocr run/i, {}, SLOW)).toBeInTheDocument();
    expect(screen.getByText(/timeline added/i)).toBeInTheDocument();
    expect(screen.queryByText(/Metformin/, { selector: "li *" })).not.toBeInTheDocument(); // the audit trail carries no document content

    await userEvent.click(screen.getAllByRole("link", { name: /All medical documents/ })[0]);
    await userEvent.click(await screen.findByRole("button", { name: /Reset demo data/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/cannot be undone/);
    await userEvent.click(screen.getByRole("button", { name: "Reset everything" }));
    await waitFor(() => expect(backend.context.store.listDocuments().total).toBe(0), SLOW);
    expect(await screen.findByText("No documents for this patient yet", {}, SLOW)).toBeInTheDocument();
  });
});
