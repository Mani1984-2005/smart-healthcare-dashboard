// backend/tests/ocrService.test.js
// OCR engine decision logic: PaddleOCR success/failure, Tesseract
// fallback enabled/disabled, PDF extraction. Uses a fake local
// PaddleOCR endpoint and a stubbed Tesseract runner (no downloads).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures'
);
const PNG_FIXTURE = path.join(FIXTURES, 'synthetic_prescription.png');
const PDF_FIXTURE = path.join(FIXTURES, 'sample_text_prescription.pdf');
const FAKE_TOKEN = 'ocr-service-test-token';

let fake;
let ocr;
let env;

let mode = 'success';
const calls = { tesseract: [] };

before(async () => {
  process.env.OCR_ENGINE = 'paddleocr';
  process.env.OCR_FALLBACK_TO_TESSERACT = 'false';
  process.env.PADDLEOCR_API_TOKEN = FAKE_TOKEN;

  fake = http.createServer((req, res) => {
    req.resume();
    if (mode === 'fail') {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ detail: 'OCR processing failed.' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        text: 'PARACETAMOL 500MG',
        confidence: 88.25,
        duration_ms: 10,
        line_count: 1,
      })
    );
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  process.env.PADDLEOCR_URL = `http://127.0.0.1:${fake.address().port}`;

  ocr = await import('../src/services/ocr.service.js');
  env = (await import('../src/config/env.js')).env;

  ocr.__setTesseractRunnerForTests(async (imagePath) => {
    calls.tesseract.push(imagePath);
    return {
      text: 'STUB TESSERACT OUTPUT',
      confidence: 77,
      durationMs: 3,
      engine: 'tesseract.js',
    };
  });
});

after(async () => {
  if (fake) await new Promise((r) => fake.close(r));
});

describe('PaddleOCR engine', () => {
  test('returns text, confidence, duration and engine label on success', async () => {
    mode = 'success';
    const result = await ocr.runImageOcr(PNG_FIXTURE);
    assert.equal(result.text, 'PARACETAMOL 500MG');
    assert.equal(result.confidence, 88.25);
    assert.equal(result.engine, 'PaddleOCR');
    assert.ok(typeof result.durationMs === 'number' && result.durationMs >= 0);
  });

  test('failure with fallback disabled throws and never invokes Tesseract', async () => {
    mode = 'fail';
    env.ocrFallbackToTesseract = false;
    const before = calls.tesseract.length;

    await assert.rejects(
      () => ocr.runImageOcr(PNG_FIXTURE),
      (err) => {
        assert.match(err.message, /PaddleOCR request failed with HTTP 500/);
        assert.ok(
          !err.message.includes(FAKE_TOKEN),
          'error messages must not leak the API token'
        );
        return true;
      }
    );

    assert.equal(calls.tesseract.length, before, 'Tesseract must not run');
    env.ocrFallbackToTesseract = false;
  });

  test('failure with fallback enabled delegates to the Tesseract runner', async () => {
    mode = 'fail';
    env.ocrFallbackToTesseract = true;
    const before = calls.tesseract.length;

    try {
      const result = await ocr.runImageOcr(PNG_FIXTURE);
      assert.equal(result.engine, 'tesseract.js');
      assert.equal(result.text, 'STUB TESSERACT OUTPUT');
      assert.equal(calls.tesseract.length, before + 1);
      assert.equal(calls.tesseract.at(-1), PNG_FIXTURE);
    } finally {
      env.ocrFallbackToTesseract = false;
      mode = 'success';
    }
  });

  test('OCR_ENGINE=tesseract goes straight to the Tesseract runner', async () => {
    const original = env.ocrEngine;
    env.ocrEngine = 'tesseract';
    const before = calls.tesseract.length;
    try {
      const result = await ocr.runImageOcr(PNG_FIXTURE);
      assert.equal(result.engine, 'tesseract.js');
      assert.equal(calls.tesseract.length, before + 1);
    } finally {
      env.ocrEngine = original;
    }
  });

  test('unsupported OCR engine is rejected', async () => {
    const original = env.ocrEngine;
    env.ocrEngine = 'cloud-ocr';
    try {
      await assert.rejects(
        () => ocr.runImageOcr(PNG_FIXTURE),
        /Unsupported OCR engine: cloud-ocr/
      );
    } finally {
      env.ocrEngine = original;
    }
  });
});

describe('PDF extraction (pdf-parse)', () => {
  test('extracts the embedded text layer with engine label pdf-parse', async () => {
    const result = await ocr.runPdfExtraction(PDF_FIXTURE);
    assert.equal(result.engine, 'pdf-parse');
    assert.match(result.text, /PARACETAMOL 500MG TAB/);
    assert.equal(result.confidence, 95);
    assert.ok(result.durationMs >= 0);
  });

  test('non-PDF input rejects instead of returning fake text', async () => {
    await assert.rejects(() => ocr.runPdfExtraction(PNG_FIXTURE));
  });
});
