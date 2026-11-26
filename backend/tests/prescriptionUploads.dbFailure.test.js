// backend/tests/prescriptionUploads.dbFailure.test.js
// Database failure handling: a valid upload whose DB insert fails must
// return HTTP 500, must not crash the process, and must not leave an
// orphaned file in private storage.
//
// The connection target is redirected to an unreachable port BEFORE any
// app module is imported (each node --test file runs in its own process).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures'
);

const originalHost = process.env.PGHOST;
const originalPort = process.env.PGPORT;

process.env.PGHOST = '127.0.0.1';
process.env.PGPORT = '1'; // unreachable — connection refused

let router;
let errorHandler;
let server;
let baseUrl;
let privateRoot;

before(async () => {
  router = (await import('../src/routes/prescriptionUploads.routes.js')).default;
  errorHandler = (await import('../src/middleware/errorHandler.js')).errorHandler;
  privateRoot = (await import('../src/services/privateStorage.service.js')).getPrivateStorageRoot();

  const app = express();
  app.use('/api/prescription-uploads', router);
  app.use(errorHandler);

  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/prescription-uploads`;
});

after(async () => {
  process.env.PGHOST = originalHost;
  process.env.PGPORT = originalPort;
  if (server) await new Promise((r) => server.close(r));
});

describe('Database failure handling', () => {
  test('insert failure returns 500 without crashing and cleans the temp file', async () => {
    const filesBefore = fs.readdirSync(privateRoot).length;

    const form = new FormData();
    const bytes = await fs.promises.readFile(
      path.join(FIXTURES, 'synthetic_prescription.png')
    );
    form.append('prescription', new Blob([bytes], { type: 'image/png' }), 'rx.png');
    form.append('uploadSource', 'image');

    const res = await fetch(baseUrl, { method: 'POST', body: form });
    assert.equal(res.status, 500, 'DB failure must surface as HTTP 500');
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'INTERNAL_ERROR');
    assert.ok(typeof json.error.message === 'string' && json.error.message.length > 0);

    // No orphan file left in private storage.
    const filesAfter = fs.readdirSync(privateRoot).length;
    assert.equal(filesAfter, filesBefore, 'failed insert must remove the stored file');
  });

  test('server still answers other requests after DB failure', async () => {
    const res = await fetch(`${baseUrl}?page=1`);
    assert.ok(res.status >= 400, 'DB is unreachable so the list must fail cleanly');
    const json = await res.json();
    assert.equal(json.success, false);
  });
});
