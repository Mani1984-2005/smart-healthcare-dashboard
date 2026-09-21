import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TimelinePanel from "../components/TimelinePanel";
import { Part3ApiError } from "../services/client";
import { event, fakeClient, renderWithClient, safety } from "./testUtils";
import type { TimelineResponse } from "../types/part3";

const response = (over: Partial<TimelineResponse> = {}): TimelineResponse => {
  const events = over.events ?? [];
  const undated = over.undated ?? [];
  return { patientId: "DEMO-P001", order: "asc", events, undated, counts: { dated: events.length, undated: undated.length, byType: {} }, safety, ...over };
};

const lab = event({
  id: "e1", title: "Hemoglobin: 10.8 g/dL", eventDate: "2025-03-15", interpretationStatus: "OUTSIDE_RANGE", interpretationDirection: "BELOW",
  details: { referenceRange: "13.0 - 17.0", interpretation: { explanation: "10.8 is below the range supplied in the document (13 – 17)." } },
});
const rx = event({ id: "e2", documentId: "doc_2", docType: "prescription", eventType: "MEDICATION", title: "Medication: Metformin 500 mg", eventDate: "2025-03-12", dateBasis: "DOCUMENT_DATE", details: { form: "Tab", frequency: "1-0-1", directions: "after meals" } });
const later = event({ id: "e3", documentId: "doc_3", eventType: "DIAGNOSIS", title: "Diagnosis: Anaemia", eventDate: "2025-09-06", dateBasis: "DISCHARGE_DATE", docType: "discharge_summary" });

describe("TimelinePanel", () => {
  it("shows a loading state, then dated groups in the order the server returned", async () => {
    const getTimeline = vi.fn().mockResolvedValue(response({ events: [rx, lab, later] }));
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline }));
    expect(screen.getByRole("status")).toHaveTextContent(/Loading timeline/);
    const headings = await screen.findAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(["12 Mar 2025", "15 Mar 2025", "06 Sep 2025"]);
    expect(screen.getByText("Medication: Metformin 500 mg")).toBeInTheDocument();
  });

  it("shows the lab flag, the range printed in the document, and where the date came from", async () => {
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline: vi.fn().mockResolvedValue(response({ events: [lab] })) }));
    await screen.findByText("Hemoglobin: 10.8 g/dL");
    expect(screen.getByText("Below provided range")).toBeInTheDocument();
    expect(screen.getByText(/Range printed in document: 13\.0 - 17\.0/)).toBeInTheDocument();
    expect(screen.getByText("Sample collection date")).toBeInTheDocument();
  });

  it("links each event to its source document and the exact text span", async () => {
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline: vi.fn().mockResolvedValue(response({ events: [lab] })) }));
    const link = await screen.findByRole("link", { name: /View source/ });
    expect(link).toHaveAttribute("href", "/medical-documents/doc_1?start=10&end=20");
  });

  it("marks synthetic documents", async () => {
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline: vi.fn().mockResolvedValue(response({ events: [lab] })) }));
    expect(await screen.findByText("Synthetic demo data")).toBeInTheDocument();
  });

  it("puts undated entries in their own section and says they are never dated by upload time", async () => {
    const undated = event({ id: "u1", eventType: "DIAGNOSIS", title: "Diagnosis: Acute pharyngitis", eventDate: null, dateBasis: "UNKNOWN" });
    renderWithClient(<TimelinePanel patientId="DEMO-P002" />, fakeClient({ getTimeline: vi.fn().mockResolvedValue(response({ events: [], undated: [undated] })) }));
    const section = await screen.findByRole("region", { name: "Undated entries" });
    expect(within(section).getByText("Diagnosis: Acute pharyngitis")).toBeInTheDocument();
    expect(within(section).getByText(/never dated by upload time/)).toBeInTheDocument();
    expect(within(section).getByText("No date found in the document")).toBeInTheDocument();
  });

  it("shows an empty state that explains how to fill the timeline", async () => {
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline: vi.fn().mockResolvedValue(response()) }));
    expect(await screen.findByText("No timeline entries yet")).toBeInTheDocument();
    expect(screen.getByText(/Only dates written in the documents are used/)).toBeInTheDocument();
  });

  it("shows an error with the reason and recovers on retry", async () => {
    const getTimeline = vi.fn().mockRejectedValueOnce(new Part3ApiError(0, "NETWORK_ERROR", "x")).mockResolvedValue(response({ events: [lab] }));
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Cannot reach the Part 3 service/);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Hemoglobin: 10.8 g/dL")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("filters by event type and changes order through the server", async () => {
    const getTimeline = vi.fn().mockResolvedValue(response({ events: [rx] }));
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline }));
    await screen.findByText("Medication: Metformin 500 mg");
    const chip = screen.getByRole("button", { name: "Medication" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(chip);
    await waitFor(() => expect(getTimeline).toHaveBeenLastCalledWith("DEMO-P001", { order: "asc", types: ["MEDICATION"] }));
    expect(screen.getByRole("button", { name: "Medication" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.selectOptions(screen.getByLabelText("Order"), "desc");
    await waitFor(() => expect(getTimeline).toHaveBeenLastCalledWith("DEMO-P001", { order: "desc", types: ["MEDICATION"] }));
  });

  it("explains an empty filter result separately from an empty timeline", async () => {
    renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline: vi.fn().mockResolvedValue(response()) }));
    await screen.findByText("No timeline entries yet");
    await userEvent.click(screen.getByRole("button", { name: "Diagnosis" }));
    expect(await screen.findByText("No events match this filter")).toBeInTheDocument();
  });

  it("never shows one patient's events while another patient's timeline is loading", async () => {
    let resolveSecond: (r: TimelineResponse) => void = () => {};
    const getTimeline = vi.fn().mockResolvedValueOnce(response({ events: [lab] })).mockImplementationOnce(() => new Promise((res) => { resolveSecond = res; }));
    const view = renderWithClient(<TimelinePanel patientId="DEMO-P001" />, fakeClient({ getTimeline }));
    await screen.findByText("Hemoglobin: 10.8 g/dL");
    view.rerender(<TimelinePanel patientId="DEMO-P002" />);
    expect(screen.queryByText("Hemoglobin: 10.8 g/dL")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Loading timeline/);
    resolveSecond(response({ patientId: "DEMO-P002", events: [] }));
    expect(await screen.findByText("No timeline entries yet")).toBeInTheDocument();
  });
});
