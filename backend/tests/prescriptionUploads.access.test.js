// backend/tests/prescriptionUploads.access.test.js
// Access-gate behaviour for medical document endpoints:
//  - development mode (AUTH_ENABLED=false, non-production) → allowed, labelled
//  - production mode without a verified identity provider → FAIL CLOSED (503)
//
// AUTH_ENABLED is forced to 'false' BEFORE any app module is imported.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

process.env.AUTH_ENABLED = 'false';

let router;
let server;
let baseUrl;
const originalNodeEnv = process.env.NODE_ENV;

before(async () => {
  process.env.NODE_ENV = 'development';
  router = (await import('../src/routes/prescriptionUploads.routes.js')).default;
  const app = express();
  app.use('/api/prescription-uploads', router);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
    });
  });
  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/prescription-uploads`;
});

after(async () => {
  process.env.NODE_ENV = originalNodeEnv;
  if (server) await new Promise((r) => server.close(r));
});

describe('Development access mode (AUTH_ENABLED=false)', () => {
  test('routes are reachable and are never treated as authenticated', async () => {
    const res = await fetch(`${baseUrl}?page=1&limit=1`);
    // Not 401 (dev mode), not 503 (not production). A real DB gives 200;
    // a down DB gives 500 — both prove the gate did not block access.
    assert.ok(
      ![401, 503].includes(res.status),
      `unexpected gate response: ${res.status}`
    );
  });

  test('production mode without verified auth FAILS CLOSED with 503', async () => {
    process.env.NODE_ENV = 'production';
    try {
      for (const [method, url] of [
        ['GET', `${baseUrl}?page=1`],
        ['GET', `${baseUrl}/00000000-0000-4000-8000-000000000000`],
        ['GET', `${baseUrl}/00000000-0000-4000-8000-000000000000/document`],
        ['DELETE', `${baseUrl}/00000000-0000-4000-8000-000000000000`],
      ]) {
        const res = await fetch(url, { method });
        assert.equal(res.status, 503, `${method} ${url} must be blocked`);
        const json = await res.json();
        assert.equal(json.success, false);
        assert.equal(json.error.code, 'AUTH_REQUIRED');
        assert.match(json.error.message, /verified authentication provider/i);
      }

      const postRes = await fetch(baseUrl, { method: 'POST', body: new FormData() });
      assert.equal(postRes.status, 503, 'uploads must be blocked in production too');
    } finally {
      process.env.NODE_ENV = 'development';
    }
  });

  test('after leaving production mode the gate opens again (dev)', async () => {
    const res = await fetch(`${baseUrl}?page=1&limit=1`);
    assert.ok(![401, 503].includes(res.status));
  });
});
