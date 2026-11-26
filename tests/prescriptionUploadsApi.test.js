// tests/prescriptionUploadsApi.test.js
// Frontend API-module tests for the PaddleOCR prescription-upload workflow:
// client-side validation rules, upload source derivation, multipart request
// shape (browser-managed Content-Type, no fabricated auth headers) and the
// endpoint surface. Uses a stubbed fetch — no network, no backend needed.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  OCR_UPLOAD_SOURCES,
  OCR_MAX_FILE_SIZE_MB,
  ALLOWED_FILE_TYPES,
  validateUploadFile,
  deriveUploadSource,
  uploadPrescriptionOcr,
  fetchPrescriptionUploads,
  fetchPrescriptionUpload,
  fetchPrescriptionUploadAudit,
  deletePrescriptionUpload,
  submitPrescriptionUploadReview,
  prescriptionDocumentUrl,
} from '../src/api/prescriptionUploads.js';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'backend',
  'tests',
  'fixtures'
);

function fakeFile({ name = 'rx.png', type = 'image/png', size = 1024 } = {}) {
  return { name, type, size };
}

describe('Client-side upload validation', () => {
  test('rejects a missing file', () => {
    assert.equal(validateUploadFile(null).ok, false);
    assert.equal(validateUploadFile(undefined).ok, false);
  });

  test('rejects unsupported MIME types', () => {
    for (const type of ['text/plain', 'application/x-msdownload', 'image/gif', '']) {
      const res = validateUploadFile(fakeFile({ type }), { uploadSource: 'image' });
      assert.equal(res.ok, false, `${type} must be rejected`);
      assert.match(res.error, /Unsupported file type/);
    }
  });

  test('accepts every advertised supported type', () => {
    for (const type of Object.keys(ALLOWED_FILE_TYPES)) {
      const res = validateUploadFile(fakeFile({ type }), {
        uploadSource: type === 'application/pdf' ? 'pdf' : 'image',
      });
      assert.equal(res.ok, true, `${type} must be accepted`);
    }
  });

  test('rejects empty files and oversized files', () => {
    assert.match(validateUploadFile(fakeFile({ size: 0 })).error, /empty/);

    const oversized = fakeFile({ size: (OCR_MAX_FILE_SIZE_MB + 1) * 1024 * 1024 });
    const res = validateUploadFile(oversized, { uploadSource: 'image' });
    assert.equal(res.ok, false);
    assert.match(res.error, /too large/);
    assert.match(res.error, new RegExp(`${OCR_MAX_FILE_SIZE_MB} MB`));
  });

  test('enforces source/file coherence both ways', () => {
    assert.equal(
      validateUploadFile(fakeFile({ type: 'image/png' }), { uploadSource: 'pdf' }).ok,
      false
    );
    assert.equal(
      validateUploadFile(fakeFile({ type: 'application/pdf' }), { uploadSource: 'image' }).ok,
      false
    );
  });

  test('only the documented upload sources are exposed', () => {
    assert.deepEqual(OCR_UPLOAD_SOURCES, ['image', 'pdf', 'camera']);
  });

  test('deriveUploadSource maps PDFs to "pdf" and images to "image"', () => {
    assert.equal(deriveUploadSource(fakeFile({ type: 'application/pdf' })), 'pdf');
    assert.equal(deriveUploadSource(fakeFile({ type: 'image/png' })), 'image');
    assert.equal(deriveUploadSource(null), 'image');
  });
});

describe('Upload request shape', () => {
  let calls;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: { id: 'uuid-1', status: 'ocr_complete' },
        }),
      };
    };
  });

  test('posts multipart FormData to /api/prescription-uploads with field "prescription"', async () => {
    const file = fakeFile();
    const result = await uploadPrescriptionOcr(file, { uploadSource: 'image' });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/prescription-uploads');
    assert.equal(calls[0].options.method, 'POST');

    // The browser (fetch) must own the Content-Type boundary — it must
    // NEVER be set manually for FormData.
    const headers = calls[0].options.headers || {};
    assert.equal(headers['Content-Type'], undefined, 'Content-Type must not be set manually');

    const body = calls[0].options.body;
    assert.ok(body instanceof FormData, 'body must be FormData');
    assert.ok(body.has('prescription'), 'field name must be "prescription"');
    assert.equal(body.get('uploadSource'), 'image');

    // No fabricated authentication headers.
    for (const key of Object.keys(headers)) {
      assert.ok(
        !/authorization|bearer|token|api-key/i.test(key),
        `unexpected auth header: ${key}`
      );
    }

    assert.equal(result.id, 'uuid-1');
    assert.equal(result.status, 'ocr_complete');
  });

  test('derives the upload source when none is supplied', async () => {
    await uploadPrescriptionOcr(fakeFile({ type: 'application/pdf' }));
    assert.equal(calls[0].options.body.get('uploadSource'), 'pdf');
  });

  test('propagates backend error messages (e.g. 415/413/400)', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 415,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'File content is not a supported image.' },
      }),
    });

    await assert.rejects(
      () => uploadPrescriptionOcr(fakeFile()),
      (err) => {
        assert.equal(err.status, 415);
        assert.match(err.message, /not a supported image/);
        return true;
      }
    );
  });
});

describe('Read / audit / delete / review endpoints', () => {
  let calls;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    calls = [];
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: options.method === 'DELETE' ? 200 : 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: { id: 'uuid-1', items: [] },
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      };
    };
  });

  test('list request maps options to allow-listed query params', async () => {
    await fetchPrescriptionUploads({
      page: 2,
      limit: 5,
      status: 'ocr_complete',
      uploadSource: 'pdf',
      q: 'clinic',
      includeDeleted: true,
    });

    assert.equal(calls[0].url, '/api/prescription-uploads?page=2&limit=5&status=ocr_complete&uploadSource=pdf&q=clinic&includeDeleted=true');
    assert.equal(calls[0].options.method || 'GET', 'GET');
  });

  test('detail, audit, delete and review hit the documented routes', async () => {
    await fetchPrescriptionUpload('uuid-1');
    assert.equal(calls.at(-1).url, '/api/prescription-uploads/uuid-1');

    await fetchPrescriptionUploadAudit('uuid-1');
    assert.equal(calls.at(-1).url, '/api/prescription-uploads/uuid-1/audit');

    await deletePrescriptionUpload('uuid-1');
    assert.equal(calls.at(-1).url, '/api/prescription-uploads/uuid-1');
    assert.equal(calls.at(-1).options.method, 'DELETE');

    await submitPrescriptionUploadReview('uuid-1', {
      reviewedText: 'PARACETAMOL 500MG',
      note: 'verified manually',
    });
    assert.equal(calls.at(-1).url, '/api/prescription-uploads/uuid-1/review');
    assert.equal(calls.at(-1).options.method, 'POST');
    const sent = JSON.parse(calls.at(-1).options.body);
    assert.equal(sent.reviewedText, 'PARACETAMOL 500MG');
    assert.equal(sent.note, 'verified manually');
  });

  test('document URL is an API route, never a public /uploads path', () => {
    const url = prescriptionDocumentUrl('uuid-1');
    assert.equal(url, '/api/prescription-uploads/uuid-1/document');
    assert.ok(!url.startsWith('/uploads/'));
  });
});

describe('Module source hygiene', () => {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const apiSource = fs.readFileSync(
    path.join(root, '..', 'src', 'api', 'prescriptionUploads.js'),
    'utf8'
  );

  test('never sets Content-Type manually or fabricates auth headers', () => {
    assert.ok(
      !/(["'`]Content-Type["'`]\s*:)|headers\s*\.\s*Content-Type\s*=/.test(apiSource),
      'no manual Content-Type assignment'
    );
    assert.ok(
      !/(["'`]Authorization["'`]\s*:)|Bearer\s+[A-Za-z0-9]/.test(apiSource),
      'no fabricated auth headers'
    );
    assert.ok(
      !/localStorage/i.test(apiSource),
      'no localStorage-based identity spoofing'
    );
  });

  test('does not claim upload progress reporting', () => {
    assert.ok(
      !/onUploadProgress|upload progress:/i.test(apiSource),
      'fetch transport cannot report upload progress — must not be claimed'
    );
  });

  test('does not create prescriptions or patient records', () => {
    assert.ok(
      !/apiClient\.(post|patch|put)\(\s*[`'"]\/(prescriptions|patients)/i.test(apiSource),
      'OCR workflow must not create clinical records'
    );
  });
});
