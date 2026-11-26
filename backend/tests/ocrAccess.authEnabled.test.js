// backend/tests/ocrAccess.authEnabled.test.js
// When AUTH_ENABLED=true the OCR gate delegates to the existing OIDC
// `authenticate` middleware and fails closed without a Bearer token.
//
// AUTH_ENABLED is forced to 'true' BEFORE the gate module is imported.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

process.env.AUTH_ENABLED = 'true';

let ocrAccess;
let server;
let baseUrl;

before(async () => {
  ocrAccess = (await import('../src/middleware/ocrAccess.js')).ocrAccess;

  const app = express();
  app.use((req, res, next) => ocrAccess(req, res, next));
  app.get('/probe', (req, res) => {
    res.json({ mode: req.ocrAccessMode, actor: req.ocrActorLabel });
  });
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
    });
  });

  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/probe`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

describe('AUTH_ENABLED=true (verified identity path)', () => {
  test('request without Authorization header is rejected 401 (fail closed)', async () => {
    const res = await fetch(baseUrl);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
    assert.match(json.error.message, /Authorization/i);
  });

  test('request with malformed Authorization header is rejected 401', async () => {
    const res = await fetch(baseUrl, { headers: { Authorization: 'Token abc' } });
    assert.equal(res.status, 401);
  });
});
