// tests/patientRecordPersistence.test.js
// -----------------------------------------------------------------------------
// Source-contract regression tests for patient-record persistence truthfulness.
//
// The backend exposes NO DELETE route for patients (backend/src/routes/
// patients.routes.js has only POST /, GET /, GET /:id, PATCH /:id) and the
// frontend API layer (src/api/patients.js) has no delete function. Therefore
// removing a SERVER-backed record (UUID id) from the patient list can only
// clear local state + localStorage — the record would reappear on the next
// successful fetch. PatientsPage.handleDelete must tell the user the truth
// instead of silently presenting a local removal as a completed deletion.
//
// Uses the repo's established source-contract pattern (fs.readFileSync +
// assertions, as in tests/billingWorkflow.test.js "Component Contract").
// -----------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const page = fs.readFileSync(path.resolve('src/pages/PatientsPage.jsx'), 'utf-8');

function extractHandleDelete() {
  const start = page.indexOf('const handleDelete = (id) =>');
  assert.ok(start !== -1, 'PatientsPage must define handleDelete');
  const end = page.indexOf('\n  };', start);
  assert.ok(end !== -1, 'handleDelete body must terminate');
  return page.slice(start, end);
}

describe('PatientsPage delete persistence truthfulness', () => {
  test('guard exists: UUID (server) ids are tested before any local removal', () => {
    const body = extractHandleDelete();
    assert.match(
      body,
      /\[0-9a-f\]\{8\}-[0-9a-f\]\{4\}[\s\S]*?\/i\.test\(id\)/,
      'handleDelete must recognise server (UUID) record ids',
    );
    const guardIdx = body.search(/\/\^\[0-9a-f\]\{8\}/);
    const removeIdx = body.indexOf('setPatients((prev) => prev.filter');
    assert.ok(guardIdx !== -1 && removeIdx !== -1, 'both guard and local removal must exist');
    assert.ok(
      guardIdx < removeIdx,
      'the server-record guard must run BEFORE the local removal',
    );
  });

  test('server-record path reports the truth and never reaches local removal', () => {
    const body = extractHandleDelete();
    const guardIdx = body.search(/\/\^\[0-9a-f\]\{8\}/);
    const guardSection = body.slice(guardIdx);
    assert.match(
      guardSection,
      /setApiError\(/,
      'the server-record branch must surface a user-visible apiError banner',
    );
    assert.match(
      guardSection,
      /NOT removed/,
      'the banner must state plainly that the record was NOT removed',
    );
    // The branch must exit before any local state mutation.
    const returnIdx = guardSection.indexOf('return;');
    const removeIdx = body.indexOf('setPatients((prev) => prev.filter');
    assert.ok(returnIdx !== -1, 'the server-record branch must return early');
    assert.ok(
      guardIdx + returnIdx < removeIdx,
      'the early return must precede the local removal',
    );
  });

  test('local demo (non-UUID) records still require explicit confirmation', () => {
    const body = extractHandleDelete();
    const removeIdx = body.indexOf('setPatients((prev) => prev.filter');
    assert.ok(removeIdx !== -1, 'local demo removal path must still exist');
    const localSection = body.slice(0, removeIdx);
    assert.match(
      localSection,
      /window\.confirm\(/,
      'removing a local demo record must stay behind a confirmation dialog',
    );
  });
});
