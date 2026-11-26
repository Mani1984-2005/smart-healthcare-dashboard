// backend/tests/prescriptionUploads.http.test.js
// HTTP-level integration tests for /api/prescription-uploads against the
// REAL PostgreSQL schema, using a local FAKE PaddleOCR server so results
// are deterministic (the live service is covered separately by
// prescriptionUploads.live.test.js).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures'
);

const FAKE_TOKEN = 'fake-paddle-token-for-http-tests';
const FAKE_OCR_TEXT = 'SYNTHETIC OCR OUTPUT\nPARACETAMOL 500MG';

let paddleMode = 'success';
let paddleHits = 0;
let lastPaddleApiKey = null;

let fakePaddle;
let server;
let baseUrl;
let router;
let errorHandler;
let pool;
let privateRoot;
let publicRoot;

let dbReady = false;
let ready = false;

const state = { pngId: null, jpgId: null, pdfId: null, deletedId: null, failedId: null };
const createdIds = [];

before(async () => {
  // Environment must be arranged BEFORE importing app modules.
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.OCR_ENGINE = 'paddleocr';
  process.env.OCR_FALLBACK_TO_TESSERACT = 'false';
  process.env.PADDLEOCR_API_TOKEN = FAKE_TOKEN;

  // Fake PaddleOCR endpoint.
  fakePaddle = http.createServer((req, res) => {
    paddleHits += 1;
    lastPaddleApiKey = req.headers['x-api-key'] || null;
    req.resume(); // discard multipart body
    if (paddleMode === 'fail') {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ detail: 'OCR processing failed.' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        engine: 'PaddleOCR',
        text: FAKE_OCR_TEXT,
        confidence: 91.5,
        duration_ms: 42,
        line_count: 2,
      })
    );
  });
  await new Promise((resolve) => fakePaddle.listen(0, '127.0.0.1', resolve));
  process.env.PADDLEOCR_URL = `http://127.0.0.1:${fakePaddle.address().port}`;

  const routerMod = await import('../src/routes/prescriptionUploads.routes.js');
  router = routerMod.default;
  errorHandler = (await import('../src/middleware/errorHandler.js')).errorHandler;
  pool = (await import('../src/config/db.js')).default;
  privateRoot = (await import('../src/services/privateStorage.service.js')).getPrivateStorageRoot();
  publicRoot = (await import('../src/middleware/upload.js')).UPLOAD_ROOT_DIR;

  const app = express();
  app.use('/api/prescription-uploads', router);
  app.use(errorHandler);

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/prescription-uploads`;

  try {
    await pool.query('SELECT 1');
    await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'prescription_uploads'`
    );
    dbReady = true;
  } catch {
    dbReady = false;
  }

  ready = true;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (fakePaddle) await new Promise((r) => fakePaddle.close(r));

  // Remove rows + files created by this run so synthetic fixtures never
  // accumulate in the developer database. (Existing user data is untouched:
  // only ids recorded during this run are removed.)
  if (dbReady && pool && createdIds.length) {
    try {
      const files = await pool.query(
        'SELECT file_path FROM prescription_uploads WHERE id = ANY($1::uuid[])',
        [createdIds]
      );
      await pool.query(
        'DELETE FROM prescription_upload_audit WHERE upload_id = ANY($1::uuid[])',
        [createdIds]
      );
      await pool.query('DELETE FROM prescription_uploads WHERE id = ANY($1::uuid[])', [createdIds]);
      for (const row of files.rows) {
        try {
          await fs.promises.unlink(row.file_path);
        } catch {
          /* already gone */
        }
      }
    } catch {
      /* cleanup is best-effort */
    }
  }

  if (pool) await pool.end().catch(() => {});
});

function skipUnlessDb(t) {
  if (!ready || !dbReady) {
    t.skip('Database not reachable — HTTP integration tests skipped');
    return true;
  }
  return false;
}

async function postUpload(filePath, { fieldName = 'prescription', fileName, mimeType, source, rawBody } = {}) {
  const form = new FormData();
  const bytes = rawBody ?? (await fs.promises.readFile(filePath));
  form.append(
    fieldName,
    new Blob([bytes], { type: mimeType ?? 'application/octet-stream' }),
    fileName ?? path.basename(filePath)
  );
  if (source !== undefined) form.append('uploadSource', source);

  const res = await fetch(baseUrl, { method: 'POST', body: form });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

function countPrivateFiles() {
  try {
    return fs.readdirSync(privateRoot).length;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------
// Validation failures
// ---------------------------------------------------------------------

describe('Upload validation', () => {
  test('missing file returns 400', async () => {
    const form = new FormData();
    form.append('uploadSource', 'image');
    const res = await fetch(baseUrl, { method: 'POST', body: form });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'BAD_REQUEST');
    assert.match(json.error.message, /prescription/i);
  });

  test('unsupported declared MIME type returns 415', async (t) => {
    const tmp = path.join(os.tmpdir(), `bad-${Date.now()}.txt`);
    fs.writeFileSync(tmp, 'hello world');
    try {
      const { status, body } = await postUpload(tmp, {
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        source: 'image',
      });
      assert.equal(status, 415);
      assert.equal(body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('invalid actual file contents (text disguised as PNG) returns 415 and cleans up', async () => {
    const before = countPrivateFiles();
    const { status, body } = await postUpload(null, {
      fileName: 'fake.png',
      mimeType: 'image/png',
      source: 'image',
      rawBody: Buffer.from('definitely not a png, just text pretending'),
    });
    assert.equal(status, 415);
    assert.equal(body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
    assert.match(body.error.message, /not a supported/i);
    assert.equal(
      countPrivateFiles(),
      before,
      'rejected upload must not leave files behind'
    );
  });

  test('oversized upload returns 413', async () => {
    const maxSize = Number(process.env.MAX_FILE_SIZE_MB || 15);
    const tmp = path.join(os.tmpdir(), `big-${Date.now()}.png`);
    const buffer = Buffer.alloc((maxSize + 1) * 1024 * 1024, 0x41);
    // Valid PNG magic so it would pass content checks if it got that far.
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
    fs.writeFileSync(tmp, buffer);
    try {
      const { status, body } = await postUpload(tmp, {
        fileName: 'huge.png',
        mimeType: 'image/png',
        source: 'image',
      });
      assert.equal(status, 413);
      assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('invalid uploadSource returns 400', async () => {
    const { status, body } = await postUpload(
      path.join(FIXTURES, 'synthetic_prescription.png'),
      { mimeType: 'image/png', source: 'video' }
    );
    assert.equal(status, 400);
    assert.match(body.error.message, /uploadSource/);
  });

  test('PDF content with uploadSource "image" returns 400', async () => {
    const { status, body } = await postUpload(
      path.join(FIXTURES, 'sample_text_prescription.pdf'),
      { mimeType: 'application/pdf', source: 'image' }
    );
    assert.equal(status, 400);
    assert.match(body.error.message, /PDF/);
  });

  test('image content with uploadSource "pdf" returns 400', async () => {
    const { status, body } = await postUpload(
      path.join(FIXTURES, 'synthetic_prescription.png'),
      { mimeType: 'image/png', source: 'pdf' }
    );
    assert.equal(status, 400);
    assert.match(body.error.message, /not a PDF/);
  });
});

// ---------------------------------------------------------------------
// Successful image pipeline (fake PaddleOCR)
// ---------------------------------------------------------------------

describe('Image upload pipeline', () => {
  test('valid PNG upload succeeds end-to-end with OCR, DB record and audit', async (t) => {
    if (skipUnlessDb(t)) return;

    paddleMode = 'success';
    const hitsBefore = paddleHits;

    const { status, body } = await postUpload(
      path.join(FIXTURES, 'synthetic_prescription.png'),
      { mimeType: 'image/png', source: 'image' }
    );

    assert.equal(status, 201, JSON.stringify(body));
    assert.equal(body.success, true);
    const data = body.data;
    state.pngId = data.id;
    createdIds.push(data.id);

    // Response shape
    assert.equal(data.status, 'ocr_complete');
    assert.equal(data.rawOcrText, FAKE_OCR_TEXT);
    assert.equal(data.ocrConfidence, 91.5);
    assert.equal(data.ocrEngine, 'PaddleOCR');
    assert.ok(data.ocrDurationMs > 0);
    assert.equal(data.uploadSource, 'image');
    assert.equal(data.mimeType, 'image/png');
    assert.equal(data.patientId, null, 'patient_id must never be guessed');
    assert.match(data.checksumSha256, /^[0-9a-f]{64}$/);
    assert.equal(data.errorMessage, null);
    assert.equal(data.deletedAt, null);
    assert.ok(!('filePath' in data));
    assert.ok(!('storedFilename' in data));
    assert.equal(data.documentUrl, `/api/prescription-uploads/${data.id}/document`);

    // Fake OCR service was called exactly once with the configured token
    // (asserted in code, the token value is never printed).
    assert.equal(paddleHits, hitsBefore + 1);
    assert.equal(lastPaddleApiKey, FAKE_TOKEN);

    // Database record
    const db = await pool.query('SELECT * FROM prescription_uploads WHERE id = $1', [data.id]);
    assert.equal(db.rows.length, 1);
    const row = db.rows[0];
    assert.equal(row.status, 'ocr_complete');
    assert.equal(row.patient_id, null);
    assert.equal(row.doctor_id, null);
    assert.equal(row.preprocessed_path, null, 'derived temp file must be cleaned');

    // Original file preserved in PRIVATE storage (never under /uploads)
    assert.ok(
      row.file_path.startsWith(privateRoot),
      'file must live in the private root'
    );
    assert.ok(!row.file_path.startsWith(publicRoot), 'file must not be under public /uploads');
    assert.ok(fs.existsSync(row.file_path), 'original file must be preserved');

    // Temporary preprocessing file removed
    const preprocessedPath = row.file_path.replace(/(\.[^.]+)$/, '-preprocessed$1.png');
    assert.ok(!fs.existsSync(preprocessedPath), 'preprocessed temp file must be deleted');

    // Audit trail
    const audit = await pool.query(
      'SELECT action, details, actor_label FROM prescription_upload_audit WHERE upload_id = $1 ORDER BY created_at',
      [data.id]
    );
    const actions = audit.rows.map((r) => r.action);
    assert.ok(actions.includes('UPLOAD_RECEIVED'));
    assert.ok(actions.includes('OCR_STARTED'));
    assert.ok(actions.includes('OCR_COMPLETED'));
    for (const r of audit.rows) {
      assert.equal(
        r.actor_label,
        'development-mode (unverified)',
        'development access must be explicitly labelled in the audit trail'
      );
    }
    const completed = audit.rows.find((r) => r.action === 'OCR_COMPLETED');
    assert.equal(completed.details.engine, 'PaddleOCR');
    assert.equal(completed.details.confidence, 91.5);
  });

  test('valid JPEG upload also succeeds', async (t) => {
    if (skipUnlessDb(t)) return;

    paddleMode = 'success';
    const { status, body } = await postUpload(
      path.join(FIXTURES, 'synthetic_prescription.jpg'),
      { mimeType: 'image/jpeg', source: 'image' }
    );
    assert.equal(status, 201, JSON.stringify(body));
    assert.equal(body.data.status, 'ocr_complete');
    assert.equal(body.data.mimeType, 'image/jpeg');
    state.jpgId = body.data.id;
    createdIds.push(body.data.id);
  });

  test('PaddleOCR failure records status ocr_failed without destroying the upload', async (t) => {
    if (skipUnlessDb(t)) return;

    paddleMode = 'fail';
    try {
      const { status, body } = await postUpload(
        path.join(FIXTURES, 'synthetic_prescription.png'),
        { mimeType: 'image/png', source: 'image' }
      );

      assert.equal(status, 201, JSON.stringify(body));
      const data = body.data;
      state.failedId = data.id;
      createdIds.push(data.id);
      assert.equal(data.status, 'ocr_failed');
      assert.match(data.errorMessage, /PaddleOCR request failed with HTTP 500/);
      assert.ok(!data.errorMessage.includes('\n'), 'no stack traces in stored errors');
      assert.ok(!data.errorMessage.includes(FAKE_TOKEN), 'no tokens in stored errors');

      const db = await pool.query('SELECT * FROM prescription_uploads WHERE id = $1', [data.id]);
      assert.equal(db.rows[0].status, 'ocr_failed');
      assert.equal(db.rows[0].preprocessed_path, null);
      assert.ok(fs.existsSync(db.rows[0].file_path), 'original must survive OCR failure');

      const audit = await pool.query(
        'SELECT action FROM prescription_upload_audit WHERE upload_id = $1',
        [data.id]
      );
      assert.ok(audit.rows.map((r) => r.action).includes('OCR_FAILED'));
    } finally {
      paddleMode = 'success';
    }
  });
});

// ---------------------------------------------------------------------
// PDF extraction pipeline (real pdf-parse, no OCR service involved)
// ---------------------------------------------------------------------

describe('PDF upload pipeline', () => {
  test('PDF upload extracts embedded text via pdf-parse', async (t) => {
    if (skipUnlessDb(t)) return;

    const hitsBefore = paddleHits;
    const { status, body } = await postUpload(
      path.join(FIXTURES, 'sample_text_prescription.pdf'),
      { mimeType: 'application/pdf', source: 'pdf' }
    );

    assert.equal(status, 201, JSON.stringify(body));
    const data = body.data;
    state.pdfId = data.id;
    createdIds.push(data.id);

    assert.equal(data.status, 'ocr_complete');
    assert.equal(data.ocrEngine, 'pdf-parse');
    assert.match(data.rawOcrText, /PARACETAMOL 500MG TAB/);
    assert.match(data.rawOcrText, /SYNTHETIC TEST PATIENT/);
    assert.equal(data.ocrConfidence, 95);
    assert.equal(data.mimeType, 'application/pdf');
    assert.equal(data.uploadSource, 'pdf');

    // PDF text extraction must never call the image OCR service.
    assert.equal(paddleHits, hitsBefore, 'no PaddleOCR call for PDFs');
  });
});

// ---------------------------------------------------------------------
// List / detail / audit / soft delete / document streaming
// ---------------------------------------------------------------------

describe('Read, audit and soft delete', () => {
  test('list returns paginated data with allow-listed filters', async (t) => {
    if (skipUnlessDb(t)) return;

    const res = await fetch(`${baseUrl}?page=1&limit=5`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.pagination.page === 1 && json.pagination.limit === 5);
    assert.ok(json.pagination.total >= 3);
    assert.ok(!json.data.some((d) => d.deletedAt));

    const filtered = await fetch(`${baseUrl}?status=ocr_failed`);
    const filteredJson = await filtered.json();
    assert.ok(filteredJson.data.every((d) => d.status === 'ocr_failed'));

    const bad = await fetch(`${baseUrl}?status=not-a-status`);
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error.message, /Invalid status filter/);

    const page2 = await fetch(`${baseUrl}?page=2&limit=1`);
    const page2Json = await page2.json();
    assert.equal(page2Json.pagination.page, 2);
    assert.ok(page2Json.pagination.totalPages >= 3);
  });

  test('detail returns metadata and extracted text', async (t) => {
    if (skipUnlessDb(t)) return;

    const res = await fetch(`${baseUrl}/${state.pngId}`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.id, state.pngId);
    assert.equal(json.data.rawOcrText, FAKE_OCR_TEXT);
    assert.ok(!JSON.stringify(json).includes('private-prescription-uploads'));
  });

  test('invalid UUID returns 400 and missing record returns 404', async (t) => {
    if (skipUnlessDb(t)) return;

    const invalid = await fetch(`${baseUrl}/not-a-uuid`);
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error.message, /UUID/);

    const missing = await fetch(`${baseUrl}/00000000-0000-4000-8000-000000000000`);
    assert.equal(missing.status, 404);

    const auditMissing = await fetch(`${baseUrl}/00000000-0000-4000-8000-000000000000/audit`);
    assert.equal(auditMissing.status, 404);
  });

  test('audit history endpoint returns the OCR audit trail', async (t) => {
    if (skipUnlessDb(t)) return;

    const res = await fetch(`${baseUrl}/${state.pngId}/audit`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length >= 3);
    assert.ok(json.data.every((e) => typeof e.action === 'string' && e.createdAt));
  });

  test('soft delete hides the record, keeps the file and writes audit', async (t) => {
    if (skipUnlessDb(t)) return;

    // Use the JPEG record for deletion.
    const id = state.jpgId;
    const beforeRow = await pool.query('SELECT * FROM prescription_uploads WHERE id = $1', [id]);
    const filePath = beforeRow.rows[0].file_path;

    const del = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
    assert.equal(del.status, 200);
    const delJson = await del.json();
    assert.equal(delJson.data.id, id);
    assert.ok(delJson.data.deletedAt);
    state.deletedId = id;

    // Hidden by default
    assert.equal((await fetch(`${baseUrl}/${id}`)).status, 404);
    const list = await (await fetch(`${baseUrl}?limit=100`)).json();
    assert.ok(!list.data.some((d) => d.id === id));

    // Visible with includeDeleted
    const withDeleted = await (await fetch(`${baseUrl}?includeDeleted=true&limit=100`)).json();
    assert.ok(withDeleted.data.some((d) => d.id === id));

    // File retained (retention rules — no hard delete)
    assert.ok(fs.existsSync(filePath), 'soft delete must not remove the file');

    // DB row retained with deleted_at
    const row = await pool.query('SELECT deleted_at FROM prescription_uploads WHERE id = $1', [id]);
    assert.ok(row.rows[0].deleted_at);

    // Audit entry
    const audit = await pool.query(
      `SELECT action FROM prescription_upload_audit WHERE upload_id = $1 AND action = 'UPLOAD_SOFT_DELETED'`,
      [id]
    );
    assert.equal(audit.rows.length, 1);

    // Second delete → conflict
    const again = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
    assert.equal(again.status, 409);
  });

  test('document endpoint streams the original with private cache headers', async (t) => {
    if (skipUnlessDb(t)) return;

    const res = await fetch(`${baseUrl}/${state.pngId}/document`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.match(res.headers.get('cache-control'), /private/);
    assert.match(res.headers.get('cache-control'), /no-store/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('content-disposition'), /^inline;/);

    const bytes = Buffer.from(await res.arrayBuffer());
    const original = await fs.promises.readFile(path.join(FIXTURES, 'synthetic_prescription.png'));
    assert.equal(bytes.length, original.length, 'streamed bytes must match the original file');
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    // Deleted records are not served.
    const delRes = await fetch(`${baseUrl}/${state.deletedId}/document`);
    assert.equal(delRes.status, 404);
  });
});
