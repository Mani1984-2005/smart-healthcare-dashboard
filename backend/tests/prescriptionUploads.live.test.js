// backend/tests/prescriptionUploads.live.test.js
// REAL local integration test: verifies Node → PaddleOCR service
// communication against the running GPU service at PADDLEOCR_URL, plus a
// full HTTP upload → OCR → PostgreSQL → audit pipeline using the real
// service (no mocks).
//
// Skips gracefully when the service or the database is unavailable.
// Uses only the synthetic fixture — never real patient data.

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
const PNG_FIXTURE = path.join(FIXTURES, 'synthetic_prescription.png');

let serviceUp = false;
let dbReady = false;
let baseUrl = null; // API base url when app is started
let ocr;
let server;
let pool;
let cleanupIds = [];

before(async () => {
  process.env.OCR_ENGINE = 'paddleocr';

  // 1. Is the real PaddleOCR service reachable?
  const paddleUrl = process.env.PADDLEOCR_URL || 'http://127.0.0.1:8001';
  try {
    const res = await fetch(`${paddleUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    serviceUp = res.status === 200 && json.success === true;
  } catch {
    serviceUp = false;
  }

  // 2. Is the OCR schema reachable?
  try {
    pool = (await import('../src/config/db.js')).default;
    await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'prescription_uploads'`
    );
    dbReady = true;
  } catch {
    dbReady = false;
  }

  if (serviceUp && dbReady) {
    ocr = await import('../src/services/ocr.service.js');
    const router = (await import('../src/routes/prescriptionUploads.routes.js')).default;
    const errorHandler = (await import('../src/middleware/errorHandler.js')).errorHandler;
    const app = express();
    app.use('/api/prescription-uploads', router);
    app.use(errorHandler);
    await new Promise((r) => {
      server = app.listen(0, '127.0.0.1', r);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/prescription-uploads`;
  }
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (dbReady && pool) {
    // Clean up rows created by this test run.
    try {
      if (cleanupIds.length) {
        const files = await pool.query(
          'SELECT file_path FROM prescription_uploads WHERE id = ANY($1::uuid[])',
          [cleanupIds]
        );
        await pool.query(
          'DELETE FROM prescription_upload_audit WHERE upload_id = ANY($1::uuid[])',
          [cleanupIds]
        );
        await pool.query('DELETE FROM prescription_uploads WHERE id = ANY($1::uuid[])', [
          cleanupIds,
        ]);
        // Remove the stored files too, so test rows don't orphan files in
        // private storage.
        for (const row of files.rows) {
          try {
            await fs.promises.unlink(row.file_path);
          } catch {
            /* already gone */
          }
        }
      }
    } catch {
      // Leftover rows are harmless; never fail teardown on cleanup.
    }
    await pool.end().catch(() => {});
  }
});

describe('Live PaddleOCR integration', () => {
  test('service /health reports a running engine', async (t) => {
    if (!serviceUp) {
      t.skip('PaddleOCR service not reachable');
      return;
    }
    const res = await fetch(
      `${process.env.PADDLEOCR_URL || 'http://127.0.0.1:8001'}/health`
    );
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.status, 'running');
    assert.equal(json.engine_initialized, true);
  });

  test('unauthorized OCR request is rejected with 401', async (t) => {
    if (!serviceUp) {
      t.skip('PaddleOCR service not reachable');
      return;
    }
    const form = new FormData();
    const bytes = await fs.promises.readFile(PNG_FIXTURE);
    form.append('file', new Blob([bytes], { type: 'image/png' }), 'synthetic.png');
    const res = await fetch(
      `${process.env.PADDLEOCR_URL || 'http://127.0.0.1:8001'}/ocr`,
      { method: 'POST', body: form }
    );
    assert.equal(res.status, 401, 'the OCR endpoint must reject missing tokens');
  });

  test('runImageOcr extracts real text from the synthetic fixture', async (t) => {
    if (!serviceUp) {
      t.skip('PaddleOCR service not reachable');
      return;
    }
    const result = await ocr.runImageOcr(PNG_FIXTURE);
    assert.equal(result.engine, 'PaddleOCR');
    assert.match(result.text, /PARACETAMOL/, 'known fixture text must be recognised');
    assert.ok(
      typeof result.confidence === 'number' &&
        result.confidence > 0 &&
        result.confidence <= 100,
      `confidence must be a percentage, got ${result.confidence}`
    );
    assert.ok(result.durationMs >= 0);
  });

  test('full HTTP pipeline with the REAL service persists OCR + audit', async (t) => {
    if (!serviceUp || !dbReady) {
      t.skip('PaddleOCR service or database not reachable');
      return;
    }

    const form = new FormData();
    const bytes = await fs.promises.readFile(PNG_FIXTURE);
    form.append('prescription', new Blob([bytes], { type: 'image/png' }), 'synthetic_rx.png');
    form.append('uploadSource', 'image');

    const res = await fetch(baseUrl, { method: 'POST', body: form });
    assert.equal(res.status, 201, await res.clone().text());
    const json = await res.json();
    const data = json.data;
    cleanupIds.push(data.id);

    assert.equal(data.status, 'ocr_complete');
    assert.equal(data.ocrEngine, 'PaddleOCR');
    assert.match(data.rawOcrText, /PARACETAMOL/);
    assert.ok(data.ocrConfidence > 0);

    const row = await pool.query('SELECT status, ocr_engine FROM prescription_uploads WHERE id = $1', [
      data.id,
    ]);
    assert.equal(row.rows[0].status, 'ocr_complete');
    assert.equal(row.rows[0].ocr_engine, 'PaddleOCR');

    const audit = await pool.query(
      `SELECT action, details FROM prescription_upload_audit
       WHERE upload_id = $1 AND action = 'OCR_COMPLETED'`,
      [data.id]
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].details.engine, 'PaddleOCR');
  });
});
