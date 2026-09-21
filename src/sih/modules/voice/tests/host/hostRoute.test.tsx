import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../../../../App";
import { en } from "../../locales/en";

/**
 * These tests import the MediCare Pro host app, so they live apart from the
 * module's own tests and are excluded from the module's scoped type-check
 * (the host has pre-existing type errors that are not part of Part 2).
 */
describe("routing inside MediCare Pro", () => {
  it("opens /sih/voice directly, without signing in and without any other page", async () => {
    window.localStorage.clear();
    render(
      <MemoryRouter initialEntries={["/sih/voice"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { level: 1, name: en["module.title"] })).toBeInTheDocument();
    expect(screen.queryByText(/Sign in to MediCare Pro/)).not.toBeInTheDocument();
  });

  it("leaves existing route protection unchanged: the dashboard still redirects to login", async () => {
    window.localStorage.clear();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Sign in to MediCare Pro/)).toBeInTheDocument();
  });

  it("still sends unknown paths to login when signed out", async () => {
    window.localStorage.clear();
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Sign in to MediCare Pro/)).toBeInTheDocument();
  });
});
