// backend/tests/physicianWorkspace.api.test.js
//
// Part 5 — Physician AI Workspace — API tests.
// Builds a minimal, isolated Express app that mounts ONLY this module's
// router, so these tests never depend on the rest of MediCare Pro's server
// (no Firebase, no Postgres/Mongo). Uses Node's built-in test runner and
// global fetch — no supertest dependency required.

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import physicianWorkspaceRoutes from "../routes/physicianWorkspaceRoutes.js";
import * as store from "../services/physicianWorkspace/store.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/physician-workspace", physicianWorkspaceRoutes);
  return app;
}

async function withServer(fn) {
  const app = buildApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/physician-workspace`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const doctorHeaders = {
  "content-type": "application/json",
  "x-demo-user-id": "doc-1",
  "x-demo-user-name": "Dr. Demo",
  "x-demo-user-role": "DOCTOR",
};
const nurseHeaders = { ...doctorHeaders, "x-demo-user-role": "NURSE" };

test("API: unauthenticated request is rejected", async () => {
  store.resetStore();
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/cases`);
    assert.equal(res.status, 401);
  });
});

test("API: nurse can read but cannot approve", async () => {
  store.resetStore();
  await withServer(async (baseUrl) => {
    const casesRes = await fetch(`${baseUrl}/cases`, { headers: nurseHeaders });
    assert.equal(casesRes.status, 200);
    const { data: cases } = await casesRes.json();
    assert.ok(cases.length > 0);

    const genRes = await fetch(`${baseUrl}/summaries/generate`, {
      method: "POST",
      headers: nurseHeaders,
      body: JSON.stringify({ caseId: cases[0].id }),
    });
    assert.equal(genRes.status, 403);
  });
});

test("API: full workflow — generate, view case, edit, approve", async () => {
  store.resetStore();
  await withServer(async (baseUrl) => {
    const casesRes = await fetch(`${baseUrl}/cases`, { headers: doctorHeaders });
    const { data: cases } = await casesRes.json();
    const caseId = cases[0].id;

    const caseRes = await fetch(`${baseUrl}/cases/${caseId}`, { headers: doctorHeaders });
    assert.equal(caseRes.status, 200);

    const genRes = await fetch(`${baseUrl}/summaries/generate`, {
      method: "POST",
      headers: doctorHeaders,
      body: JSON.stringify({ caseId }),
    });
    assert.equal(genRes.status, 201);
    const { data: summary } = await genRes.json();
    assert.equal(summary.status, "AI_GENERATED");

    const editRes = await fetch(`${baseUrl}/summaries/${summary.id}`, {
      method: "PUT",
      headers: doctorHeaders,
      body: JSON.stringify({ sections: { chiefComplaint: "Physician-edited complaint." } }),
    });
    assert.equal(editRes.status, 200);
    const { data: edited } = await editRes.json();
    assert.equal(edited.status, "PHYSICIAN_EDITED");

    const approveRes = await fetch(`${baseUrl}/summaries/${summary.id}/approve`, {
      method: "POST",
      headers: doctorHeaders,
    });
    assert.equal(approveRes.status, 200);
    const { data: approved } = await approveRes.json();
    assert.equal(approved.status, "APPROVED");

    const versionsRes = await fetch(`${baseUrl}/summaries/${summary.id}/versions`, { headers: doctorHeaders });
    const { data: versions } = await versionsRes.json();
    assert.equal(versions.length, 3);

    const auditRes = await fetch(`${baseUrl}/summaries/${summary.id}/audit`, { headers: doctorHeaders });
    const { data: audit } = await auditRes.json();
    assert.ok(audit.length >= 3);
  });
});

test("API: rejecting without a reason returns 400", async () => {
  store.resetStore();
  await withServer(async (baseUrl) => {
    const casesRes = await fetch(`${baseUrl}/cases`, { headers: doctorHeaders });
    const { data: cases } = await casesRes.json();

    const genRes = await fetch(`${baseUrl}/summaries/generate`, {
      method: "POST",
      headers: doctorHeaders,
      body: JSON.stringify({ caseId: cases[0].id }),
    });
    const { data: summary } = await genRes.json();

    const rejectRes = await fetch(`${baseUrl}/summaries/${summary.id}/reject`, {
      method: "POST",
      headers: doctorHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(rejectRes.status, 400);
  });
});

test("API: unknown case id returns 404, malformed id returns 400", async () => {
  store.resetStore();
  await withServer(async (baseUrl) => {
    const notFound = await fetch(`${baseUrl}/cases/CASE-DOES-NOT-EXIST`, { headers: doctorHeaders });
    assert.equal(notFound.status, 404);

    const malformed = await fetch(`${baseUrl}/cases/${encodeURIComponent("../etc/passwd")}`, { headers: doctorHeaders });
    assert.equal(malformed.status, 400);
  });
});
